#!/bin/bash

# Default values
MONGO_URI=${MONGODB_URI:-"mongodb://localhost:27017/synctalk"}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_PATH="$BACKUP_DIR/synctalk_backup_$TIMESTAMP"

echo "🚀 Starting SyncTalk MongoDB Backup"
echo "==================================="

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Run mongodump
echo "📦 Backing up database to $BACKUP_PATH..."
mongodump --uri="$MONGO_URI" --out="$BACKUP_PATH"

if [ $? -eq 0 ]; then
  echo "✅ Backup successful!"
  
  # Compress the backup
  tar -czf "${BACKUP_PATH}.tar.gz" -C "$BACKUP_DIR" "synctalk_backup_$TIMESTAMP"
  rm -rf "$BACKUP_PATH"
  echo "🗜️  Compressed to ${BACKUP_PATH}.tar.gz"
  
  # Keep only last 7 backups (optional)
  echo "🧹 Cleaning up old backups (keeping last 7 days)..."
  find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -exec rm {} \;
else
  echo "❌ Backup failed!"
  exit 1
fi

echo "==================================="
echo "🎉 Done."
