#!/bin/bash
# ==========================================================
# Need2Done — Start Node.js Backend (Service 2)
# ==========================================================
# Service   : N2D Node.js REST API + Webhook Forwarder
# Port      : 5000 (internal, not exposed to internet)
# Log File  : /home/ubuntu/Need2Done/logs/backend.log
# PID File  : /home/ubuntu/Need2Done/logs/backend.pid
#
# USAGE:
#   chmod +x scripts/start_backend.sh
#   ./scripts/start_backend.sh
#
# Routes exposed via Nginx:
#   https://need2done.in/api/*    → http://127.0.0.1:5000/api/*
#   https://need2done.in/webhook  → http://127.0.0.1:5000/webhook
#                                   → (forwarded to bot on port 8000)
# ==========================================================

set -e

# --- Paths ---
APP_DIR="/home/ubuntu/Need2Done"
BACKEND_DIR="$APP_DIR/backend"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/backend.log"
PID_FILE="$LOG_DIR/backend.pid"

# --- Create logs directory if it doesn't exist ---
mkdir -p "$LOG_DIR"

# --- Check if Node.js is installed ---
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install with:"
    echo "   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -"
    echo "   sudo apt-get install -y nodejs"
    exit 1
fi

echo "📦 Node.js version: $(node --version)"

# --- Check if already running ---
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "⚠️  Backend is already running with PID $OLD_PID"
        echo "   To restart: ./scripts/stop_all.sh && ./scripts/start_backend.sh"
        exit 1
    else
        echo "🧹 Removing stale PID file..."
        rm -f "$PID_FILE"
    fi
fi

# --- Install dependencies if node_modules missing ---
if [ ! -d "$BACKEND_DIR/node_modules" ]; then
    echo "📦 Installing Node.js dependencies..."
    cd "$BACKEND_DIR" && npm install
fi

echo "🚀 Starting Node.js Backend on port 5000..."

# --- Launch with nohup (survives SSH disconnect) ---
# The .env is loaded by server.js using dotenv ({ path: '../.env' })
nohup node "$BACKEND_DIR/server.js" >> "$LOG_FILE" 2>&1 &

# --- Save PID for management ---
echo $! > "$PID_FILE"

echo "✅ Node.js Backend started | PID: $(cat $PID_FILE)"
echo "📄 Logs: $LOG_FILE"
echo "🔍 Tail logs: tail -f $LOG_FILE"
