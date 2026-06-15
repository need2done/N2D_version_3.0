#!/bin/bash
# ==========================================================
# Need2Done — Status Check for All Services
# ==========================================================
# Shows: Running / Stopped status for each service
# Also checks if ports are actually listening.
#
# USAGE:
#   ./scripts/status.sh
# ==========================================================

APP_DIR="/need2done/app"
LOG_DIR="$APP_DIR/logs"

echo "=========================================="
echo "  Need2Done — Service Status"
echo "=========================================="
echo ""

# --- Helper function to check service status ---
check_service() {
    local NAME=$1
    local PID_FILE=$2
    local PORT=$3

    echo "📦 $NAME"

    # Check PID file
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "   Status : ✅ RUNNING (PID: $PID)"
        else
            echo "   Status : ❌ DEAD (stale PID: $PID)"
        fi
    else
        echo "   Status : ⚫ STOPPED (no PID file)"
    fi

    # Check if port is listening
    if [ -n "$PORT" ]; then
        if ss -tlnp | grep -q ":$PORT "; then
            echo "   Port   : ✅ :$PORT is LISTENING"
        else
            echo "   Port   : ❌ :$PORT is NOT listening"
        fi
    fi

    echo ""
}

# --- Check each service ---
check_service "WhatsApp Bot (Python/Uvicorn)" "$LOG_DIR/bot.pid"     "8000"
check_service "Node.js Backend"               "$LOG_DIR/backend.pid" "5000"

# --- Check Nginx ---
echo "📦 Nginx (Web Server / Reverse Proxy)"
if systemctl is-active --quiet nginx; then
    echo "   Status : ✅ RUNNING"
    echo "   Port   : ✅ :80 and :443"
else
    echo "   Status : ❌ STOPPED"
    echo "   Start  : sudo systemctl start nginx"
fi
echo ""

# --- Check MySQL ---
echo "📦 MySQL (Database)"
if systemctl is-active --quiet mysql; then
    echo "   Status : ✅ RUNNING"
    echo "   Port   : ✅ :3306"
else
    echo "   Status : ❌ STOPPED"
    echo "   Start  : sudo systemctl start mysql"
fi
echo ""

echo "=========================================="
echo "  Logs Directory: $LOG_DIR"
echo "  bot.log     : tail -f $LOG_DIR/bot.log"
echo "  backend.log : tail -f $LOG_DIR/backend.log"
echo "=========================================="
