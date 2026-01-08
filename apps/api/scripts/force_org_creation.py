import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

print("Creating default organization...")
try:
    res = supabase.table("organizations").insert({"name": "My Organization"}).execute()
    if res.data:
        print(f"Success! Organization created with ID: {res.data[0]['id']}")
    else:
        print("Failed to create organization (no data returned).")
except Exception as e:
    print(f"Error: {e}")
