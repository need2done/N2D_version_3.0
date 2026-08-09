#!/bin/bash
# ==========================================================
# Need2Done — Automated Log Management & Archival Script
# ==========================================================
# Root Log Directory: /need2done/app/Need2Done/logs
# Service Folders   : /need2done/app/Need2Done/logs/backend
#                     /need2done/app/Need2Done/logs/bot
#                     /need2done/app/Need2Done/logs/nginx
# Archive Folder    : /need2done/app/Need2Done/logs/archive
#
# Retention Policy  : Logs older than 15 days are compressed
#                     into a .zip file and moved to archive/
# ==========================================================

LOG_ROOT="/need2done/app/Need2Done/logs"
BACKEND_LOG_DIR="$LOG_ROOT/backend"
BOT_LOG_DIR="$LOG_ROOT/bot"
NGINX_LOG_DIR="$LOG_ROOT/nginx"
ARCHIVE_DIR="$LOG_ROOT/archive"
RETENTION_DAYS=15

# Ensure directory structure exists with appropriate permissions
mkdir -p "$BACKEND_LOG_DIR" "$BOT_LOG_DIR" "$NGINX_LOG_DIR" "$ARCHIVE_DIR"
chmod -R 777 "$LOG_ROOT" 2>/dev/null || true

TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=========================================="
echo "Starting Need2Done Log Archival: $(date)"
echo "=========================================="

# 1. Rotate current active logs if non-empty
rotate_active_log() {
    local target_dir="$1"
    local log_name="$2"
    local active_file="$target_dir/$log_name.log"
    local dated_file="$target_dir/${log_name}_${TODAY}.log"

    if [ -f "$active_file" ] && [ -s "$active_file" ]; then
        echo "Rotating active log: $active_file -> $dated_file"
        cp "$active_file" "$dated_file"
        > "$active_file"
    fi
}

rotate_active_log "$BACKEND_LOG_DIR" "backend"
rotate_active_log "$BACKEND_LOG_DIR" "backend_error"
rotate_active_log "$BOT_LOG_DIR" "bot"
rotate_active_log "$BOT_LOG_DIR" "bot_error"

# 2. Copy current Nginx logs if present
if [ -f /var/log/nginx/need2done_access.log ]; then
    cp /var/log/nginx/need2done_access.log "$NGINX_LOG_DIR/nginx_access_${TODAY}.log"
fi
if [ -f /var/log/nginx/need2done_error.log ]; then
    cp /var/log/nginx/need2done_error.log "$NGINX_LOG_DIR/nginx_error_${TODAY}.log"
fi

# 3. Find files older than 15 days across service folders
OLD_LOGS=()
while IFS= read -r -d '' file; do
    OLD_LOGS+=("$file")
done < <(find "$BACKEND_LOG_DIR" "$BOT_LOG_DIR" "$NGINX_LOG_DIR" -type f -name "*.log" -mtime +$RETENTION_DAYS -print0 2>/dev/null)

if [ ${#OLD_LOGS[@]} -eq 0 ]; then
    echo "No logs older than $RETENTION_DAYS days found."
else
    ARCHIVE_FILE="$ARCHIVE_DIR/logs_archive_${TIMESTAMP}.zip"
    echo "Found ${#OLD_LOGS[@]} log file(s) older than $RETENTION_DAYS days. Archiving to $ARCHIVE_FILE..."
    
    # Zip old logs
    zip -j "$ARCHIVE_FILE" "${OLD_LOGS[@]}"
    
    if [ $? -eq 0 ] && [ -f "$ARCHIVE_FILE" ]; then
        echo "Zip archive successfully created: $ARCHIVE_FILE"
        echo "Removing archived original log files..."
        for file in "${OLD_LOGS[@]}"; do
            rm -f "$file"
            echo "Deleted: $file"
        done
    else
        echo "❌ Error: Failed to create zip archive $ARCHIVE_FILE"
    fi
fi

echo "Log archival operation complete."
