#!/bin/bash
# ==========================================================
# Need2Done — Build & Deploy Admin Dashboard (Service 3)
# ==========================================================
# Service   : Admin Dashboard (React/Vite — Static Files)
# Served by : Nginx (not a running process)
# Build Dir : /home/ubuntu/Need2Done/admin-dashboard/dist
# Nginx Path: /admin → dist/
#
# USAGE:
#   chmod +x scripts/start_dashboard.sh
#   ./scripts/start_dashboard.sh
#
# Run this script every time you update the dashboard code.
# It builds the Vite app and puts static files in dist/
# which Nginx serves automatically (no restart needed).
#
# IMPORTANT: The .env must be updated BEFORE running this
# script because VITE_API_URL is baked in at build time.
# ==========================================================

set -e

# --- Paths ---
APP_DIR="/home/ubuntu/Need2Done"
DASHBOARD_DIR="$APP_DIR/admin-dashboard"
LOG_DIR="$APP_DIR/logs"
LOG_FILE="$LOG_DIR/dashboard_build.log"

# --- Create logs directory ---
mkdir -p "$LOG_DIR"

# --- Check Node.js ---
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found."
    exit 1
fi

echo "🏗️  Building Admin Dashboard..."
echo "📦 Node: $(node --version) | NPM: $(npm --version)"

# --- Move to dashboard directory ---
cd "$DASHBOARD_DIR"

# --- Install npm dependencies if needed ---
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dashboard dependencies..."
    npm install 2>&1 | tee -a "$LOG_FILE"
fi

# --- Build Vite production bundle ---
# This reads VITE_API_URL from .env and bakes it in.
# Output goes to admin-dashboard/dist/
echo "🔨 Running Vite build..."
npm run build 2>&1 | tee -a "$LOG_FILE"

# --- Verify build output ---
if [ -d "$DASHBOARD_DIR/dist" ]; then
    DIST_SIZE=$(du -sh "$DASHBOARD_DIR/dist" | cut -f1)
    echo "✅ Dashboard built successfully | Size: $DIST_SIZE"
    echo "📁 Files in: $DASHBOARD_DIR/dist"
    echo ""
    echo "📌 Nginx serves this at: https://need2done.in/admin"
    echo "   (No Nginx restart needed — files are updated in place)"
else
    echo "❌ Build failed — dist/ directory not found"
    exit 1
fi
