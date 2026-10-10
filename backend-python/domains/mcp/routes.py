import json
import html
import secrets
import os
import urllib.parse
import asyncio
from typing import Any
import httpx
from pydantic import BaseModel
from fastapi import APIRouter, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse, StreamingResponse, Response
import asyncpg
from core.errors.app_error import AppError
from core.errors.messages import ERROR_MESSAGES
from infra.db.postgres import init_db, get_db
from infra.db.redis import get_redis
from domains.auth.service import verify_access_token, get_current_user_id, verify_password
from domains.mcp.tools import get_my_trades, get_performance_metrics, get_trade_details, get_journal_entries
from domains.mcp.oauth import (
    authenticate_google_user, sign_mcp_token, save_mcp_connection,
    verify_mcp_connection, revoke_mcp_connection, list_user_mcp_connections,
    get_active_tool_names, create_oauth_code, exchange_oauth_code,
    verify_google_access_token, generate_mcp_refresh_token, refresh_mcp_token,
    MCP_EXPIRES_IN
)
from domains.mcp.rate_limit import enforce_mcp_rate_limit
from domains.mcp.clients import save_registered_client, is_trusted_redirect_uri, get_client_name

mcp_router = APIRouter(tags=["mcp"])

class GoogleAuthPayload(BaseModel):
    access_token: str

class RevokePayload(BaseModel):
    connection_id: int | None = None

MCP_TOOLS = [
    {
        "name": "get_my_trades",
        "description": "Fetch closed and open trades with entry, exit, PnL, ROI%, notes, and mistakes for analysis",
        "inputSchema": {
            "type": "object",
            "properties": {
                "symbol": {"type": "string", "description": "Filter by trading symbol e.g. BTCUSDT, NIFTY"},
                "from_date": {"type": "string", "description": "Start timestamp or date in YYYY-MM-DD"},
                "to_date": {"type": "string", "description": "End timestamp or date in YYYY-MM-DD"},
                "win_only": {"type": "boolean", "description": "Filter only winning trades"},
                "loss_only": {"type": "boolean", "description": "Filter only losing trades"},
                "side": {"type": "string", "enum": ["long", "short"], "description": "Filter by trade side"},
                "limit": {"type": "integer", "default": 20, "description": "Max trades to return"}
            }
        }
    },
    {
        "name": "get_performance_metrics",
        "description": "Get aggregate trading performance summary including win rate %, total PnL, profit factor, best and worst trade",
        "inputSchema": {
            "type": "object",
            "properties": {
                "days": {"type": "integer", "default": 30, "description": "Number of past days to analyze"}
            }
        }
    },
    {
        "name": "get_trade_details",
        "description": "Get detailed information for a single specific trade by its ID",
        "inputSchema": {
            "type": "object",
            "properties": {
                "trade_id": {"type": "string", "description": "The unique ID or numeric ID of the trade"}
            },
            "required": ["trade_id"]
        }
    },
    {
        "name": "get_journal_entries",
        "description": "Fetch user's daily trading psychology notes, lessons, and breakeven status",
        "inputSchema": {
            "type": "object",
            "properties": {
                "from_date": {"type": "string", "description": "Start date in YYYY-MM-DD"},
                "to_date": {"type": "string", "description": "End date in YYYY-MM-DD"}
            }
        }
    }
]

def _get_base_url(request: Request) -> str:
    proto = request.headers.get("x-forwarded-proto", request.url.scheme)
    host = request.headers.get("x-forwarded-host", request.headers.get("host", request.url.netloc))
    if host and "onrender.com" not in host:
        return f"{proto}://{host}".rstrip("/")
    app_url = os.getenv("APP_URL") or os.getenv("BASE_URL") or os.getenv("API_URL")
    if app_url and "YOUR-BACKEND" not in app_url:
        return app_url.rstrip("/")
    return f"{proto}://{host}".rstrip("/")

def _extract_token_and_user_id(request: Request) -> tuple[str, int]:
    token = request.query_params.get("token")
    if not token:
        auth = request.headers.get("Authorization")
        if auth and auth.startswith("Bearer "):
            token = auth[7:].strip()
    if not token:
        base = _get_base_url(request)
        raise HTTPException(
            status_code=401,
            detail=ERROR_MESSAGES["MCP"]["AUTH_REQUIRED"]["message"],
            headers={"WWW-Authenticate": f'Bearer resource_metadata="{base}/.well-known/oauth-protected-resource"'}
        )
    try:
        payload = verify_access_token(token)
        if payload.get("purpose") != "mcp":
            raise HTTPException(status_code=401, detail=ERROR_MESSAGES["MCP"]["INVALID_TOKEN"]["message"])
        uid = payload.get("sub")
        if not uid:
            raise HTTPException(status_code=401, detail=ERROR_MESSAGES["MCP"]["INVALID_TOKEN"]["message"])
        return token, int(uid)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail=ERROR_MESSAGES["MCP"]["INVALID_TOKEN"]["message"])

@mcp_router.get("/.well-known/oauth-authorization-server")
async def oauth_auth_server(request: Request):
    base = _get_base_url(request)
    return {
        "issuer": base,
        "authorization_endpoint": f"{base}/oauth/authorize",
        "token_endpoint": f"{base}/oauth/token",
        "registration_endpoint": f"{base}/register",
        "response_types_supported": ["code"],
        "grant_types_supported": ["authorization_code", "refresh_token"],
        "token_endpoint_auth_methods_supported": ["client_secret_post", "none"],
        "code_challenge_methods_supported": ["S256"]
    }

@mcp_router.get("/.well-known/oauth-protected-resource")
@mcp_router.get("/.well-known/oauth-protected-resource/mcp")
async def oauth_protected_resource(request: Request):
    base = _get_base_url(request)
    return {
        "resource": f"{base}/mcp",
        "authorization_servers": [base]
    }

@mcp_router.post("/register")
async def oauth_register(request: Request):
    body = await request.json()
    cid = f"mcp_{secrets.token_hex(8)}"
    sec = secrets.token_hex(16)
    name = str(body["client_name"]) if body.get("client_name") else "AI Client"
    uris = body["redirect_uris"] if isinstance(body.get("redirect_uris"), list) else []
    await save_registered_client(cid, name, uris)
    grant_types = body["grant_types"] if "grant_types" in body else ["authorization_code"]
    resp_types = body["response_types"] if "response_types" in body else ["code"]
    auth_method = str(body["token_endpoint_auth_method"]) if "token_endpoint_auth_method" in body else "client_secret_post"
    return {
        "client_id": cid,
        "client_secret": sec,
        "client_name": name,
        "redirect_uris": uris,
        "grant_types": grant_types,
        "response_types": resp_types,
        "token_endpoint_auth_method": auth_method
    }

@mcp_router.get("/oauth/authorize")
async def oauth_authorize_get(request: Request):
    raw_r_uri = request.query_params.get("redirect_uri")
    raw_cid = request.query_params.get("client_id") or ""
    if raw_r_uri and not await is_trusted_redirect_uri(raw_r_uri, raw_cid):
        raise HTTPException(status_code=400, detail="Invalid redirect_uri")
    furl = (os.getenv("FRONTEND_URL") or "http://localhost:3000").rstrip("/")
    query = request.url.query
    return RedirectResponse(f"{furl}/oauth/authorize?{query}" if query else f"{furl}/oauth/authorize", status_code=302)

@mcp_router.post("/oauth/authorize")
async def oauth_authorize_post(request: Request, conn: asyncpg.Connection = Depends(get_db)):
    ct = request.headers.get("content-type", "")
    try:
        data = (await request.form()) if ("form" in ct) else (await request.json())
    except Exception:
        data = {}
    client_id = str(data.get("client_id") or "")
    client_name = str(data.get("client_name") or "")
    redirect_uri = str(data.get("redirect_uri") or "")
    state = str(data.get("state") or "")
    challenge = str(data.get("code_challenge") or "")

    if not await is_trusted_redirect_uri(redirect_uri, client_id):
        raise HTTPException(status_code=400, detail="Invalid redirect_uri")

    cookie_token = request.cookies.get("accessToken")
    user_id = None

    if cookie_token and not data.get("email"):
        try:
            payload = verify_access_token(cookie_token)
            uid = payload.get("sub")
            if uid:
                user_id = int(uid)
        except Exception:
            pass

    if not user_id:
        email = str(data.get("email") or "").strip().lower()
        password = str(data.get("password") or "")
        row = await conn.fetchrow("SELECT id, password_hash FROM app_auth.users WHERE lower(email) = $1 LIMIT 1", email)
        pwd_hash = row["password_hash"] if (row and row.get("password_hash")) else ""
        if not row or not pwd_hash or not verify_password(password, pwd_hash):
            msg = ERROR_MESSAGES["AUTH"]["INVALID_CREDENTIALS"]["message"]
            if "json" in request.headers.get("accept", "") or "json" in ct:
                raise HTTPException(status_code=401, detail=msg)
            furl = (os.getenv("FRONTEND_URL") or "http://localhost:3000").rstrip("/")
            params_dict = {
                "client_id": client_id,
                "redirect_uri": redirect_uri,
                "state": state,
                "code_challenge": challenge,
                "error": msg
            }
            if client_name:
                params_dict["client_name"] = client_name
            return RedirectResponse(f"{furl}/oauth/authorize?{urllib.parse.urlencode(params_dict)}", status_code=302)
        user_id = int(row["id"])

    code = await create_oauth_code(user_id, client_id, redirect_uri, challenge)
    sep = "&" if "?" in redirect_uri else "?"
    target_url = f"{redirect_uri}{sep}code={code}" + (f"&state={state}" if state else "")
    if "json" in request.headers.get("accept", "") or "json" in ct:
        return {"success": True, "redirect_url": target_url}
    return RedirectResponse(target_url, status_code=302)

@mcp_router.post("/oauth/token")
async def oauth_token_endpoint(request: Request, conn: asyncpg.Connection = Depends(get_db)):
    ct = request.headers.get("content-type")
    try:
        data = (await request.form()) if (ct and "form" in ct) else (await request.json())
    except Exception:
        data = {}
    grant_type = str(data["grant_type"]) if data.get("grant_type") is not None else "authorization_code"
    if grant_type not in ("authorization_code", "refresh_token"):
        raise HTTPException(status_code=400, detail="Unsupported grant_type")

    if grant_type == "refresh_token":
        raw_ref = str(data["refresh_token"]) if data.get("refresh_token") is not None else ""
        try:
            return await refresh_mcp_token(conn, raw_ref)
        except AppError as e:
            raise HTTPException(status_code=400, detail=str(e))

    code = str(data["code"]) if data.get("code") is not None else ""
    client_id = str(data["client_id"]) if data.get("client_id") is not None else ""
    redirect_uri = str(data["redirect_uri"]) if data.get("redirect_uri") is not None else ""
    verifier = str(data["code_verifier"]) if data.get("code_verifier") is not None else ""
    user_id = await exchange_oauth_code(code, client_id, redirect_uri, verifier)
    if not user_id:
        raise HTTPException(status_code=400, detail=ERROR_MESSAGES["MCP"]["INVALID_CODE"]["message"])
    token = sign_mcp_token(user_id)
    ref_token = generate_mcp_refresh_token()
    c_name = await get_client_name(client_id)
    await save_mcp_connection(conn, user_id, token, client_name=c_name, refresh_token=ref_token)
    return {
        "access_token": token,
        "refresh_token": ref_token,
        "token_type": "Bearer",
        "expires_in": MCP_EXPIRES_IN
    }


@mcp_router.post("/mcp/auth/google")
async def mcp_google_auth(payload: GoogleAuthPayload, conn: asyncpg.Connection = Depends(get_db)):
    return await authenticate_google_user(conn, payload.access_token)

@mcp_router.get("/mcp/auth/connect-link")
async def mcp_connect_link(request: Request, user_id: Any = Depends(get_current_user_id), conn: asyncpg.Connection = Depends(get_db)):
    uid = int(user_id)
    token = sign_mcp_token(uid)
    await save_mcp_connection(conn, uid, token, client_name="Web AI Link")
    base = _get_base_url(request)
    return {
        "success": True,
        "token": token,
        "mcp_url": f"{base}/mcp?token={token}",
    }

@mcp_router.get("/mcp/connections")
async def mcp_list_connections(user_id: Any = Depends(get_current_user_id), conn: asyncpg.Connection = Depends(get_db)):
    return {"success": True, "connections": await list_user_mcp_connections(conn, int(user_id))}

@mcp_router.post("/mcp/connections/revoke")
async def mcp_revoke_connection(payload: RevokePayload, user_id: Any = Depends(get_current_user_id), conn: asyncpg.Connection = Depends(get_db)):
    await revoke_mcp_connection(conn, int(user_id), payload.connection_id)
    return {"success": True, "message": "Connection revoked successfully"}

@mcp_router.get("/mcp")
@mcp_router.get("/sse")
async def handle_mcp_get(request: Request):
    has_auth = request.headers.get("Authorization") or request.query_params.get("token")
    if not has_auth:
        base = _get_base_url(request)
        raise HTTPException(
            status_code=401,
            detail=ERROR_MESSAGES["MCP"]["AUTH_REQUIRED"]["message"],
            headers={"WWW-Authenticate": f'Bearer resource_metadata="{base}/.well-known/oauth-protected-resource"'}
        )
    raw_token, user_id = _extract_token_and_user_id(request)
    await enforce_mcp_rate_limit(user_id)
    pool = await init_db()
    async with pool.acquire() as conn:
        try:
            await verify_mcp_connection(conn, user_id, raw_token)
        except AppError as e:
            raise HTTPException(status_code=401, detail=str(e))
    base = _get_base_url(request)
    accept = request.headers.get("accept", "")
    if "text/event-stream" in accept:
        async def event_generator():
            yield f"event: endpoint\ndata: {base}/mcp\n\n".encode("utf-8")
            while not await request.is_disconnected():
                await asyncio.sleep(15)
                yield b": keepalive\n\n"
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive", "X-Accel-Buffering": "no"}
        )
    return {
        "jsonrpc": "2.0",
        "result": {
            "status": "ready",
            "protocolVersion": "2024-11-05",
            "serverInfo": {"name": "entrack-mcp", "version": "1.0.0"}
        }
    }

@mcp_router.post("/mcp")
@mcp_router.post("/messages")
async def handle_mcp_rpc(request: Request):
    raw_token, user_id = _extract_token_and_user_id(request)
    await enforce_mcp_rate_limit(user_id)
    pool = await init_db()
    async with pool.acquire() as conn:
        try:
            conn_info = await verify_mcp_connection(conn, user_id, raw_token)
        except AppError as e:
            raise HTTPException(status_code=401, detail=str(e))
        disabled_tools = conn_info["disabled_tools"] if (conn_info and conn_info.get("disabled_tools") is not None) else []
        active_tools = await get_active_tool_names(conn, disabled_tools)

    try:
        body = await request.json()
    except Exception:
        return {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error: Invalid JSON"}}
    if not isinstance(body, dict):
        return {"jsonrpc": "2.0", "id": None, "error": {"code": -32600, "message": "Invalid Request: expected single JSON-RPC object"}}
    req_id = body.get("id")
    method = body.get("method")
    params = body.get("params") if isinstance(body.get("params"), dict) else {}

    if method == "initialize":
        client_proto = str(params.get("protocolVersion") or "2024-11-05")
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {
                "protocolVersion": client_proto,
                "capabilities": {"tools": {"listChanged": False}},
                "serverInfo": {"name": "entrack-mcp", "version": "1.0.0"}
            }
        }

    if method == "notifications/initialized":
        return Response(status_code=202)

    if method == "ping":
        return {"jsonrpc": "2.0", "id": req_id, "result": {}}

    if method == "tools/list":
        allowed = [t for t in MCP_TOOLS if t["name"] in active_tools]
        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "result": {"tools": allowed}
        }

    if method == "tools/call":
        tool_name = params.get("name")
        args = params.get("arguments") if isinstance(params.get("arguments"), dict) else {}

        if tool_name not in active_tools:
            return {
                "jsonrpc": "2.0",
                "id": req_id,
                "error": {"code": -32601, "message": f"Tool '{tool_name}' is currently disabled"}
            }

        try:
            if tool_name == "get_my_trades":
                try:
                    limit = max(1, min(100, int(args["limit"]))) if args.get("limit") is not None else 20
                except (ValueError, TypeError):
                    limit = 20
                res = await get_my_trades(
                    pool, user_id,
                    symbol=args.get("symbol"),
                    from_date=args.get("from_date"),
                    to_date=args.get("to_date"),
                    win_only=bool(args["win_only"]) if args.get("win_only") is not None else False,
                    loss_only=bool(args["loss_only"]) if args.get("loss_only") is not None else False,
                    side=args.get("side"),
                    limit=limit
                )
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(res, default=str)}]}}

            if tool_name == "get_performance_metrics":
                try:
                    days = max(1, min(3650, int(args["days"]))) if args.get("days") is not None else 30
                except (ValueError, TypeError):
                    days = 30
                res = await get_performance_metrics(pool, user_id, days=days)
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(res, default=str)}]}}

            if tool_name == "get_trade_details":
                t_id = str(args["trade_id"]) if args.get("trade_id") is not None else ""
                res = await get_trade_details(pool, user_id, trade_id=t_id)
                if not res:
                    return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": f"Trade with ID '{args.get('trade_id')}' not found"}], "isError": True}}
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(res, default=str)}]}}

            if tool_name == "get_journal_entries":
                res = await get_journal_entries(pool, user_id, from_date=args.get("from_date"), to_date=args.get("to_date"))
                return {"jsonrpc": "2.0", "id": req_id, "result": {"content": [{"type": "text", "text": json.dumps(res, default=str)}]}}
        except Exception as e:
            return {"jsonrpc": "2.0", "id": req_id, "error": {"code": -32603, "message": f"Internal tool execution error: {str(e)}"}}

        return {
            "jsonrpc": "2.0",
            "id": req_id,
            "error": {"code": -32601, "message": f"Unknown tool: {tool_name}"}
        }

    return {
        "jsonrpc": "2.0",
        "id": req_id,
        "error": {"code": -32601, "message": f"Unsupported method: {method}"}
    }
