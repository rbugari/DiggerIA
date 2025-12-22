import fnmatch
from typing import List, Optional
from ..models.planning import Strategy, RecommendedAction

class PolicyEngine:
    """
    Implements rules for SKIP/IGNORE based on file metadata.
    Reference: discover_ai_v_3.md Section 2
    """
    
    DEFAULT_SKIP_EXTENSIONS = {
        "bak", "dump", "dmp", "tar", "gz", "zip", "rar", "7z", "iso", 
        "exe", "dll", "bin", "dat", "log"
    }
    
    DEFAULT_SKIP_PATHS = [
        "**/node_modules/**",
        "**/.git/**",
        ".git/**",
        "**/.git",
        "**/target/**",
        "**/dist/**",
        "**/build/**",
        "**/venv/**",
        "**/__pycache__/**",
        "**/.idea/**",
        "**/.vscode/**",
        "**/obj/**", # SSIS build output
        "**/bin/**"  # SSIS build output
    ]
    
    DEFAULT_MAX_SIZE_BYTES = 524_288_000 # 500 MB

    def __init__(self, overrides: Optional[dict] = None):
        self.overrides = overrides or {}
        self.skip_extensions = self.DEFAULT_SKIP_EXTENSIONS
        self.skip_paths = self.DEFAULT_SKIP_PATHS
        self.max_size_bytes = self.overrides.get("max_file_size_bytes", self.DEFAULT_MAX_SIZE_BYTES)

    def evaluate(self, file_path: str, size_bytes: int) -> tuple[RecommendedAction, str]:
        """
        Returns (RecommendedAction, Reason)
        """
        # 1. Size Check
        if size_bytes > self.max_size_bytes:
            return RecommendedAction.SKIP, f"File too large ({size_bytes} bytes > {self.max_size_bytes})"

        # 2. Extension Check
        ext = file_path.split('.')[-1].lower() if '.' in file_path else ""
        if ext in self.skip_extensions:
            return RecommendedAction.SKIP, f"Extension .{ext} is in blocklist"

        # 3. Path Check (Glob)
        # normalize path separator
        normalized_path = file_path.replace("\\", "/")
        for pattern in self.skip_paths:
            if fnmatch.fnmatch(normalized_path, pattern):
                return RecommendedAction.SKIP, f"Path matches ignored pattern: {pattern}"

        return RecommendedAction.PROCESS, "Passes policy checks"

    def is_binary_extension(self, file_path: str) -> bool:
        # Simple extension check for likely binaries not already skipped
        binary_exts = {"png", "jpg", "jpeg", "gif", "pdf", "ico", "woff", "woff2", "ttf", "eot"}
        ext = file_path.split('.')[-1].lower() if '.' in file_path else ""
        return ext in binary_exts
