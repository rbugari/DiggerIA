
import sys
import os
from supabase import create_client
from dotenv import load_dotenv

# Add parent dir to path to import app
sys.path.append(os.path.join(os.getcwd(), "apps", "api"))

from app.services.report import ReportService
from app.config import settings

def test_report():
    load_dotenv("apps/api/.env")
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    
    # Get a solution id
    res = supabase.table("solutions").select("id").limit(1).execute()
    if not res.data:
        print("No solutions found")
        return
    
    sol_id = res.data[0]["id"]
    print(f"Testing report for solution {sol_id}...")
    
    report_service = ReportService(supabase)
    try:
        pdf_bytes = report_service.generate_solution_report(sol_id)
        print(f"Success! Report size: {len(pdf_bytes)} bytes")
        with open("test_output.pdf", "wb") as f:
            f.write(pdf_bytes)
        print("Report saved to test_output.pdf")
    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Error: {e}")

if __name__ == "__main__":
    test_report()
