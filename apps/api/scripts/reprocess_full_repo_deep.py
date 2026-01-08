import os
import glob
from app.actions import ActionRunner
from app.services.catalog import CatalogService
from app.config import settings
from supabase import create_client
from app.models.extraction import ExtractionResult, ExtractedNode, ExtractedEdge
import uuid

# Target Solution
SOLUTION_ID = "82d0979f-7065-4034-9b94-421285917e8c" 
PROJECT_ID = SOLUTION_ID 
REPO_DIR = r"c:\proyectos_dev\discoverIA\apps\api\temp_uploads\Data-Warehousing-OLTP-to-DWH-NorthWind-OLTP_1767778102"

def batch_reprocess():
    print(f"--- Batch Reprocessing for Solution {SOLUTION_ID} ---")
    
    # 1. Setup Services
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    catalog = CatalogService(supabase)
    runner = ActionRunner()
    
    files = glob.glob(os.path.join(REPO_DIR, "*.dtsx"))
    print(f"Found {len(files)} .dtsx files.")
    
    total_nodes = 0
    total_edges = 0

    for file_path in files:
        print(f"\nProcessing: {os.path.basename(file_path)}...")
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            result = runner.extract_file(file_path, content)
            
            if not result.success:
                print(f"  [FAILED] {result.error_message}")
                continue
                
            data = result.data
            nodes_data = data.get('nodes', [])
            edges_data = data.get('edges', [])
            
            if not nodes_data:
                print("  [WARN] No nodes extracted.")
                continue

            # Map Dict to Pydantic Models for Catalog
            nodes_obj = [ExtractedNode(**n) for n in nodes_data]
            edges_obj = []
            
            for e in edges_data:
                edges_obj.append(ExtractedEdge(
                    edge_id=str(uuid.uuid4()),
                    edge_type=e['edge_type'],
                    from_node_id=e['from_node_id'],
                    to_node_id=e['to_node_id'],
                    confidence=1.0,
                    rationale="Deep Batch Extractor",
                    evidence_refs=[],
                    is_hypothesis=False
                ))
            
            extraction_result = ExtractionResult(
                meta={"source_file": file_path, "extractor_id": "deep_ssis_v1"},
                nodes=nodes_obj,
                edges=edges_obj,
                evidences=[], 
                assumptions=[]
            )
            
            print(f"  [SUCCESS] {len(nodes_obj)} Nodes, {len(edges_obj)} Edges. Syncing...")
            catalog.sync_extraction_result(extraction_result, project_id=PROJECT_ID)
            
            total_nodes += len(nodes_obj)
            total_edges += len(edges_obj)
            
        except Exception as e:
            print(f"  [ERROR] {e}")

    print(f"\n--- Batch Complete ---")
    print(f"Total Assets Processed: {total_nodes}")
    print(f"Total Relationships: {total_edges}")

if __name__ == "__main__":
    batch_reprocess()
