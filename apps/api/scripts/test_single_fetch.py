import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
supabase = create_client(url, key)

solution_id = "7021ac4b-921d-402f-bc21-1c63701b8180"

print(f"Testing fetch for solution: {solution_id}")
try:
    response = supabase.from_("solutions").select("storage_path").eq("id", solution_id).single().execute()
    print(f"Response data: {response.data}")
except Exception as e:
    print(f"Caught exception: {type(e).__name__}: {str(e)}")
