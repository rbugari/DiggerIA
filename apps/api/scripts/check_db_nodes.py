from app.config import settings
from supabase import create_client

SOLUTION_ID = "82d0979f-7065-4034-9b94-421285917e8c"

def check_db():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    
    print(f"--- Checking Assets for Project {SOLUTION_ID} ---")
    
    # 1. Check Transforms
    transforms = supabase.table("asset")\
        .select("*")\
        .eq("project_id", SOLUTION_ID)\
        .eq("asset_type", "transform")\
        .execute()
        
    print(f"\n[TRANSFORMS] Found: {len(transforms.data)}")
    for t in transforms.data:
        print(f"  - {t['name_display']} (System: {t['system']})")
        print(f"    Tags: {t['tags']}")

    # 2. Check Tables (Sources/Sinks)
    tables = supabase.table("asset")\
        .select("*")\
        .eq("project_id", SOLUTION_ID)\
        .eq("asset_type", "table")\
        .execute()
        
    print(f"\n[TABLES] Found: {len(tables.data)}")
    for t in tables.data:
        print(f"  - {t['name_display']}")

    # 3. Check Edges
    edges = supabase.table("edge_index")\
        .select("*")\
        .eq("project_id", SOLUTION_ID)\
        .execute()
        
    print(f"\n[EDGES] Found: {len(edges.data)}")
    for e in edges.data:
        print(f"  - Edge: {e['edge_type']}")

if __name__ == "__main__":
    check_db()
