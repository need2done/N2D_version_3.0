import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")

from core.role_router import route_message
import json

msg = {"type": "text", "text": {"body": "go"}, "from": "917095849056"}
route_message("917095849056", "go", msg)
