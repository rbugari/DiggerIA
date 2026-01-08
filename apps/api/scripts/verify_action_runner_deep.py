import os
from app.actions import ActionRunner

FILE_PATH = r"temp_uploads\Data-Warehousing-OLTP-to-DWH-NorthWind-OLTP_1767778102\DWHLaodDimShippers.dtsx"

def test_deep_runner():
    print("--- Verifying ActionRunner Deep Integration ---")
    if not os.path.exists(FILE_PATH):
        print("File missing.")
        return

    runner = ActionRunner()
    
    with open(FILE_PATH, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Test New Method
    result = runner.extract_file(FILE_PATH, content)
    
    if result.success:
        print("[SUCCESS] Deep Extraction via ActionRunner worked.")
        print(f"Model used: {result.model_used}")
        data = result.data
        print(f"Nodes: {len(data['nodes'])}")
        print(f"Edges: {len(data['edges'])}")
        print(f"Has CIR Package: {'cir_package' in data}")
        
        # Check samples
        if data['nodes']:
            print(f"Sample Node 0: {data['nodes'][0]['name']} ({data['nodes'][0]['node_type']})")
    else:
        print(f"[FAILED] {result.error_message} ({result.error_type})")

if __name__ == "__main__":
    test_deep_runner()
