#!/bin/bash
# ==========================================================
# Need2Done — Local Development Runner (Linux / macOS / WSL)
# ==========================================================

echo "Cleaning up old Node / Python processes..."
pkill -f "node" || true
pkill -f "uvicorn" || true

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo "Starting Need2Done Services locally from $REPO_DIR..."

# 1. Start Admin Dashboard in background
echo "Starting Admin Dashboard (Vite)..."
(cd "$REPO_DIR/admin-dashboard" && npm run dev) &

# 2. Start Backend Node.js Server
echo "Starting Backend Node.js Server..."
(cd "$REPO_DIR/backend" && npm run dev) &

# 3. Start N2D WhatsApp Bot (FastAPI)
echo "Starting N2D WhatsApp Bot..."
if [ -f "$REPO_DIR/N2D_whatsapp_bot/venv_n2d/bin/activate" ]; then
    (source "$REPO_DIR/N2D_whatsapp_bot/venv_n2d/bin/activate" && cd "$REPO_DIR/N2D_whatsapp_bot" && uvicorn app:app --host 0.0.0.0 --port 8000 --reload) &
else
    echo "⚠️ Python virtual environment venv_n2d not found. Please set it up in N2D_whatsapp_bot."
fi

echo "✅ All local services initiated!"
