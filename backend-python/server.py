import os
import uvicorn
from dotenv import load_dotenv
load_dotenv()
from core.logger.logger import logger

def main():
    port = int(os.getenv("PORT", "5000"))
    node_env = os.getenv("NODE_ENV", "development")
    logger.info("server.starting", {"port": port, "env": node_env})
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=port,
        log_level="info",
        reload=node_env != "production",
    )

if __name__ == "__main__":
    main()
