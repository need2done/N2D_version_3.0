#!/bin/bash
# ==============================================================================
# Need2Done (N2D) — Production Deployment & Monitoring Update Script
# ==============================================================================

set -e

echo "🚀 Starting Need2Done Production Update..."

APP_DIR="/home/ubuntu/Need2Done"

if [ -d "$APP_DIR" ]; then
    cd "$APP_DIR"
    echo "📥 Pulling latest repository code..."
    git pull
else
    echo "❌ Directory $APP_DIR not found!"
    exit 1
fi

echo "🛑 Stopping running services..."
./scripts/stop_all.sh || true

echo "⚙️ Updating Nginx Configuration..."
sudo cp "$APP_DIR/nginx/need2done.conf" /etc/nginx/sites-available/need2done
sudo ln -sf /etc/nginx/sites-available/need2done /etc/nginx/sites-enabled/need2done
sudo nginx -t
sudo systemctl reload nginx

echo "▶ Starting all services & Uptime Kuma monitoring..."
./scripts/start_all.sh

echo ""
echo "=================================================="
echo "✅ PRODUCTION DEPLOYMENT COMPLETE!"
echo "Status Dashboard: https://need2done.in/status"
echo "=================================================="
