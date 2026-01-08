import xml.etree.ElementTree as ET
import re
import uuid
import logging
from typing import Optional, Dict, Any, List

from app.models.cir import CIRPackage, CIRNode, CIRDataFlow, CIRTransformation
from app.services.extractors.base import BaseExtractor

logger = logging.getLogger(__name__)

class SSISDeepExtractor(BaseExtractor):
    """
    Deep extractor for SSIS packages (.dtsx).
    Extracts Data Flow components, transformations, and formulas.
    """
    
    def extract(self, file_path: str, content: str):
        # Implementation for legacy shallow extract (can rely on base or simple parsing)
        # For now, we focus on extract_deep
        return None

    def extract_deep(self, file_path: str, content: str) -> Optional[CIRPackage]:
        try:
            root = ET.fromstring(content)
            
            # Helper to strip namespace
            def local_tag(tag):
                return tag.split('}')[-1] if '}' in tag else tag

            package_name = "Unknown"
            package_id = str(uuid.uuid4())
            
            # 1. Package Node
            for elem in root.iter():
                 if local_tag(elem.tag) == "Executable":
                     package_name = elem.attrib.get(f"{{www.microsoft.com/SqlServer/Dts}}ObjectName") or elem.attrib.get("DTS:ObjectName") or "Package"
                     break
            
            cir_nodes = [CIRNode(
                id=package_id,
                name=package_name,
                type="CONTAINER",
                original_type="SSIS::Package"
            )]
            cir_flows = []
            cir_transforms = []
            
            # 2. Recursive Traversal for Hierarchy
            self._traverse_executables(root, package_id, cir_nodes, cir_flows, cir_transforms)

            return CIRPackage(
                package_id=package_id,
                name=package_name,
                source_system="SSIS",
                nodes=cir_nodes,
                data_flows=cir_flows,
                transformations=cir_transforms,
                metadata={"file_path": file_path}
            )

        except Exception as e:
            logger.error(f"Error in SSISDeepExtractor: {e}")
            import traceback
            traceback.print_exc()
            return None

    def _traverse_executables(self, element, parent_id, nodes, flows, transforms):
        def local_tag(tag):
            return tag.split('}')[-1] if '}' in tag else tag

        for child in element:
            tag = local_tag(child.tag)
            
            if tag == "Executable":
                exe_name = child.attrib.get(f"{{www.microsoft.com/SqlServer/Dts}}ObjectName") or child.attrib.get("DTS:ObjectName")
                exe_type = child.attrib.get(f"{{www.microsoft.com/SqlServer/Dts}}ExecutableType") or child.attrib.get("DTS:ExecutableType")
                
                # Check if it's a Data Flow (Pipeline)
                is_data_flow = "Pipeline" in (exe_type or "")
                
                node_id = str(uuid.uuid4())
                nodes.append(CIRNode(
                    id=node_id,
                    name=exe_name or "Task",
                    type="CONTAINER" if not is_data_flow else "TRANSFORM",
                    original_type=f"SSIS::{exe_type.split('.')[-1]}" if exe_type else "SSIS::Task",
                    parent_id=parent_id
                ))

                # If Data Flow, parse internal pipeline
                if is_data_flow:
                    for obj_data in child.findall(".//{*}ObjectData"):
                        for pipeline in obj_data.findall(".//{*}pipeline"):
                             self._parse_pipeline(pipeline, nodes, flows, transforms, parent_node_id=node_id)
                else:
                    # Generic Container/Task, keep walking for nested tasks (Sequence Containers etc)
                    self._traverse_executables(child, node_id, nodes, flows, transforms)
            
            # Also check for executables inside DTS:Executables collection
            elif tag == "Executables":
                self._traverse_executables(child, parent_id, nodes, flows, transforms)

    def _local_tag(self, tag):
        return tag.split('}')[-1] if '}' in tag else tag

    def _parse_pipeline(self, pipeline_elem, nodes: List[CIRNode], flows: List[CIRDataFlow], transforms: List[CIRTransformation], parent_node_id: str = None):
        
        # 1. Extract Components
        components_node = None
        for child in pipeline_elem:
            if self._local_tag(child.tag) == "components":
                components_node = child
                break
        
        comp_id_map = {} # Map refId (internal) -> guid (CIR)

        if components_node is not None:
            for component in components_node:
                if self._local_tag(component.tag) == "component":
                    # Get Attributes
                    ref_id = component.attrib.get("refId")
                    name = component.attrib.get("name") or ref_id
                    comp_class = component.attrib.get("componentClassID", "")
                    
                    node_id = str(uuid.uuid4())
                    comp_id_map[ref_id] = node_id # Map internal ID to CIR ID

                    # Determine Type
                    node_type = "TRANSFORM"
                    if "Source" in comp_class or "Source" in name: node_type = "SOURCE"
                    elif "Destination" in comp_class or "Destination" in name: node_type = "SINK"
                    
                    # Extract Properties
                    properties = {}
                    for child in component:
                        if self._local_tag(child.tag) == "properties":
                            for prop in child:
                                if self._local_tag(prop.tag) == "property":
                                    p_name = prop.attrib.get("name")
                                    p_val = prop.text
                                    if p_name and p_val:
                                        properties[p_name] = p_val
                                        
                                        # Capture Transformation Logic
                                        if p_name == "SqlCommand":
                                            transforms.append(CIRTransformation(
                                                node_id=node_id,
                                                expression_raw=p_val,
                                                expression_standard=None, # To be filled by LLM later
                                                confidence=1.0
                                            ))
                    
                    # Check for all columns (schema metadata)
                    column_list = self._extract_all_columns(component)
                    if column_list:
                        if "columns" not in properties: properties["columns"] = []
                        properties["columns"].extend(column_list)

                    # Create CIR Node
                    nodes.append(CIRNode(
                        id=node_id,
                        name=name,
                        type=node_type,
                        original_type=comp_class,
                        description=component.attrib.get("description"),
                        parent_id=parent_node_id,
                        properties=properties,
                        columns_metadata=column_list if isinstance(column_list, list) else []
                    ))
                    
                    # Check Output Columns for Derived Column expressions
                    self._extract_column_formulas(component, node_id, transforms)

        # 2. Extract Data Flows (Paths)
        paths_node = None
        for child in pipeline_elem:
            if self._local_tag(child.tag) == "paths":
                paths_node = child
                break
        
        if paths_node is not None:
            for path in paths_node:
                if self._local_tag(path.tag) == "path":
                    start_id_raw = path.attrib.get("startId")
                    end_id_raw = path.attrib.get("endId")
                    
                    # startId looks like "Package\Task\Component.Outputs[Out]"
                    # We need to match it to the component.
                    # Heuristic: verify which component refId is a substring of path ID
                    
                    source_node_id = self._find_node_id_by_ref(start_id_raw, comp_id_map)
                    target_node_id = self._find_node_id_by_ref(end_id_raw, comp_id_map)
                    
                    if source_node_id and target_node_id:
                        flows.append(CIRDataFlow(
                            source_id=source_node_id,
                            target_id=target_node_id,
                            columns=[] # Hard to extract without deeper parsing of lineage IDs
                        ))

    def _extract_column_formulas(self, component_elem, node_id, transforms):
        # Look for output columns with "Expression" properties
        for child in component_elem:
            if self._local_tag(child.tag) == "outputs":
                for output in child:
                    if self._local_tag(output.tag) == "output":
                        for out_child in output:
                            if self._local_tag(out_child.tag) == "outputColumns":
                                for col in out_child:
                                    if self._local_tag(col.tag) == "outputColumn":
                                        col_name = col.attrib.get("name")
                                        lin_id = col.attrib.get("lineageId")
                                        
                                        # Check properties of column
                                        for prop_container in col:
                                            if self._local_tag(prop_container.tag) == "properties": # Usually inner properties
                                                for prop in prop_container:
                                                    if self._local_tag(prop.tag) == "property":
                                                        if prop.attrib.get("name") == "Expression":
                                                            transforms.append(CIRTransformation(
                                                                node_id=node_id,
                                                                column_name=col_name,
                                                                lineage_id=lin_id,
                                                                expression_raw=prop.text,
                                                                confidence=1.0
                                                            ))
                                            # Also check direct children properties (sometimes formatting varies)
                                            if self._local_tag(prop_container.tag) == "property" and prop_container.attrib.get("name") == "Expression":
                                                 transforms.append(CIRTransformation(
                                                    node_id=node_id,
                                                    column_name=col_name,
                                                    lineage_id=lin_id,
                                                    expression_raw=prop_container.text,
                                                    confidence=1.0
                                                ))

    def _find_node_id_by_ref(self, path_ref: str, comp_map: Dict[str, str]) -> Optional[str]:
        # Tries to find which component refId matches the path_ref prefix
        if not path_ref: return None
        
        # Sort keys by length desc to match longest prefix first
        sorted_keys = sorted(comp_map.keys(), key=len, reverse=True)
        
        for ref_id in sorted_keys:
            if ref_id in path_ref:
                return comp_map[ref_id]
        return None

    def _extract_all_columns(self, component_elem) -> List[Dict[str, Any]]:
        """Extracts a list of column metadata for any component."""
        cols = []
        for child in component_elem.iter():
            tag = self._local_tag(child.tag)
            if tag in ["outputColumn", "inputColumn", "externalMetadataColumn"]:
                name = child.attrib.get("name")
                lin_id = child.attrib.get("lineageId")
                if name:
                    cols.append({
                        "name": name,
                        "lineage_id": lin_id,
                        "kind": tag
                    })
        return cols
