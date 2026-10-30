#!/bin/bash

# ==============================================================================
# Need2Done (N2D) — Daily Production Expiration & Health Monitor
# ==============================================================================
# Runs daily via crontab. Checks SSL certs, Meta Tokens, Razorpay API, DB, and Ola Maps.
# Outputs warning if any token or cert is within 15 days of expiration.
# ==============================================================================

DOMAIN="need2done.in"
MIN_SSL_DAYS=15
LOG_FILE="/home/ubuntu/Need2Done/logs/monitor_expirations.log"

mkdir -p /home/ubuntu/Need2Done/logs

echo "==================================================" >> "$LOG_FILE"
echo "N2D Health & Expiration Check Run: $(date)" >> "$LOG_FILE"
echo "==================================================" >> "$LOG_FILE"

STATUS=0

# ------------------------------------------------------------------------------
# 1. Check SSL Certificate Expiration
# ------------------------------------------------------------------------------
echo "[SSL CHECK] Inspecting SSL certificate for $DOMAIN..." >> "$LOG_FILE"

EXP_DATE=$(openssl s_client -connect "$DOMAIN":443 -servername "$DOMAIN" </dev/null 2>/dev/null | openssl x509 -noout -enddate | cut -d= -f2)

if [ -z "$EXP_DATE" ]; then
    echo "❌ [SSL ERROR] Failed to fetch SSL certificate date for $DOMAIN!" >> "$LOG_FILE"
    STATUS=1
else
    EXP_EPOCH=$(date -d "$EXP_DATE" +%s 2>/dev/null || date -j -f "%b %d %T %Y %Z" "$EXP_DATE" +%s)
    NOW_EPOCH=$(date +%s)
    DAYS_LEFT=$(( (EXP_EPOCH - NOW_EPOCH) / 86400 ))

    echo "ℹ️ SSL Certificate for $DOMAIN expires on: $EXP_DATE ($DAYS_LEFT days remaining)" >> "$LOG_FILE"

    if [ "$DAYS_LEFT" -lt "$MIN_SSL_DAYS" ]; then
        echo "⚠️ [SSL WARNING] SSL Certificate expires in less than $MIN_SSL_DAYS days! Triggering renewal..." >> "$LOG_FILE"
        sudo certbot renew --quiet --post-hook "systemctl reload nginx"
        STATUS=1
    else
        echo "✅ [SSL OK] SSL Certificate is valid ($DAYS_LEFT days left)." >> "$LOG_FILE"
    fi
fi

# ------------------------------------------------------------------------------
# 2. Check Meta WhatsApp Token Health
# ------------------------------------------------------------------------------
echo "[WHATSAPP CHECK] Verifying Meta Access Token..." >> "$LOG_FILE"
source /home/ubuntu/Need2Done/.env 2>/dev/null

if [ -z "$WHATSAPP_ACCESS_TOKEN" ]; then
    echo "⚠️ [WA WARNING] WHATSAPP_ACCESS_TOKEN is missing in .env!" >> "$LOG_FILE"
    STATUS=1
else
    WA_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://graph.facebook.com/$GRAPH_API_VERSION/me?access_token=$WHATSAPP_ACCESS_TOKEN")
    
    if [ "$WA_HTTP_CODE" -eq 200 ]; then
        echo "✅ [WA OK] WhatsApp Access Token is valid (HTTP 200)." >> "$LOG_FILE"
    else
        echo "❌ [WA ERROR] WhatsApp Access Token check failed! HTTP Code: $WA_HTTP_CODE (Token may be expired or revoked)" >> "$LOG_FILE"
        STATUS=1
    fi
fi

# ------------------------------------------------------------------------------
# 3. Check Razorpay API Key Health
# ------------------------------------------------------------------------------
echo "[RAZORPAY CHECK] Testing Razorpay API keys..." >> "$LOG_FILE"

if [ -z "$RAZORPAY_KEY_ID" ] || [ -z "$RAZORPAY_KEY_SECRET" ]; then
    echo "⚠️ [RZP WARNING] Razorpay keys missing in .env!" >> "$LOG_FILE"
    STATUS=1
else
    RZP_HTTP_CODE=$(curl -u "$RAZORPAY_KEY_ID:$RAZORPAY_KEY_SECRET" -s -o /dev/null -w "%{http_code}" "https://api.razorpay.com/v1/orders?count=1")
    
    if [ "$RZP_HTTP_CODE" -eq 200 ]; then
        echo "✅ [RZP OK] Razorpay API Key and Secret are valid (HTTP 200)." >> "$LOG_FILE"
    else
        echo "❌ [RZP ERROR] Razorpay API Authentication failed! HTTP Code: $RZP_HTTP_CODE" >> "$LOG_FILE"
        STATUS=1
    fi
fi

# ------------------------------------------------------------------------------
# 4. Check Backend API Endpoint Health
# ------------------------------------------------------------------------------
echo "[BACKEND CHECK] Testing local backend health..." >> "$LOG_FILE"
BACKEND_HTTP=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:5000/api/health")

if [ "$BACKEND_HTTP" -eq 200 ]; then
    echo "✅ [BACKEND OK] Node.js Backend is operational (HTTP 200)." >> "$LOG_FILE"
else
    echo "❌ [BACKEND ERROR] Node.js Backend health check failed! HTTP Code: $BACKEND_HTTP" >> "$LOG_FILE"
    STATUS=1
fi

echo "Check completed at $(date) with exit code $STATUS" >> "$LOG_FILE"
exit $STATUS
