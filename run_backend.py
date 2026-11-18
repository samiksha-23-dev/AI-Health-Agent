import uvicorn
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
from app.config import config

if __name__ == "__main__":
    uvicorn.run("app.main:app", host=config.API_HOST, port=config.API_PORT, reload=True, app_dir="backend")
