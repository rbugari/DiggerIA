import os
import logging
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    logger.error("Missing credentials")
    exit(1)

supabase = create_client(url, key)

def apply_migration():
    migration_file = os.path.join(os.getcwd(), "migrations", "07_v3_planning_tables.sql")
    
    if not os.path.exists(migration_file):
        # Try relative to script
        migration_file = os.path.join(os.path.dirname(__file__), "..", "..", "..", "migrations", "07_v3_planning_tables.sql")
        
    if not os.path.exists(migration_file):
        logger.error(f"Migration file not found at {migration_file}")
        return

    logger.info(f"Reading migration file: {migration_file}")
    with open(migration_file, 'r') as f:
        sql = f.read()

    # Split by statement if possible, but supabase-py 'rpc' or 'execute' might not support raw DDL easily
    # unless we have a specific function. 
    # BUT, recently supabase-py allows running sql via `rpc` if a function exists, or if we use `postgrest` directly?
    # Actually, standard supabase-py client (REST) doesn't support raw SQL execution for DDL due to security.
    # UNLESS we use the Postgres connection string directly with `psycopg2` or `sqlalchemy`.
    
    # Check if we have DB_CONNECTION_STRING or DATABASE_URL
    db_url = os.environ.get("DATABASE_URL")
    if not db_url:
        logger.warning("DATABASE_URL not found. Cannot apply DDL via Python script. Please run SQL manually.")
        print("\n[MANUAL ACTION REQUIRED]")
        print("Please run the content of 'migrations/07_v3_planning_tables.sql' in your Supabase SQL Editor.")
        return

    try:
        import psycopg2
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        logger.info("Connected to DB via psycopg2. Applying migration...")
        cur.execute(sql)
        conn.commit()
        cur.close()
        conn.close()
        logger.info("Migration applied successfully!")
    except ImportError:
        logger.warning("psycopg2 not installed. Cannot apply migration.")
        print("Please run 'pip install psycopg2-binary' or apply SQL manually.")
    except Exception as e:
        logger.error(f"Failed to apply migration: {e}")

if __name__ == "__main__":
    apply_migration()
