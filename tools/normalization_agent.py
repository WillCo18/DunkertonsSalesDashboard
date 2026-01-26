#!/usr/bin/env python3
"""
Data Normalization Sub-Agent

A CLI tool to ingest, analyze, and normalize data tables.
Can be used to propose primary keys, schema mappings, and value normalizations.

Usage:
    python tools/normalization_agent.py --source data/raw.xlsx --analyze
    python tools/normalization_agent.py --source data/raw.xlsx --target-schema target_columns.json --map-columns
"""
import argparse
import sys
import pandas as pd
import json
import logging
from typing import List, Dict, Any, Optional, Tuple

try:
    from thefuzz import process, fuzz
except ImportError:
    # Fallback if thefuzz is not installed (though it should be)
    print("Warning: 'thefuzz' not found. Fuzzy matching will be limited.", file=sys.stderr)
    process = None
    fuzz = None

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
logger = logging.getLogger(__name__)

class NormalizationAgent:
    def __init__(self):
        self.df: Optional[pd.DataFrame] = None
        self.source_path: str = ""

    def load_source(self, path: str) -> None:
        """Load data from CSV or Excel file."""
        self.source_path = path
        try:
            if path.endswith('.csv'):
                self.df = pd.read_csv(path)
            elif path.endswith(('.xls', '.xlsx')):
                self.df = pd.read_excel(path)
            else:
                raise ValueError("Unsupported file format. Use CSV or Excel.")
            
            logger.info(f"Loaded {len(self.df)} rows from {path}")
            
            # Standardize column names (strip whitespace)
            self.df.columns = self.df.columns.str.strip()
            
        except Exception as e:
            logger.error(f"Failed to load file: {e}")
            raise

    def analyze_schema(self) -> Dict[str, Any]:
        """Analyze columns for uniqueness, nulls, and types."""
        if self.df is None:
            raise RuntimeError("No data loaded.")

        stats = {}
        total_rows = len(self.df)

        for col in self.df.columns:
            unique_count = self.df[col].nunique()
            null_count = self.df[col].isnull().sum()
            dtype = str(self.df[col].dtype)
            
            stats[col] = {
                "type": dtype,
                "unique_values": unique_count,
                "unique_ratio": unique_count / total_rows if total_rows > 0 else 0,
                "null_count": int(null_count),
                "null_ratio": null_count / total_rows if total_rows > 0 else 0,
                "sample_values": self.df[col].dropna().head(3).tolist()
            }
        
        return stats

    def propose_primary_key(self) -> List[str]:
        """Identify single columns that could serve as a primary key."""
        if self.df is None:
            return []
        
        candidates = []
        total_rows = len(self.df)
        
        for col in self.df.columns:
            # Must be no nulls and 100% unique
            if self.df[col].isnull().sum() == 0 and self.df[col].nunique() == total_rows:
                candidates.append(col)
                
        return candidates

    def map_columns(self, target_schema: List[str]) -> Dict[str, str]:
        """
        Suggest mappings from source columns to target columns based on name similarity.
        Returns dict: {source_col: target_col}
        """
        if self.df is None:
            return {}

        mapping = {}
        source_cols = self.df.columns.tolist()
        
        # Simple heuristic: exact match (case-insensitive) first, then fuzzy
        for target in target_schema:
            best_match = None
            highest_score = 0
            
            # 1. Exact match (insensitive)
            for source in source_cols:
                if source.lower() == target.lower():
                    best_match = source
                    highest_score = 100
                    break
            
            # 2. Fuzzy match if no exact match and library available
            if not best_match and process:
                match, score = process.extractOne(target, source_cols, scorer=fuzz.token_sort_ratio)
                if score > 80:  # Threshold
                    best_match = match
                    highest_score = score
            
            if best_match:
                mapping[best_match] = target
        
        return mapping

    def map_values(self, source_col: str, target_values: List[str], threshold: int = 80) -> pd.DataFrame:
        """
        Map values in a specific source column to a list of allowed target values using fuzzy matching.
        Returns a DataFrame with ['original', 'mapped', 'score', 'confidence'].
        """
        if self.df is None or source_col not in self.df.columns:
            raise ValueError(f"Column {source_col} not found in source data.")
        
        if not process:
            logger.warning("Fuzzy matching not available.")
            return pd.DataFrame()

        unique_source_values = self.df[source_col].dropna().unique().tolist()
        results = []

        for value in unique_source_values:
            # Ensure value is string
            val_str = str(value)
            
            # Extract best match
            match, score = process.extractOne(val_str, target_values, scorer=fuzz.token_sort_ratio)
            
            confidence = "Low"
            if score >= 95: confidence = "High"
            elif score >= threshold: confidence = "Medium"
            else: confidence = "None"
            
            result_row = {
                "original": val_str,
                "mapped": match if score >= threshold else None,
                "score": score,
                "confidence": confidence
            }
            results.append(result_row)
            
        return pd.DataFrame(results)

def main():
    parser = argparse.ArgumentParser(description="Data Normalization Agent")
    parser.add_argument("--source", required=True, help="Path to source CSV/Excel file")
    parser.add_argument("--analyze", action="store_true", help="Perform schema analysis")
    parser.add_argument("--target-schema", help="JSON file containing list of target column names")
    parser.add_argument("--map-columns", action="store_true", help="Propose column mappings (requires --target-schema)")
    parser.add_argument("--map-values", nargs=2, metavar=('SOURCE_COL', 'TARGET_FILE'), 
                        help="Map values of source column to values in line-separated target file")
    
    args = parser.parse_args()
    
    agent = NormalizationAgent()
    
    try:
        agent.load_source(args.source)
        
        output = {}
        
        if args.analyze:
            print("--- Schema Analysis ---")
            stats = agent.analyze_schema()
            pks = agent.propose_primary_key()
            
            output["stats"] = stats
            output["proposed_pks"] = pks
            
            # Nice CLI output
            print(f"Loaded Rows: {len(agent.df)}")
            print(f"Columns: {len(agent.df.columns)}")
            print(f"Proposed Primary Keys: {pks}")
            print("\nColumn Detail:")
            for col, details in stats.items():
                print(f"  - {col}: {details['type']}, {details['unique_ratio']:.1%} unique, {details['null_count']} nulls")
        
        if args.map_columns and args.target_schema:
            print("\n--- Column Mapping Proposal ---")
            with open(args.target_schema, 'r') as f:
                target_cols = json.load(f)
            
            mapping = agent.map_columns(target_cols)
            output["column_mapping"] = mapping
            
            for source, target in mapping.items():
                print(f"  {source} -> {target}")
                
        if args.map_values:
            source_col, target_file = args.map_values
            print(f"\n--- Value Mapping: {source_col} ---")
            
            # Load target values (assuming meaningful lines in a text file for now, or JSON list)
            try:
                with open(target_file, 'r') as f:
                    if target_file.endswith('.json'):
                        target_values = json.load(f)
                    else:
                        target_values = [line.strip() for line in f if line.strip()]
            except Exception as e:
                logger.error(f"Could not load target values: {e}")
                return

            mapping_df = agent.map_values(source_col, target_values)
            
            # Show top confident matches
            print(mapping_df.sort_values('score', ascending=False).head(10).to_string())
            output["value_mapping_sample"] = mapping_df.head(5).to_dict(orient='records')

        # If strict JSON output is needed for chaining, we could print json.dumps(output)
        
    except Exception as e:
        logger.error(str(e))
        sys.exit(1)

if __name__ == "__main__":
    main()
