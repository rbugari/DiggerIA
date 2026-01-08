import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    print("Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env")
    exit(1)

supabase = create_client(url, key)

print(f"Connecting to: {url}")

print("\n--- Solutions in DB ---")
try:
    res = supabase.table("solutions").select("*").execute()
    if res.data:
        for s in res.data:
            print(f"ID: {s['id']} | Name: {s['name']}")
    else:
        print("No solutions found.")
except Exception as e:
    print(f"Error fetching solutions: {e}")

print("\n--- Organizations in DB ---")
try:
    res = supabase.table("organizations").select("*").execute()
    if res.data:
        for o in res.data:
            print(f"ID: {o['id']} | Name: {o['name']}")
    else:
        print("No organizations found.")
except Exception as e:
    print(f"Error fetching organizations: {e}")
