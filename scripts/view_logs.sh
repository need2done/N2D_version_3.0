#!/usr/bin/env bash
# ============================================================
# Need2Done Log Viewer & Search Helper Utility
# Usage:
#   ./scripts/view_logs.sh bot              (Live tail Python bot log)
#   ./scripts/view_logs.sh backend          (Live tail Node backend log)
#   ./scripts/view_logs.sh error            (Tail error logs)
#   ./scripts/view_logs.sh search <keyword> (Search all active & compressed historical logs)
# ============================================================

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOT_LOG_DIR="$BASE_DIR/N2D_whatsapp_bot/logs"
BACKEND_LOG_DIR="$BASE_DIR/backend/logs"

COMMAND="${1:-bot}"
QUERY="$2"

case "$COMMAND" in
  bot)
    echo "=== Tailing Python Bot Log ($BOT_LOG_DIR/bot.log) ==="
    tail -n 100 -f "$BOT_LOG_DIR/bot.log"
    ;;
  backend)
    echo "=== Tailing Node Backend Log ($BACKEND_LOG_DIR/backend.log) ==="
    tail -n 100 -f "$BACKEND_LOG_DIR/backend.log"
    ;;
  error)
    echo "=== Tail Error Logs ==="
    tail -n 50 "$BOT_LOG_DIR/error.log" 2>/dev/null
    tail -n 50 "$BACKEND_LOG_DIR/error.log" 2>/dev/null
    ;;
  search)
    if [ -z "$QUERY" ]; then
      echo "Usage: ./scripts/view_logs.sh search <search_keyword>"
      exit 1
    fi
    echo "=== Searching logs for keyword: '$QUERY' ==="
    zgrep -in "$QUERY" "$BOT_LOG_DIR"/* "$BACKEND_LOG_DIR"/* 2>/dev/null
    ;;
  *)
    echo "Usage: $0 {bot|backend|error|search <keyword>}"
    exit 1
    ;;
esac
