from app.services.extractors.ssis_deep import SSISDeepExtractor
import json
import os

FILE_PATH = r"temp_uploads\Data-Warehousing-OLTP-to-DWH-NorthWind-OLTP_1767778102\DWHLaodDimShippers.dtsx"

def test_extractor():
    if not os.path.exists(FILE_PATH):
        print(f"File not found: {FILE_PATH}")
        return

    print(f"Testing Deep Extractor on: {FILE_PATH}")
    
    with open(FILE_PATH, "r", encoding="utf-8") as f:
        content = f.read()
        
    extractor = SSISDeepExtractor()
    cir_package = extractor.extract_deep(FILE_PATH, content)
    
    if cir_package:
        print("\n--- Extraction Successful ---")
        print(f"Package ID: {cir_package.package_id}")
        print(f"Nodes Found: {len(cir_package.nodes)}")
        print(f"Flows Found: {len(cir_package.data_flows)}")
        print(f"Transformations Found: {len(cir_package.transformations)}")
        
        print("\n--- Transformations Detected ---")
        for trans in cir_package.transformations:
            print(f"  [{trans.column_name or 'SQL'}] Raw: {trans.expression_raw}")
            
        print("\n--- Nodes ---")
        for node in cir_package.nodes:
            print(f"  {node.name} ({node.type})")
    else:
        print("Extraction Failed (returned None)")

if __name__ == "__main__":
    test_extractor()
