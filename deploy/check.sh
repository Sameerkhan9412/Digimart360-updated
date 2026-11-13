#!/usr/bin/env bash
# Uptime check for cron (every 5 minutes). Emails or posts only when something is wrong.
#   */5 * * * *  cd /opt/digimart/deploy && ./check.sh
# Set ALERT_EMAIL (needs `mail`) and/or ALERT_WEBHOOK (e.g. a Slack or Discord incoming-webhook URL).
# Alerts repeat at most once an hour while the problem lasts.
set -uo pipefail
cd "$(dirname "$0")"
set -a; [ -f .env ] && . ./.env; set +a
STATE="${TMPDIR:-/tmp}/digimart-check.last"
problems=()

probe() { # name url
  curl -fsS -m 10 -o /dev/null "$2" || problems+=("$1 is not answering ($2)")
}
probe "Website" "https://${DOMAIN}/"
probe "API" "https://${DOMAIN}/api/v1/health"

# A container that has stopped or keeps restarting.
while read -r name state; do
  [ "$state" = "running" ] || problems+=("container $name is $state")
done < <(docker compose ps --format '{{.Service}} {{.State}}' | grep -v '^migrate ')

# Disk almost full (database, uploads and backups all live here).
used=$(df --output=pcent / | tail -1 | tr -dc '0-9')
[ "${used:-0}" -lt 85 ] || problems+=("disk is ${used}% full")

if [ ${#problems[@]} -eq 0 ]; then rm -f "$STATE"; exit 0; fi

now=$(date +%s)
if [ -f "$STATE" ] && [ $((now - $(cat "$STATE"))) -lt 3600 ]; then exit 1; fi
echo "$now" > "$STATE"

msg="DIGI MART 360 on ${DOMAIN}: $(printf '%s; ' "${problems[@]}")"
echo "$msg" >&2
[ -n "${ALERT_EMAIL:-}" ] && echo "$msg" | mail -s "DIGI MART 360 alert" "$ALERT_EMAIL"
[ -n "${ALERT_WEBHOOK:-}" ] && curl -fsS -m 10 -H 'Content-Type: application/json' -d "{\"text\":\"$msg\"}" "$ALERT_WEBHOOK" > /dev/null
exit 1
