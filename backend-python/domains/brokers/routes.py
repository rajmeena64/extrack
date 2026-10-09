import os
from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import RedirectResponse
from domains.auth.service import get_current_user_id
from domains.brokers import service
from integrations.brokers.registry import broker_registry

brokers_router = APIRouter(prefix="/brokers", tags=["brokers"])
connections_router = APIRouter(prefix="/broker-connections", tags=["broker-connections"])

@brokers_router.get("")
@brokers_router.get("/")
async def list_brokers_endpoint(search: Optional[str] = Query(None), popular: bool = Query(False), limit: int = Query(50)):
    brokers = await service.list_brokers(search=search, popular=popular, limit=limit)
    return {"success": True, "brokers": brokers}

@connections_router.get("/{provider}/callback")
@connections_router.get("/oauth/{provider}/callback")
@brokers_router.get("/{provider}/callback")
@brokers_router.get("/oauth/{provider}/callback")
async def broker_oauth_callback_endpoint(provider: str, request: Request, code: Optional[str] = None, state: Optional[str] = None, error: Optional[str] = None):
    connector = broker_registry.get(provider)
    origin = (request.headers.get("origin") or os.getenv("FRONTEND_URL", "http://localhost:3000")).rstrip("/")
    if not connector or not hasattr(connector, "handle_oauth_callback"):
        return RedirectResponse(f"{origin}/add-trade?oauth=error")
    try:
        target = await connector.handle_oauth_callback(code or "", state or "", error=error)
        return RedirectResponse(target)
    except Exception:
        return RedirectResponse(f"{origin}/add-trade?oauth=error")

@brokers_router.get("/{broker_id}")
async def get_broker_endpoint(broker_id: str):
    broker = await service.get_broker(broker_id)
    return {"success": True, "broker": broker}

@brokers_router.get("/{broker_id}/integrations")
async def list_integrations_endpoint(broker_id: str):
    broker = await service.get_broker(broker_id)
    integrations = await service.list_broker_integrations(broker_id)
    return {"success": True, "broker": {"id": str(broker["id"]), "name": broker["name"], "slug": broker["slug"]}, "integrations": integrations}

@connections_router.get("")
@connections_router.get("/")
async def list_connections_endpoint(user_id: Any = Depends(get_current_user_id)):
    connections = await service.list_user_connections(int(user_id))
    return {"success": True, "connections": connections, "balances": []}

@connections_router.get("/{connection_id}")
async def get_connection_endpoint(connection_id: str, user_id: Any = Depends(get_current_user_id)):
    conn = await service.get_user_connection(int(user_id), connection_id)
    return {"success": True, "connection": conn}

@connections_router.get("/{connection_id}/mapping")
async def get_mapping_endpoint(connection_id: str, tradeMethod: str = Query("file_upload"), user_id: Any = Depends(get_current_user_id)):
    mapping = await service.get_connection_mapping(int(user_id), connection_id, trade_method=tradeMethod)
    return {"success": True, "data": mapping}

@connections_router.post("")
@connections_router.post("/")
async def create_connection_endpoint(payload: Dict[str, Any], user_id: Any = Depends(get_current_user_id)):
    conn = await service.create_user_connection(int(user_id), payload)
    return {"success": True, "connection": conn}

@connections_router.patch("/{connection_id}")
async def update_connection_endpoint(connection_id: str, payload: Dict[str, Any], user_id: Any = Depends(get_current_user_id)):
    conn = await service.update_user_connection(int(user_id), connection_id, payload)
    return {"success": True, "connection": conn}

@connections_router.post("/{connection_id}/integration")
async def set_integration_endpoint(connection_id: str, payload: Dict[str, Any], user_id: Any = Depends(get_current_user_id)):
    conn = await service.set_connection_integration(int(user_id), connection_id, str(payload.get("integrationId")))
    return {"success": True, "connection": conn}

@connections_router.delete("/{connection_id}")
async def delete_connection_endpoint(connection_id: str, user_id: Any = Depends(get_current_user_id)):
    deleted_id = await service.delete_user_connection(int(user_id), connection_id)
    return {"success": True, "id": deleted_id}

@connections_router.post("/{connection_id}/connect")
async def connect_endpoint(connection_id: str, request: Request, payload: Optional[Dict[str, Any]] = None, user_id: Any = Depends(get_current_user_id)):
    uid = int(user_id)
    conn = await service.get_user_connection(uid, connection_id)
    slug = conn.get("platformSlug") if (conn.get("platformSlug") and broker_registry.get(conn.get("platformSlug"))) else conn.get("brokerSlug")
    connector = broker_registry.get(slug)
    if connector and hasattr(connector, "get_authorization_url"):
        origin = (request.headers.get("origin") or os.getenv("FRONTEND_URL", "http://localhost:3000")).rstrip("/")
        auth_url = await connector.get_authorization_url(uid, connection_id, return_origin=origin)
        return {"success": True, "authorizationUrl": auth_url}
    creds = payload if payload is not None else {}
    ext_acc = str(creds.get("externalAccountId") or creds.get("accountId") or "").strip()
    if ext_acc and not creds.get("restore") and not creds.get("freshStart"):
        archived = await service.find_archived_connection(uid, ext_acc, str(conn.get("integrationId", "")))
        if archived:
            return {"success": True, "reconnectPrompt": True, "archivedConnectionId": str(archived["id"]), "externalAccountId": ext_acc}
    if creds:
        await service.save_credentials(uid, connection_id, creds)
    if connector:
        saved_creds = await service.get_credentials(uid, connection_id)
        if saved_creds:
            await connector.connect(saved_creds)
    await service.update_sync_status(connection_id, status="connected")
    return {"success": True, "message": "Connected successfully"}

@connections_router.post("/{connection_id}/restore")
async def restore_connection_endpoint(connection_id: str, payload: Optional[Dict[str, Any]] = None, user_id: Any = Depends(get_current_user_id)):
    archived_id = (payload or {}).get("archivedConnectionId") or connection_id
    active_id = connection_id if connection_id != archived_id else (payload or {}).get("activeConnectionId")
    conn = await service.restore_user_connection(int(user_id), archived_id, active_connection_id=active_id)
    return {"success": True, "connection": conn}

@connections_router.post("/{connection_id}/fresh-start")
async def fresh_start_connection_endpoint(connection_id: str, payload: Optional[Dict[str, Any]] = None, user_id: Any = Depends(get_current_user_id)):
    archived_id = (payload or {}).get("archivedConnectionId")
    conn = await service.fresh_start_connection(int(user_id), connection_id, archived_connection_id=archived_id)
    return {"success": True, "connection": conn}

@connections_router.post("/{connection_id}/sync")
async def sync_endpoint(connection_id: str, payload: Optional[Dict[str, Any]] = None, user_id: Any = Depends(get_current_user_id)):
    result = await service.sync_connection(int(user_id), connection_id, payload=payload)
    return {"success": True, **result}
