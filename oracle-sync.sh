#!/usr/bin/env bash
# Nightly Oracle PRODUCT_MASTER -> MongoDB sync.
# Runs the oracle_sync.py job inside the backend container.
# Scheduled via cron at 00:00 (see crontab). Invoke as:  bash /root/faiha-ecom/oracle-sync.sh
set -euo pipefail
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

cd /root/faiha-ecom
docker compose exec -T backend python oracle_sync.py
