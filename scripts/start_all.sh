#!/bin/bash
# ==========================================================
# Need2Done — Start ALL Services
# ==========================================================
# Starts services in the correct order:
#   1. WhatsApp Bot (port 8000) — must start first
#   2. Node.js Backend (port 5000) — proxies to bot
#
# Nginx and MySQL are system services — started separately:
#   sudo systemctl start nginx
#   sudo systemctl start mysql
#
# USAGE:
#   chmod +x scripts/start_all.sh
#   ./scripts/start_all.sh
# ==========================================================

set -e

SCRIPTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=========================================="
echo "  Need2Done — Starting All Services"
echo "=========================================="
echo ""

# --- Step 1: Start WhatsApp Bot ---
echo "▶ Step 1/2 — WhatsApp Bot..."
bash "$SCRIPTS_DIR/start_bot.sh"
echo ""

# --- Wait for bot to be ready before starting backend ---
# The backend health check pings the bot. Give it 3s to boot.
echo "⏳ Waiting 3s for bot to initialize..."
sleep 3

# --- Step 2: Start Node.js Backend ---
echo "▶ Step 2/2 — Node.js Backend..."
bash "$SCRIPTS_DIR/start_backend.sh"
echo ""

echo "=========================================="
echo "✅ All services started!"
echo ""
echo "  Check status : ./scripts/status.sh"
echo "  Stop all     : ./scripts/stop_all.sh"
echo "  Health check : curl https://need2done.in/api/health"
echo "=========================================="
