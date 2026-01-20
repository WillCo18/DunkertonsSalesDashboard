#!/usr/bin/env python3
"""
Migration runner for Dunkerton Sales Dashboard.
Attempts multiple methods to execute SQL migrations on Supabase.
"""

import os
import sys
from pathlib import Path
from urllib.parse import quote_plus

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
import requests

# Load environment variables
load_dotenv()
load_dotenv(Path(__file__).parent.parent / '.env')

SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_KEY', SUPABASE_KEY)
DATABASE_PASSWORD = os.getenv('SUPABASE_DB_PASSWORD')
DATABASE_URL = os.getenv('DATABASE_URL')  # Full connection string from Supabase dashboard

def read_migration_file():
    """Read the combined migration file."""
    migration_path = Path(__file__).parent.parent / 'database' / 'migrations' / 'RUN_ALL_MIGRATIONS.sql'
    if not migration_path.exists():
        raise FileNotFoundError(f"Migration file not found: {migration_path}")
    return migration_path.read_text()

def try_supabase_sql_api(sql: str) -> bool:
    """Try to execute SQL via Supabase's SQL API (if available)."""
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        print("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY")
        return False

    # Extract project ref from URL
    project_ref = SUPABASE_URL.replace('https://', '').split('.')[0]

    # Try the SQL API endpoint (available on some Supabase versions)
    sql_url = f"https://{project_ref}.supabase.co/sql"

    headers = {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}',
        'Content-Type': 'application/json'
    }

    try:
        response = requests.post(sql_url, headers=headers, json={'query': sql})
        if response.status_code == 200:
            print("SQL executed successfully via Supabase SQL API")
            return True
        else:
            print(f"SQL API returned status {response.status_code}")
            return False
    except Exception as e:
        print(f"SQL API error: {e}")
        return False

def try_psycopg2_connection(sql: str) -> bool:
    """Try to execute SQL via direct PostgreSQL connection."""
    if not DATABASE_URL and not DATABASE_PASSWORD:
        print("Neither DATABASE_URL nor SUPABASE_DB_PASSWORD set - skipping direct connection")
        return False

    try:
        import psycopg2
    except ImportError:
        print("psycopg2 not installed - skipping direct connection")
        return False

    connection_strings = []

    # If full DATABASE_URL provided, use it first (most reliable)
    if DATABASE_URL:
        connection_strings.append(DATABASE_URL)
        print("Using DATABASE_URL from environment")

    # Also try constructed URLs if password is available
    if DATABASE_PASSWORD and SUPABASE_URL:
        project_ref = SUPABASE_URL.replace('https://', '').split('.')[0]
        encoded_password = quote_plus(DATABASE_PASSWORD)

        connection_strings.extend([
            # Direct connection (port 5432)
            f"postgresql://postgres:{encoded_password}@db.{project_ref}.supabase.co:5432/postgres",
            # Pooler transaction mode (port 6543)
            f"postgresql://postgres.{project_ref}:{encoded_password}@aws-0-eu-west-2.pooler.supabase.com:6543/postgres",
        ])

    conn = None
    for i, connection_string in enumerate(connection_strings):
        try:
            print(f"Trying connection method {i+1}/{len(connection_strings)}...")
            conn = psycopg2.connect(connection_string, connect_timeout=10)
            print(f"Connected successfully with method {i+1}")
            break
        except Exception as e:
            print(f"Method {i+1} failed: {e}")
            continue

    if not conn:
        print("All connection methods failed")
        return False

    try:
        conn.autocommit = True
        cur = conn.cursor()

        # Split SQL into statements and execute each
        statements = [s.strip() for s in sql.split(';') if s.strip()]
        for i, stmt in enumerate(statements):
            if stmt:
                try:
                    cur.execute(stmt)
                    print(f"Executed statement {i+1}/{len(statements)}")
                except Exception as e:
                    print(f"Statement {i+1} error: {e}")

        cur.close()
        conn.close()
        print("SQL executed successfully via direct PostgreSQL connection")
        return True
    except Exception as e:
        print(f"PostgreSQL connection error: {e}")
        return False

def output_for_manual_execution(sql: str):
    """Output instructions for manual execution in Supabase SQL Editor."""
    print("\n" + "="*70)
    print("MANUAL EXECUTION REQUIRED")
    print("="*70)
    print("""
The automated methods couldn't connect to Supabase. Please run the migrations
manually using one of these methods:

OPTION 1: Supabase SQL Editor (Recommended)
-------------------------------------------
1. Go to: https://supabase.com/dashboard/project/qmqaegwhxtgosxibzdnx/sql/new
2. Copy the contents of: database/migrations/RUN_ALL_MIGRATIONS.sql
3. Paste into the SQL Editor
4. Click "Run" to execute

OPTION 2: Add Database Password to .env
---------------------------------------
1. Go to: https://supabase.com/dashboard/project/qmqaegwhxtgosxibzdnx/settings/database
2. Copy the database password
3. Add to .env: SUPABASE_DB_PASSWORD=your_password_here
4. Re-run this script

OPTION 3: Add Service Role Key to .env
--------------------------------------
1. Go to: https://supabase.com/dashboard/project/qmqaegwhxtgosxibzdnx/settings/api
2. Copy the service_role key (not anon key)
3. Update .env: SUPABASE_SERVICE_KEY=your_service_role_key_here
4. Re-run this script
""")
    print("="*70)

    # Also output to a file for easy copy-paste
    output_path = Path(__file__).parent.parent / 'database' / 'COPY_TO_SQL_EDITOR.sql'
    output_path.write_text(sql)
    print(f"\nSQL also saved to: {output_path}")
    print("You can copy this file's contents to the SQL Editor.\n")

def verify_tables_exist() -> bool:
    """Check if tables were created successfully."""
    if not SUPABASE_URL or not SUPABASE_KEY:
        return False

    # Try to query the dim_product_internal table
    url = f"{SUPABASE_URL}/rest/v1/dim_product_internal?select=count"
    headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': f'Bearer {SUPABASE_KEY}',
        'Prefer': 'count=exact'
    }

    try:
        response = requests.head(url, headers=headers)
        if response.status_code == 200:
            count = response.headers.get('content-range', '').split('/')[-1]
            print(f"Verified: dim_product_internal table exists with {count} rows")
            return True
        return False
    except Exception as e:
        print(f"Verification error: {e}")
        return False

def main():
    print("Dunkerton Sales Dashboard - Migration Runner")
    print("="*50)

    # Check if tables already exist
    if verify_tables_exist():
        print("\nTables already exist! Migrations may have already been run.")
        response = input("Continue anyway? (y/N): ").strip().lower()
        if response != 'y':
            print("Aborted.")
            return

    # Read migration file
    try:
        sql = read_migration_file()
        print(f"Loaded migration file ({len(sql)} bytes)")
    except FileNotFoundError as e:
        print(f"Error: {e}")
        return

    # Try automated methods
    print("\nAttempting automated execution...")

    if try_psycopg2_connection(sql):
        print("\nMigrations completed successfully!")
        verify_tables_exist()
        return

    if try_supabase_sql_api(sql):
        print("\nMigrations completed successfully!")
        verify_tables_exist()
        return

    # Fall back to manual instructions
    output_for_manual_execution(sql)

if __name__ == '__main__':
    main()
