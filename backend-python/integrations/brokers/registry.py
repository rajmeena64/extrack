from typing import Dict, Optional
import ccxt.async_support as ccxt
from integrations.brokers.base import BaseBroker
from integrations.brokers.connectors.ccxt.connector import CCXTBroker
from integrations.brokers.connectors.ctrader import CTraderBroker
from integrations.brokers.connectors.angel_one import AngelOneBroker

class BrokerRegistry:
    def __init__(self):
        angel = AngelOneBroker()
        self._connectors: Dict[str, BaseBroker] = {
            "ctrader": CTraderBroker(),
            "angel-one": angel,
            "angel_one": angel,
        }

    def register(self, connector: BaseBroker) -> None:
        self._connectors[connector.slug] = connector

    def get(self, slug: str) -> Optional[BaseBroker]:
        if slug in self._connectors:
            return self._connectors[slug]
        if hasattr(ccxt, slug):
            connector = CCXTBroker(slug)
            self._connectors[slug] = connector
            return connector
        return None

    def list_all(self) -> Dict[str, BaseBroker]:
        return self._connectors

broker_registry = BrokerRegistry()
