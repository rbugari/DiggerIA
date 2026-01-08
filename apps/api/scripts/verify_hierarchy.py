
import os
import json
import uuid
from app.services.extractors.ssis_deep import SSISDeepExtractor
from app.actions import ActionRunner

def test_hierarchy():
    extractor = SSISDeepExtractor()
    file_path = "DWHLoadDimShippers.dtsx"
    
    # Simple mock content if file doesn't exist, but we should have it from previous turns
    sample_path = r"C:\Users\rfbugari\AppData\Local\Temp\discover_ai_uploads\single_file_1736173268\DWHLoadDimShippers.dtsx"
    
    if not os.path.exists(sample_path):
        # Create a tiny mock SSIS XML if necessary
        content = """<DTS:Executable xmlns:DTS="www.microsoft.com/SqlServer/Dts" DTS:ObjectName="MockPackage">
            <DTS:Executables>
                <DTS:Executable DTS:ObjectName="MyDataFlow" DTS:ExecutableType="Microsoft.Pipeline">
                    <DTS:ObjectData>
                        <pipeline>
                            <components>
                                <component name="Source" componentClassID="Source" refId="Package\\MyDataFlow\\Source" />
                            </components>
                        </pipeline>
                    </DTS:ObjectData>
                </DTS:Executable>
            </DTS:Executables>
        </DTS:Executable>"""
    else:
        with open(sample_path, "r", encoding="utf-8") as f:
            content = f.read()

    runner = ActionRunner()
    result = runner.extract_file(file_path, content)
    
    if not result.success:
        print(f"Extraction failed: {result.error_message}")
        return

    nodes = result.data["nodes"]
    print(f"Total nodes: {len(nodes)}")
    
    # 1. Look for Package Node
    package_node = next((n for n in nodes if n["node_type"] == "container" and "SSIS::Package" in n["name"] or "MockPackage" in n["name"]), None)
    if not package_node:
        # Check by type instead
        package_node = next((n for n in nodes if n["node_type"] == "container"), None)

    if package_node:
        print(f"Found Package: {package_node['name']} (ID: {package_node['node_id']})")
    else:
        print("ERROR: Package node not found!")
        # Print all nodes for debugging
        for n in nodes: print(f" - {n['name']} ({n['node_type']})")
        return

    # 2. Check if other nodes have this package as parent
    children = [n for n in nodes if n.get("parent_node_id") == package_node["node_id"]]
    print(f"Total direct children of package: {len(children)}")
    
    # 3. Check for specific top-level field
    for n in nodes[:5]:
        print(f"Node '{n['name']}': parent_node_id={n.get('parent_node_id')}")

    if len(nodes) > 1 and len(children) == 0:
         print("WARNING: No children found for package node. Check hierarchy logic.")
    else:
         print("SUCCESS: Hierarchy seems correctly linked in ActionRunner output.")

if __name__ == "__main__":
    test_hierarchy()
