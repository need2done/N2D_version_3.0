#!/bin/bash
# ==============================================================================
# Need2Done (N2D) — Setup Uptime Kuma Free Open-Source Monitoring
# ==============================================================================

set -e

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
KUMA_DIR="$APP_DIR/uptime-kuma-data"

echo "=========================================="
echo "  Need2Done — Installing Uptime Kuma"
echo "=========================================="

mkdir -p "$KUMA_DIR"

if command -v docker &> /dev/null; then
    echo "🐳 Docker detected. Launching Uptime Kuma container..."
    docker compose -f "$APP_DIR/docker-compose.monitoring.yml" up -d
    echo "✅ Uptime Kuma container started on 127.0.0.1:3001"
elif command -v pm2 &> /dev/null; then
    echo "📦 PM2 detected. Setting up Uptime Kuma via Node.js..."
    if [ ! -d "$APP_DIR/uptime-kuma" ]; then
        git clone https://github.com/louislam/uptime-kuma.git "$APP_DIR/uptime-kuma"
        cd "$APP_DIR/uptime-kuma"
        npm run setup
    fi
    cd "$APP_DIR/uptime-kuma"
    pm2 start server/server.js --name "uptime-kuma" -- --port 3001
    pm2 save
    echo "✅ Uptime Kuma started via PM2 on port 3001"
else
    echo "⚠️ Neither Docker nor PM2 detected."
    echo "Installing via standalone Node.js process..."
    if [ ! -d "$APP_DIR/uptime-kuma" ]; then
        git clone https://github.com/louislam/uptime-kuma.git "$APP_DIR/uptime-kuma"
        cd "$APP_DIR/uptime-kuma"
        npm run setup
    fi
    cd "$APP_DIR/uptime-kuma"
    nohup node server/server.js --port 3001 > "$APP_DIR/logs/kuma.log" 2>&1 &
    echo $! > "$APP_DIR/logs/kuma.pid"
    echo "✅ Uptime Kuma started in background (PID: $(cat "$APP_DIR/logs/kuma.pid"))"
fi

echo ""
echo "=========================================="
echo "✅ Monitoring setup complete!"
echo "Access Point: https://need2done.in/status (via Nginx)"
echo "Internal Port: http://127.0.0.1:3001"
echo "=========================================="
