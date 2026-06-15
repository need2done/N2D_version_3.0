#!/bin/bash
# ============================================================
# Need2Done — EC2 Setup Script (Ubuntu 22.04 / Amazon Linux 2023)
# ============================================================
# Run as: sudo bash ec2_setup.sh
#
# LOCAL VERSIONS (Windows) → EC2 EQUIVALENTS:
# ┌───────────────────────┬──────────────┬──────────────────┐
# │ Tool                  │ Local Ver    │ EC2 Install Ver  │
# ├───────────────────────┼──────────────┼──────────────────┤
# │ Node.js               │ v20.20.2     │ v20.x (LTS)      │
# │ npm                   │ 10.8.2       │ bundled with Node │
# │ Python                │ 3.11.0       │ 3.11.x           │
# │ pip                   │ 26.0.1       │ latest            │
# │ MySQL Server          │ 8.0.45       │ 8.0.x             │
# │ Git                   │ 2.53.0       │ latest            │
# │ Nginx (NEW for AWS)   │ N/A          │ latest            │
# │ PM2 (NEW for AWS)     │ N/A          │ latest            │
# │ Certbot (NEW for AWS) │ N/A          │ latest            │
# └───────────────────────┴──────────────┴──────────────────┘
# ============================================================

set -e

echo "========================================"
echo "  Need2Done EC2 Setup — Starting..."
echo "========================================"

# ============================================================
# 1. SYSTEM UPDATE
# ============================================================
echo "[1/9] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# ============================================================
# 2. GIT
# ============================================================
echo "[2/9] Installing Git..."
sudo apt install -y git
git --version

# ============================================================
# 3. NODE.JS v20.x (LTS) + npm
# ============================================================
echo "[3/9] Installing Node.js v20.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
echo "  Node: $(node --version)"
echo "  npm:  $(npm --version)"

# ============================================================
# 4. PM2 — Process Manager (replaces run.bat)
# ============================================================
echo "[4/9] Installing PM2 globally..."
sudo npm install -g pm2
pm2 --version

# ============================================================
# 5. PYTHON 3.11 + pip + venv
# ============================================================
echo "[5/9] Installing Python 3.11..."
sudo apt install -y software-properties-common
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
python3.11 --version
pip3 --version

# ============================================================
# 6. MYSQL SERVER 8.0
# ============================================================
echo "[6/9] Installing MySQL Server 8.0..."
sudo apt install -y mysql-server
sudo systemctl start mysql
sudo systemctl enable mysql
mysql --version

echo ""
echo "  ⚠️  IMPORTANT: Run these commands to secure MySQL:"
echo "  sudo mysql_secure_installation"
echo ""
echo "  Then create the N2D database user:"
echo "  sudo mysql -e \"CREATE USER 'n2d_user'@'localhost' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';\""
echo "  sudo mysql -e \"CREATE DATABASE N2D CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\""
echo "  sudo mysql -e \"GRANT ALL PRIVILEGES ON N2D.* TO 'n2d_user'@'localhost';\""
echo "  sudo mysql -e \"FLUSH PRIVILEGES;\""
echo ""

# ============================================================
# 7. NGINX — Reverse Proxy + Static File Server
# ============================================================
echo "[7/9] Installing Nginx..."
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
nginx -v

# ============================================================
# 8. CERTBOT — Free SSL (Let's Encrypt)
# ============================================================
echo "[8/9] Installing Certbot for SSL..."
sudo apt install -y certbot python3-certbot-nginx

echo ""
echo "  ⚠️  After DNS is pointed to this server, run:"
echo "  sudo certbot --nginx -d yourdomain.com"
echo ""

# ============================================================
# 9. ADDITIONAL UTILITIES
# ============================================================
echo "[9/9] Installing additional utilities..."
sudo apt install -y curl wget unzip htop net-tools ufw

# ============================================================
# FIREWALL (UFW)
# ============================================================
echo "Configuring firewall..."
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'   # ports 80 + 443
sudo ufw allow 5000/tcp       # Node backend (internal, can remove after Nginx proxy)
sudo ufw allow 8000/tcp       # Python bot (internal, can remove after Nginx proxy)
sudo ufw --force enable
sudo ufw status

echo ""
echo "========================================"
echo "  ✅ All tools installed successfully!"
echo "========================================"
echo ""
echo "  INSTALLED VERSIONS:"
echo "  ─────────────────────────────────"
echo "  Git:     $(git --version)"
echo "  Node.js: $(node --version)"
echo "  npm:     $(npm --version)"
echo "  PM2:     $(pm2 --version)"
echo "  Python:  $(python3.11 --version 2>&1)"
echo "  MySQL:   $(mysql --version)"
echo "  Nginx:   $(nginx -v 2>&1)"
echo "  Certbot: $(certbot --version 2>&1)"
echo "  ─────────────────────────────────"
echo ""
echo "  NEXT STEPS:"
echo "  1. Secure MySQL:  sudo mysql_secure_installation"
echo "  2. Create DB:     mysql < docs/AWS/schema_live_full.sql"
echo "  3. Import data:   mysql < docs/AWS/full_data_backup.sql"
echo "  4. Setup project: bash docs/AWS/deploy_n2d.sh"
echo ""
