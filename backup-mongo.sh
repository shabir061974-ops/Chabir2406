#!/usr/bin/env bash
# Nightly backup of the self-hosted MongoDB (faiha DB) AND product images running in Docker on the VPS.
# Streams a gzipped mongodump archive + a tarball of the uploads/ folder to /root/mongo-backups (keeps the last 14).
# Scheduled via cron (see crontab). Restore with:
#   MongoDB : docker compose exec -T mongo sh -c 'mongorestore --uri=mongodb://localhost:27017 --gzip --archive --drop' < faiha-BACKUP.gz
#   Images  : tar -xzf uploads-BACKUP.tgz -C /root/faiha-ecom      # restores /root/faiha-ecom/uploads/
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

BACKUP_DIR="/root/mongo-backups"
KEEP=14
STACK_DIR="/root/faiha-ecom"
UPLOADS_DIR="$STACK_DIR/uploads"
TS="$(date +%F_%H%M)"

mkdir -p "$BACKUP_DIR"
cd "$STACK_DIR"

# --- MongoDB backup ---------------------------------------------------------
# Stream the archive from the mongo container straight to a host file.
docker compose exec -T mongo mongodump --uri="mongodb://localhost:27017" --db=faiha --gzip --archive > "$BACKUP_DIR/faiha-$TS.gz"

# Rotate: keep only the newest $KEEP mongo backups locally.
ls -1t "$BACKUP_DIR"/faiha-*.gz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f

echo "$(date -Is)  mongo backup OK -> $BACKUP_DIR/faiha-$TS.gz ($(du -h "$BACKUP_DIR/faiha-$TS.gz" | cut -f1))"

# --- Product images (uploads/) backup --------------------------------------
if [ -d "$UPLOADS_DIR" ]; then
  tar -czf "$BACKUP_DIR/uploads-$TS.tgz" -C "$STACK_DIR" uploads
  # Rotate: keep only the newest $KEEP uploads backups locally.
  ls -1t "$BACKUP_DIR"/uploads-*.tgz 2>/dev/null | tail -n +$((KEEP + 1)) | xargs -r rm -f
  echo "$(date -Is)  uploads backup OK -> $BACKUP_DIR/uploads-$TS.tgz ($(du -h "$BACKUP_DIR/uploads-$TS.tgz" | cut -f1))"
else
  echo "$(date -Is)  uploads backup SKIPPED (no $UPLOADS_DIR yet)"
fi

# --- Record status for the admin "last backup" indicator -------------------
docker compose exec -T mongo mongosh faiha --quiet --eval \
  "db.backup_state.updateOne({_id:'last'},{\$set:{_id:'last',trigger:'nightly',at:'$(date -Is)',db_file:'faiha-$TS.gz',uploads_file:'uploads-$TS.tgz'}},{upsert:true})" || true

# --- Off-site copy to Google Drive via rclone (only if configured) ---------
# Uploads into gdrive:Backup/{mongo,uploads} and keeps the last 30 days off-site.
if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -q '^gdrive:'; then
  # MongoDB dump -> gdrive:Backup/mongo
  if rclone copyto "$BACKUP_DIR/faiha-$TS.gz" "gdrive:Backup/mongo/faiha-$TS.gz"; then
    rclone delete "gdrive:Backup/mongo" --min-age 30d || true
    echo "$(date -Is)  off-site OK -> gdrive:Backup/mongo/faiha-$TS.gz"
  else
    echo "$(date -Is)  off-site FAILED (mongo upload error)" >&2
  fi
  # Product images -> gdrive:Backup/uploads
  if [ -f "$BACKUP_DIR/uploads-$TS.tgz" ]; then
    if rclone copyto "$BACKUP_DIR/uploads-$TS.tgz" "gdrive:Backup/uploads/uploads-$TS.tgz"; then
      rclone delete "gdrive:Backup/uploads" --min-age 30d || true
      echo "$(date -Is)  off-site OK -> gdrive:Backup/uploads/uploads-$TS.tgz"
    else
      echo "$(date -Is)  off-site FAILED (uploads upload error)" >&2
    fi
  fi
else
  echo "$(date -Is)  off-site SKIPPED (rclone/gdrive remote not configured)"
fi
