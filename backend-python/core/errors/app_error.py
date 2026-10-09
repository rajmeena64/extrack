from typing import Any, Dict, Optional, Union

class AppError(Exception):
    def __init__(self, error: Union[Dict[str, Any], str], status_code: int = 400, code: str = "BAD_REQUEST", details: Optional[Dict[str, Any]] = None):
        if isinstance(error, dict):
            self.message = str(error["message"]) if "message" in error else "An error occurred."
            self.status_code = error["status"] if "status" in error else status_code
            self.code = error["code"] if "code" in error else code
        else:
            self.message = str(error)
            self.status_code = status_code
            self.code = code
        self.details = details if details is not None else {}
        super().__init__(self.message)
