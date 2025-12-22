import re
from typing import List, Dict, Any

class SSISParser:
    """
    Parses SSIS .dtsx (XML) files to extract Control Flow structure.
    Does not rely on lxml to avoid dependency issues if not installed, 
    uses Regex/String parsing for robustness on large files.
    """
    
    @staticmethod
    def parse_structure(content: str) -> Dict[str, Any]:
        """
        Returns a simplified JSON structure of the package:
        {
            "executables": [
                {"name": "...", "type": "...", "description": "..."}
            ],
            "precedence_constraints": [
                {"from": "...", "to": "..."}
            ]
        }
        """
        # Simple regex extraction for Executables (Tasks)
        # Looking for <DTS:Executable ... DTS:ObjectName="Name" ...>
        
        executables = []
        
        # Regex to find Executable blocks (simplified)
        # We look for DTS:ObjectName="..." and DTS:Description="..." inside DTS:Executable tags
        # This is a heuristic parser.
        
        # Find all ObjectNames
        # Pattern: DTS:ObjectName="([^"]+)"
        # But we need to make sure it's an Executable.
        
        # Let's try to extract blocks roughly.
        # <DTS:Executable ...> ... </DTS:Executable>
        
        # For now, just extract names and types to give the LLM a hint.
        
        # Extract Executables
        exe_pattern = r'DTS:ExecutableType="([^"]+)"[^>]*DTS:ObjectName="([^"]+)"'
        matches = re.findall(exe_pattern, content)
        
        for m in matches:
            exe_type = m[0]
            exe_name = m[1]
            
            # Filter out common noise
            if "SSIS.Package" in exe_type: 
                continue
                
            executables.append({
                "name": exe_name,
                "type": exe_type,
                "is_container": "Sequence" in exe_type
            })
            
        return {
            "summary": f"Found {len(executables)} tasks/containers.",
            "tasks": executables[:50] # Limit to top 50 to avoid context overflow
        }
