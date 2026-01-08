from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any
from app.models.extraction import ExtractionResult
from app.models.cir import CIRPackage

class BaseExtractor(ABC):
    @abstractmethod
    def extract(self, file_path: str, content: str) -> ExtractionResult:
        """
        Legacy shallow analysis (V1/V2)
        """
        pass

    def extract_deep(self, file_path: str, content: str) -> Optional[CIRPackage]:
        """
        Deep analysis returning Common Intermediate Representation (V3+).
        Default implementation returns None for backward compatibility.
        """
        return None
