from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class CIRNode(BaseModel):
    """
    Generic node representing an ETL step.
    Agnostic to the source tool (SSIS, DataStage, etc).
    """
    id: str
    name: str
    type: str = Field(..., description="SOURCE|TRANSFORM|SINK|CONTAINER|CONTROL")
    original_type: str = Field(..., description="The tool-specific type (e.g., 'SSIS::DerivedColumn')")
    description: Optional[str] = None
    parent_id: Optional[str] = Field(None, description="ID of the parent container node")
    properties: Dict[str, Any] = Field(default_factory=dict)
    columns_metadata: List[Dict[str, Any]] = Field(default_factory=list, description="List of columns with metadata (e.g. lineageId)")

class CIRDataFlow(BaseModel):
    """
    Represents data moving between two nodes.
    Supports column-level lineage if available.
    """
    source_id: str
    target_id: str
    columns: Optional[List[str]] = None
    column_map: Optional[Dict[str, str]] = Field(None, description="Mapping of SourceColumn -> TargetColumn")

class CIRTransformation(BaseModel):
    """
    Represents a specific logic/formula applied within a node.
    """
    node_id: str
    column_name: Optional[str] = None
    expression_raw: str = Field(..., description="Original tool expression (e.g. SSIS Expression)")
    expression_standard: Optional[str] = Field(None, description="Standardized SQL/Jinja expression")
    lineage_id: Optional[str] = Field(None, description="The internal lineage ID of the output column")
    input_column_lineage_ids: List[str] = Field(default_factory=list, description="Lineage IDs of the input columns used")
    confidence: float = 1.0

class CIRPackage(BaseModel):
    """
    Top-level container for a processed package.
    """
    package_id: str
    name: str
    source_system: str = Field(..., description="SSIS|DATASTAGE|INFORMATICA")
    nodes: List[CIRNode]
    data_flows: List[CIRDataFlow]
    transformations: List[CIRTransformation] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)
