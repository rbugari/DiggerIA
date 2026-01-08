from supabase import Client
from ..models.extraction import ExtractionResult, ExtractedNode, ExtractedEdge, Evidence
import uuid

class CatalogService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def sync_extraction_result(self, result: ExtractionResult, project_id: str, artifact_id: str = None):
        """
        Writes nodes, edges, and evidences to the SQL Catalog.
        """
        
        # 1. Assets (Nodes)
        node_id_map = {} # Map local node_id to UUID
        
        for node in result.nodes:
            # Let's try to find existing asset
            existing = self.supabase.table("asset")\
                .select("asset_id")\
                .eq("project_id", project_id)\
                .eq("name_display", node.name)\
                .eq("asset_type", node.node_type)\
                .execute()
                
            if existing.data:
                asset_id = existing.data[0]["asset_id"]
                # Update existing asset (Upsert logic)
                self.supabase.table("asset").update({
                    "tags": node.attributes,
                    "updated_at": "now()",
                    "system": node.system
                }).eq("asset_id", asset_id).execute()
            else:
                asset_id = str(uuid.uuid4())
                asset_data = {
                    "asset_id": asset_id,
                    "project_id": project_id,
                    "asset_type": node.node_type,
                    "name_display": node.name,
                    "canonical_name": node.name, # logic to canonicalize?
                    "system": node.system,
                    "tags": node.attributes,
                    "created_at": "now()",
                    "updated_at": "now()"
                }
                self.supabase.table("asset").insert(asset_data).execute()
                
            node_id_map[node.node_id] = asset_id
            
        # 1.5. Resolve Parent IDs to UUIDs (Second Pass)
        for node in result.nodes:
            if node.parent_node_id and node.parent_node_id in node_id_map:
                parent_uuid = node_id_map[node.parent_node_id]
                asset_id = node_id_map[node.node_id]
                
                # Update the actual parent_asset_id column for true hierarchy
                self.supabase.table("asset").update({
                    "parent_asset_id": parent_uuid
                }).eq("asset_id", asset_id).execute()

        # 2. Evidences
        evidence_id_map = {}
        for ev in result.evidences:
            existing_ev = None
            if ev.hash:
                existing_ev = self.supabase.table("evidence")\
                    .select("evidence_id")\
                    .eq("project_id", project_id)\
                    .eq("hash", ev.hash)\
                    .eq("file_path", result.meta.get("source_file"))\
                    .execute()
            
            if existing_ev and existing_ev.data:
                ev_uuid = existing_ev.data[0]["evidence_id"]
            else:
                ev_uuid = str(uuid.uuid4())
                evidence_data = {
                    "evidence_id": ev_uuid,
                    "project_id": project_id,
                    "artifact_id": artifact_id,
                    "file_path": result.meta.get("source_file"),
                    "kind": ev.kind,
                    "locator": ev.locator.model_dump(),
                    "snippet": ev.snippet,
                    "hash": ev.hash
                }
                self.supabase.table("evidence").insert(evidence_data).execute()
            
            evidence_id_map[ev.evidence_id] = ev_uuid

        # 3. Edges
        for edge in result.edges:
            from_uuid = node_id_map.get(edge.from_node_id)
            to_uuid = node_id_map.get(edge.to_node_id)
            
            if not from_uuid or not to_uuid:
                continue # Skip if nodes not found
                
            # Check existing edge
            existing_edge = self.supabase.table("edge_index")\
                .select("edge_id")\
                .eq("project_id", project_id)\
                .eq("from_asset_id", from_uuid)\
                .eq("to_asset_id", to_uuid)\
                .eq("edge_type", edge.edge_type)\
                .execute()
            
            if existing_edge.data:
                edge_uuid = existing_edge.data[0]["edge_id"]
                # Update confidence/metadata
                self.supabase.table("edge_index").update({
                    "confidence": edge.confidence,
                    "is_hypothesis": edge.is_hypothesis,
                    "extractor_id": result.meta.get("extractor_id")
                }).eq("edge_id", edge_uuid).execute()
            else:
                edge_uuid = str(uuid.uuid4())
                edge_data = {
                    "edge_id": edge_uuid,
                    "project_id": project_id,
                    "from_asset_id": from_uuid,
                    "to_asset_id": to_uuid,
                    "edge_type": edge.edge_type,
                    "confidence": edge.confidence,
                    "extractor_id": result.meta.get("extractor_id"),
                    "is_hypothesis": edge.is_hypothesis
                }
                self.supabase.table("edge_index").insert(edge_data).execute()
            
            # Edge Evidence Link
            for ref in edge.evidence_refs:
                if ref in evidence_id_map:
                    ev_uuid = evidence_id_map[ref]
                    try:
                        self.supabase.table("edge_evidence").insert({
                            "edge_id": edge_uuid,
                            "evidence_id": ev_uuid
                        }).execute()
                    except:
                        pass # Ignore duplicate link error
                    
        return node_id_map
