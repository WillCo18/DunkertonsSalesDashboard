
import unittest
import pandas as pd
import tempfile
import os
import json
from normalization_agent import NormalizationAgent

class TestNormalizationAgent(unittest.TestCase):
    def setUp(self):
        self.agent = NormalizationAgent()
        
        # Create a dummy CSV file
        self.test_data = {
            'inv_account': ['A001', 'A002', 'A003', 'A004'],
            'Source SKU': ['APP-01', 'APP-02', 'PEAR-01', 'PEAR-02'],
            'Description': ['Apple Cider', 'Aplpe Cider', 'Pear Cider', 'Pear'],
            'Quantity': [10, 20, 5, 10]  # Duplicate value, so not a PK
        }
        self.df = pd.DataFrame(self.test_data)
        
        self.temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.csv')
        self.df.to_csv(self.temp_file.name, index=False)
        self.temp_file.close()

    def tearDown(self):
        os.unlink(self.temp_file.name)

    def test_load_source(self):
        self.agent.load_source(self.temp_file.name)
        self.assertIsNotNone(self.agent.df)
        self.assertEqual(len(self.agent.df), 4)

    def test_analyze_schema(self):
        self.agent.load_source(self.temp_file.name)
        stats = self.agent.analyze_schema()
        
        self.assertIn('inv_account', stats)
        self.assertEqual(stats['inv_account']['unique_values'], 4)
        self.assertEqual(stats['inv_account']['null_count'], 0)

    def test_propose_pks(self):
        self.agent.load_source(self.temp_file.name)
        pks = self.agent.propose_primary_key()
        self.assertIn('inv_account', pks)
        self.assertIn('Source SKU', pks)
        self.assertNotIn('Quantity', pks)

    def test_map_columns(self):
        self.agent.load_source(self.temp_file.name)
        
        target_schema = ['source_sku', 'quantity', 'description']
        mapping = self.agent.map_columns(target_schema)
        
        # Expect 'Source SKU' -> 'source_sku' (fuzzy or exactish)
        # 'Qty' -> 'quantity' (fuzzy)
        # 'Description' -> 'description' (expert/exact)
        
        # Invert mapping to check target assignment
        inv_map = {v: k for k, v in mapping.items()}
        
        self.assertEqual(inv_map.get('source_sku'), 'Source SKU')
        self.assertEqual(inv_map.get('quantity'), 'Quantity')
        self.assertEqual(inv_map.get('description'), 'Description')

    def test_map_values(self):
        self.agent.load_source(self.temp_file.name)
        
        # Target internal values
        targets = ["Apple Cider", "Pear Cider"]
        
        mapping_df = self.agent.map_values('Description', targets)
        
        # 'Apple Cider' -> 'Apple Cider' (100)
        # 'Aplpe Cider' -> 'Apple Cider' (high score)
        
        apple_match = mapping_df[mapping_df['original'] == 'Aplpe Cider'].iloc[0]
        self.assertEqual(apple_match['mapped'], 'Apple Cider')
        self.assertGreater(apple_match['score'], 80)

if __name__ == '__main__':
    unittest.main()
