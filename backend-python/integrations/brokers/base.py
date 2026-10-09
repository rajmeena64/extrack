from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional

class BaseBroker(ABC):
    @property
    @abstractmethod
    def slug(self) -> str:
        pass

    @abstractmethod
    async def connect(self, credentials: Dict[str, Any]) -> bool:
        pass

    @abstractmethod
    async def fetch_trades(self, credentials: Dict[str, Any], since: Optional[int] = None) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def fetch_positions(self, credentials: Dict[str, Any]) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    async def fetch_balances(self, credentials: Dict[str, Any]) -> List[Dict[str, Any]]:
        pass
