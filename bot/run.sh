#!/bin/bash
# Keepalive: запускает бота, если процесс не работает.
# Вызывается из cron каждую минуту.
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PIDFILE="$DIR/bot.pid"

if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE" 2>/dev/null)" 2>/dev/null; then
    exit 0  # уже работает
fi

cd "$DIR" || exit 1
nohup python3 -u bot.py >> bot.out 2>&1 &
echo $! > "$PIDFILE"
