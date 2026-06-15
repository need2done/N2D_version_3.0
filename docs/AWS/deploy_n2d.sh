#!/bin/bash
# ============================================================
# Need2Done — Project Deployment Script for EC2
# ============================================================
# Run AFTER ec2_setup.sh has completed.
# Run as: bash deploy_n2d.sh
# ============================================================

set -e

PROJECT_DIR="/home/ubuntu/Need2Done"

echo "========================================"
echo "  Need2Done Deployment — Starting..."
echo "========================================"

# ============================================================
# 1. SETUP PROJECT DIRECTORY
# ============================================================
echo "[1/6] Setting up project directory..."
cd "$PROJECT_DIR"

# ============================================================
# 2. SETUP PYTHON BOT
# ============================================================
echo "[2/6] Setting up Python WhatsApp Bot..."
cd "$PROJECT_DIR/N2D_whatsapp_bot"
python3.11 -m venv venv_n2d
source venv_n2d/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate
echo "  ✅ Python bot ready"

# ============================================================
# 3. SETUP NODE BACKEND
# ============================================================
echo "[3/6] Setting up Node.js Backend..."
cd "$PROJECT_DIR/backend"
npm install --production
echo "  ✅ Node backend ready"

# ============================================================
# 4. BUILD ADMIN DASHBOARD
# ============================================================
echo "[4/6] Building Admin Dashboard..."
cd "$PROJECT_DIR/admin-dashboard"
npm install
npm run build
echo "  ✅ Admin dashboard built (dist/ ready for Nginx)"

# ============================================================
# 5. CREATE PM2 ECOSYSTEM CONFIG
# ============================================================
echo "[5/6] Creating PM2 ecosystem config..."
cat > "$PROJECT_DIR/ecosystem.config.js" << 'EOF'
module.exports = {
  apps: [
    {
      name: "n2d-backend",
      cwd: "./backend",
      script: "server.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/backend-error.log",
      out_file: "./logs/backend-out.log"
    },
    {
      name: "n2d-whatsapp-bot",
      cwd: "./N2D_whatsapp_bot",
      script: "venv_n2d/bin/uvicorn",
      args: "app:app --host 0.0.0.0 --port 8000",
      interpreter: "none",
      env: {
        NODE_ENV: "production"
      },
      instances: 1,
      autorestart: true,
      max_memory_restart: "500M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "./logs/bot-error.log",
      out_file: "./logs/bot-out.log"
    }
  ]
};
EOF
echo "  ✅ PM2 ecosystem config created"

# ============================================================
# 6. CREATE NGINX CONFIG
# ============================================================
echo "[6/6] Creating Nginx config..."
sudo tee /etc/nginx/sites-available/need2done > /dev/null << 'EOF'
# ============================================================
# Need2Done — Nginx Reverse Proxy Config
# ============================================================
# Replace YOUR_DOMAIN with your actual domain name
# After setup, run: sudo certbot --nginx -d YOUR_DOMAIN
# ============================================================

server {
    listen 80;
    server_name YOUR_DOMAIN;

    # Admin Dashboard (Static React Build)
    location / {
        root /home/ubuntu/Need2Done/admin-dashboard/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Node.js Backend API
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # WhatsApp Webhook (proxied to Python FastAPI bot)
    location /webhook {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Tracking API (for Flutter app — proxied to Node backend)
    location /tracking/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/need2done /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
echo "  ✅ Nginx config created"

# ============================================================
# CREATE LOGS DIRECTORY
# ============================================================
mkdir -p "$PROJECT_DIR/logs"

echo ""
echo "========================================"
echo "  ✅ Deployment setup complete!"
echo "========================================"
echo ""
echo "  TO START ALL SERVICES:"
echo "  cd $PROJECT_DIR"
echo "  pm2 start ecosystem.config.js"
echo "  pm2 save"
echo "  pm2 startup    # auto-start on reboot"
echo ""
echo "  TO MONITOR:"
echo "  pm2 status"
echo "  pm2 logs"
echo ""
echo "  REMAINING STEPS:"
echo "  1. Update .env — change ngrok URLs to your domain"
echo "  2. Update Nginx — replace YOUR_DOMAIN in config"
echo "  3. Setup SSL:  sudo certbot --nginx -d yourdomain.com"
echo "  4. Update WhatsApp webhook URL in Meta Developer Console"
echo ""
