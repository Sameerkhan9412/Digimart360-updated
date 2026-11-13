#!/usr/bin/env bash
# Nightly backup of the database and uploaded photos. Run from this folder, e.g. via cron:
#   15 2 * * *  cd /opt/digimart/deploy && ./backup.sh >> backup.log 2>&1
# Keeps 14 days. Copy /opt/digimart/backups off the server too (a backup on the same disk is not a backup).
set -euo pipefail
cd "$(dirname "$0")"
OUT="${BACKUP_DIR:-../backups}"
STAMP="$(date +%Y%m%d-%H%M%S)"
mkdir -p "$OUT"

docker compose exec -T db pg_dump -U digimart -d digimart360 --no-owner | gzip > "$OUT/db-$STAMP.sql.gz"
docker compose exec -T api tar -C /data -czf - uploads > "$OUT/uploads-$STAMP.tar.gz"

find "$OUT" -type f \( -name 'db-*.sql.gz' -o -name 'uploads-*.tar.gz' \) -mtime +14 -delete
echo "$(date -Is) backup ok: $OUT/db-$STAMP.sql.gz"

# Restore:
#   gunzip -c ../backups/db-<stamp>.sql.gz | docker compose exec -T db psql -U digimart -d digimart360
#   docker compose exec -T api tar -C /data -xzf - < ../backups/uploads-<stamp>.tar.gz
