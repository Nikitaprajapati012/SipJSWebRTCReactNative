#!/bin/sh

# Forward API and Metro ports for *each* connected Android target. This is a
# fallback for a physical phone on a guest/isolated Wi-Fi network. The app
# still prefers its dynamically generated LAN IP; 127.0.0.1 works only because
# this command creates a per-device tunnel back to the development computer.

if ! command -v adb >/dev/null 2>&1; then
  echo "adb not found; skipping Android port forwarding." >&2
  exit 0
fi

if ! adb devices >/dev/null 2>&1; then
  echo "adb is unavailable; skipping Android port forwarding (LAN API access remains enabled)." >&2
  exit 0
fi

adb devices |
  awk 'NR > 1 && $2 == "device" { print $1 }' |
  while IFS= read -r serial; do
    [ -n "$serial" ] || continue
    if adb -s "$serial" reverse tcp:3000 tcp:3000 &&
      adb -s "$serial" reverse tcp:8081 tcp:8081; then
      echo "Forwarded API and Metro ports for $serial"
    else
      echo "Could not forward ports for $serial" >&2
    fi
  done
