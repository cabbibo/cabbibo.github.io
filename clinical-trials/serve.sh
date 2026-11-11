#!/usr/bin/env bash
# Clinical Trial Atlas - local static server
cd "$(dirname "$0")" || exit 1

PORT=8731
URL="http://127.0.0.1:$PORT"

echo
echo "  Clinical Trial Atlas"
echo "  $URL"
echo "  Ctrl+C to stop"
echo

if command -v open >/dev/null 2>&1; then (sleep 1 && open "$URL") &
elif command -v xdg-open >/dev/null 2>&1; then (sleep 1 && xdg-open "$URL") &
fi

if command -v python3 >/dev/null 2>&1; then
  exec python3 -m http.server "$PORT" --bind 127.0.0.1
elif command -v python >/dev/null 2>&1; then
  exec python -m http.server "$PORT" --bind 127.0.0.1
elif command -v npx >/dev/null 2>&1; then
  exec npx --yes http-server -p "$PORT" -a 127.0.0.1
else
  echo "  Need python3 or node to serve. You can also just open index.html directly."
  exit 1
fi
