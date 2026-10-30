#!/bin/bash
# ==========================================================
# Need2Done — 10-Minute Telegram System Status Report
# ==========================================================
# Runs every 10 minutes via Crontab on EC2

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

BOT_TOKEN="8858022808:AAGElImU1H8nEduYOreLeaDIqkkaV9wR9iQ"
CHAT_ID="-1004380066640"

TIME_STR=$(TZ="Asia/Kolkata" date "+%Y-%m-%d %H:%M:%S IST")

# Helper function
check_service() {
    local name="$1"
    local url="$2"
    local expected_codes="$3"

    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 "$url")

    if [[ "$expected_codes" =~ $http_code ]]; then
        echo "🟢 *${name}:* UP (${http_code})"
        return 0
    else
        echo "🔴 *${name}:* DOWN (${http_code})"
        return 1
    fi
}

TOTAL=0
PASSED=0

# Core Infrastructure
CHECK_WEB=$(check_service "🌐 Website & SSL" "https://need2done.in" "200 301 302")
[ $? -eq 0 ] && ((PASSED++)); ((TOTAL++))

CHECK_BACKEND=$(check_service "⚙️ Node.js Backend API" "http://127.0.0.1:5000/api/health" "200")
[ $? -eq 0 ] && ((PASSED++)); ((TOTAL++))

CHECK_DB=$(check_service "🗄️ MySQL Database" "http://127.0.0.1:5000/api/health/db" "200")
[ $? -eq 0 ] && ((PASSED++)); ((TOTAL++))

CHECK_BOT=$(check_service "🤖 Python WhatsApp Bot" "http://127.0.0.1:8000/health" "200")
[ $? -eq 0 ] && ((PASSED++)); ((TOTAL++))

# Fetch system metrics
SYS_JSON=$(curl -s "http://127.0.0.1:5000/api/health/system")
CPU=$(echo "$SYS_JSON" | grep -o '"cpu":[0-9]*' | cut -d: -f2)
MEM=$(echo "$SYS_JSON" | grep -o '"memory":[0-9.]*' | cut -d: -f2)
[ -z "$CPU" ] && CPU="N/A"
[ -z "$MEM" ] && MEM="N/A"

CHECK_SYS="🟢 *💻 Server Metrics:* CPU ${CPU}% | RAM ${MEM}%"
((PASSED++)); ((TOTAL++))

# Active Services
CHECK_HOME=$(check_service "🛠️ Home Services API" "http://127.0.0.1:5000/api/home-services/services" "200")
[ $? -eq 0 ] && ((PASSED++)); ((TOTAL++))

CHECK_CUSTOM=$(check_service "🔧 Custom Work API" "http://127.0.0.1:5000/api/custom-work/rate-card" "200")
[ $? -eq 0 ] && ((PASSED++)); ((TOTAL++))

CHECK_HELPERS=$(check_service "🛵 Helpers & Dispatch API" "http://127.0.0.1:5000/api/helpers" "401 200")
[ $? -eq 0 ] && ((PASSED++)); ((TOTAL++))

# External Gateways
CHECK_RAZORPAY=$(check_service "💳 Razorpay Gateway" "https://api.razorpay.com/" "200")
[ $? -eq 0 ] && ((PASSED++)); ((TOTAL++))

CHECK_META=$(check_service "💬 Meta WhatsApp API" "https://graph.facebook.com/" "400 200")
[ $? -eq 0 ] && ((PASSED++)); ((TOTAL++))

CHECK_OLA=$(check_service "🗺️ Ola Maps API" "https://api.olamaps.io/" "400 404 415 200")
[ $? -eq 0 ] && ((PASSED++)); ((TOTAL++))

# Overall status banner
if [ "$PASSED" -eq "$TOTAL" ]; then
    OVERALL="🟢 *ALL SYSTEMS OPERATIONAL* (${PASSED}/${TOTAL})"
else
    OVERALL="⚠️ *DEGRADED PERFORMANCE* (${PASSED}/${TOTAL} UP)"
fi

# Build Telegram Markdown Message
MESSAGE="📊 *Need2Done — 10-Min Status Report*
🕒 *Time:* ${TIME_STR}

*🏗️ Core Infrastructure:*
${CHECK_WEB}
${CHECK_BACKEND}
${CHECK_DB}
${CHECK_BOT}
${CHECK_SYS}

*🛠️ Active Services:*
${CHECK_HOME}
${CHECK_CUSTOM}
${CHECK_HELPERS}

*🔌 External Gateways:*
${CHECK_RAZORPAY}
${CHECK_META}
${CHECK_OLA}

📌 *Status:* ${OVERALL}"

# Send to Telegram and print response
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/sendMessage" \
    --data-urlencode "chat_id=${CHAT_ID}" \
    --data-urlencode "text=${MESSAGE}" \
    --data-urlencode "parse_mode=Markdown")

echo "[$(date)] Telegram Response: ${RESPONSE}"
