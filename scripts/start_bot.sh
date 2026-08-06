#!/bin/bash
# ==========================================================
# Need2Done — Start Python WhatsApp Bot (Service 1)
# ==========================================================
# Service   : N2D WhatsApp Bot (FastAPI + Uvicorn)
# Port      : 8000 (internal, not exposed to internet)
# Log File  : /home/ubuntu/Need2Done/logs/bot.log
# PID File  : /home/ubuntu/Need2Done/logs/bot.pid
#
# USAGE:
#   chmod +x scripts/start_bot.sh
#   ./scripts/start_bot.sh
#
# The bot receives webhooks from Meta via Nginx proxy:
#   Meta → https://need2done.in/webhook
#      → Nginx → http://127.0.0.1:8000/webhook
# ==========================================================

set -e  # Exit on error

# --- Paths ---
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOT_DIR="$APP_DIR/N2D_whatsapp_bot"

LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/bot.log"
PID_FILE="$LOG_DIR/bot.pid"

# --- Create logs directory if it doesn't exist ---
mkdir -p "$LOG_DIR"

# --- Load environment variables from .env ---
set -a  # Auto-export all variables
source "$APP_DIR/.env"
set +a

# --- Check if already running ---
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo "⚠️  Bot is already running with PID $OLD_PID"
        echo "   To restart: ./scripts/stop_all.sh && ./scripts/start_bot.sh"
        exit 1
    else
        echo "🧹 Removing stale PID file..."
        rm -f "$PID_FILE"
    fi
fi

# --- Activate Python virtual environment ---
# The venv must be set up on EC2:
#   cd /home/ubuntu/Need2Done/N2D_whatsapp_bot
#   python3 -m venv venv_n2d
#   source venv_n2d/bin/activate && pip install -r requirements.txt
VENV_PATH="$BOT_DIR/venv_n2d/bin/activate"
if [ ! -f "$VENV_PATH" ]; then
    echo "❌ Virtual environment not found at $VENV_PATH"
    echo "   Run: cd $BOT_DIR && python3 -m venv venv_n2d && source venv_n2d/bin/activate && pip install -r requirements.txt"
    exit 1
fi

echo "🚀 Starting WhatsApp Bot on port 8000..."

# --- Launch with nohup (survives SSH disconnect) ---
# --host 0.0.0.0 : listen on all interfaces (Nginx proxies to it)
# --port 8000    : internal port
# --workers 2    : 2 worker processes for stability
# --log-level info : log level (use warning in production if too noisy)
nohup bash -c "
    source $VENV_PATH && \
    cd $BOT_DIR && \
    uvicorn app:app \
        --host 0.0.0.0 \
        --port 8000 \
        --workers 1 \
        --log-level info \
        --access-log
" >> "$LOG_FILE" 2>&1 &

# --- Save PID for management ---
echo $! > "$PID_FILE"

echo "✅ WhatsApp Bot started | PID: $(cat $PID_FILE)"
echo "📄 Logs: $LOG_FILE"
echo "🔍 Tail logs: tail -f $LOG_FILE"
