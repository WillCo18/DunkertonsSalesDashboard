
import pandas as pd
import sys

file_path = "/Users/willcoates/Documents/Antigravity/DunkertonsSales/data/raw/inn_express_2025_12.xlsx"
print(f"Reading {file_path}")

# Read without header first
df_raw = pd.read_excel(file_path, header=None)
print("\nFirst 10 rows raw:")
print(df_raw.head(10))

# Try to find header like in the script
header_row_idx = None
for idx, row in df_raw.iterrows():
    row_str = " ".join([str(v).lower() for v in row.values if pd.notna(v)])
    if any(keyword in row_str for keyword in ["customer", "account", "delivery", "product"]):
        header_row_idx = idx
        print(f"\nFound potential header at row {idx}: {row_str}")
        break

if header_row_idx is not None:
    df = pd.read_excel(file_path, header=header_row_idx)
    print("\nColumns found:")
    for col in df.columns:
        print(f"  '{col}'")
else:
    print("\nNo header row detected.")
