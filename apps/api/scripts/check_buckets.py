import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

print(f"Checking buckets in: {url}")
try:
    res = supabase.storage.list_buckets()
    print("Buckets found:")
    for b in res:
        print(f"- {b.name} (Public: {b.public})")
except Exception as e:
    print(f"Error listing buckets: {e}")
