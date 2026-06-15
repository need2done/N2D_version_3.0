#!/bin/bash
# ==========================================================
# Need2Done — Stop All Services
# ==========================================================
# Gracefully stops:
#   - WhatsApp Bot (port 8000)
#   - Node.js Backend (port 5000)
#
# USAGE:
#   ./scripts/stop_all.sh
# ==========================================================

APP_DIR="/need2done/app"
LOG_DIR="$APP_DIR/logs"

echo "🛑 Stopping all Need2Done services..."
echo ""

# --- Helper function to stop a service by PID file ---
stop_service() {
    local NAME=$1
    local PID_FILE=$2

    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "   Stopping $NAME (PID: $PID)..."
            kill "$PID"
            sleep 1

            # Force kill if still running after 3 seconds
            if ps -p "$PID" > /dev/null 2>&1; then
                echo "   Force killing $NAME..."
                kill -9 "$PID"
            fi

            rm -f "$PID_FILE"
            echo "   ✅ $NAME stopped"
        else
            echo "   ⚠️  $NAME PID $PID not running (stale PID file removed)"
            rm -f "$PID_FILE"
        fi
    else
        echo "   ℹ️  $NAME — no PID file found (may not be running)"
    fi
    echo ""
}

# --- Stop each service ---
stop_service "WhatsApp Bot"   "$LOG_DIR/bot.pid"
stop_service "Node.js Backend" "$LOG_DIR/backend.pid"

echo "✅ All services stopped."
