#!/bin/bash
# ==========================================================
# Need2Done — Automated Log & Database Archival Script
# ==========================================================
# Root Log Directory: /need2done/app/Need2Done/logs
# Service Folders   : /need2done/app/Need2Done/logs/backend
#                     /need2done/app/Need2Done/logs/bot
#                     /need2done/app/Need2Done/logs/nginx
#                     /need2done/app/Need2Done/logs/db
# Archive Folder    : /need2done/app/Need2Done/logs/archive
#
# Retention Policy  : Logs and DB backups older than 15 days
#                     are compressed into a .zip file and moved
#                     to archive/
# ==========================================================

LOG_ROOT="/need2done/app/Need2Done/logs"
BACKEND_LOG_DIR="$LOG_ROOT/backend"
BOT_LOG_DIR="$LOG_ROOT/bot"
NGINX_LOG_DIR="$LOG_ROOT/nginx"
DB_LOG_DIR="$LOG_ROOT/db"
ARCHIVE_DIR="$LOG_ROOT/archive"
RETENTION_DAYS=15

# Ensure directory structure exists with appropriate permissions
mkdir -p "$BACKEND_LOG_DIR" "$BOT_LOG_DIR" "$NGINX_LOG_DIR" "$DB_LOG_DIR" "$ARCHIVE_DIR"
chmod -R 777 "$LOG_ROOT" 2>/dev/null || true

TODAY=$(date +%Y-%m-%d)
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "=========================================="
echo "Starting Need2Done Log & DB Archival: $(date)"
echo "=========================================="

# ----------------------------------------------------------
# 1. Rotate active service logs
# ----------------------------------------------------------
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

# ----------------------------------------------------------
# 2. Sync Nginx logs
# ----------------------------------------------------------
if [ -f /need2done/app/Need2Done/logs/nginx/access.log ]; then
    rotate_active_log "$NGINX_LOG_DIR" "access"
fi
if [ -f /need2done/app/Need2Done/logs/nginx/error.log ]; then
    rotate_active_log "$NGINX_LOG_DIR" "error"
fi

if [ -f /var/log/nginx/need2done_access.log ]; then
    cp /var/log/nginx/need2done_access.log "$NGINX_LOG_DIR/nginx_access_${TODAY}.log"
fi
if [ -f /var/log/nginx/need2done_error.log ]; then
    cp /var/log/nginx/need2done_error.log "$NGINX_LOG_DIR/nginx_error_${TODAY}.log"
fi

# ----------------------------------------------------------
# 3. Database Dump & DB Log Management
# ----------------------------------------------------------
echo "Performing daily MySQL database dump..."
ENV_FILE="/need2done/app/Need2Done/.env"

if [ -f "$ENV_FILE" ]; then
    DB_USER=$(grep -i '^DB_USER=' "$ENV_FILE" | cut -d '=' -f2 | sed -e 's/[\r"'\'']//g')
    DB_PASS=$(grep -i '^DB_PASSWORD=' "$ENV_FILE" | cut -d '=' -f2 | sed -e 's/[\r"'\'']//g')
    DB_NAME=$(grep -i '^DB_NAME=' "$ENV_FILE" | cut -d '=' -f2 | sed -e 's/[\r"'\'']//g')
    DB_HOST=$(grep -i '^DB_HOST=' "$ENV_FILE" | cut -d '=' -f2 | sed -e 's/[\r"'\'']//g')
fi

DB_USER=${DB_USER:-n2d_user}
DB_PASS=${DB_PASS:-N2DB@2026}
DB_NAME=${DB_NAME:-N2D}
DB_HOST=${DB_HOST:-localhost}

DB_DUMP_FILE="$DB_LOG_DIR/need2done_db_${TODAY}.sql.gz"

if mysqldump -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASS" --no-tablespaces --single-transaction --quick "$DB_NAME" 2>/dev/null | gzip -9 > "$DB_DUMP_FILE"; then
    echo "✓ Database backup created successfully: $DB_DUMP_FILE ($(du -h "$DB_DUMP_FILE" | cut -f1))"
else
    echo "⚠️ Warning: Failed to dump database directly, trying root access..."
    mysqldump --no-tablespaces --single-transaction --quick "$DB_NAME" 2>/dev/null | gzip -9 > "$DB_DUMP_FILE" || echo "❌ Error: DB backup failed."
fi

# Copy MySQL System logs into db/ folder
if [ -f /var/log/mysql/error.log ]; then
    cp /var/log/mysql/error.log "$DB_LOG_DIR/mysql_error_${TODAY}.log"
fi
if [ -f /var/log/mysql/mysql-slow.log ]; then
    cp /var/log/mysql/mysql-slow.log "$DB_LOG_DIR/mysql_slow_${TODAY}.log"
fi

# ----------------------------------------------------------
# 4. Find files older than 15 days across all service log folders
# ----------------------------------------------------------
OLD_FILES=()
while IFS= read -r -d '' file; do
    OLD_FILES+=("$file")
done < <(find "$BACKEND_LOG_DIR" "$BOT_LOG_DIR" "$NGINX_LOG_DIR" "$DB_LOG_DIR" -type f \( -name "*.log" -o -name "*.sql.gz" \) -mtime +$RETENTION_DAYS -print0 2>/dev/null)

if [ ${#OLD_FILES[@]} -eq 0 ]; then
    echo "No log files or DB dumps older than $RETENTION_DAYS days found."
else
    ARCHIVE_FILE="$ARCHIVE_DIR/archive_${TIMESTAMP}.zip"
    echo "Found ${#OLD_FILES[@]} file(s) older than $RETENTION_DAYS days. Archiving to $ARCHIVE_FILE..."
    
    # Zip old logs & DB dumps
    zip -j "$ARCHIVE_FILE" "${OLD_FILES[@]}"
    
    if [ $? -eq 0 ] && [ -f "$ARCHIVE_FILE" ]; then
        echo "Zip archive successfully created: $ARCHIVE_FILE"
        echo "Removing archived original log/dump files..."
        for file in "${OLD_FILES[@]}"; do
            rm -f "$file"
            echo "Deleted: $file"
        done
    else
        echo "❌ Error: Failed to create zip archive $ARCHIVE_FILE"
    fi
fi

# Fix permissions
chmod -R 777 "$LOG_ROOT" 2>/dev/null || true

echo "=========================================="
echo "Log & DB archival operation complete."
echo "=========================================="
