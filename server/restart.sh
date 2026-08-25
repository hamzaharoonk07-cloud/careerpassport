#!/usr/bin/env bash
# Dev helper: hard-restart the API on Windows, where pkill does not reach node.
PID=$(netstat -ano 2>/dev/null | grep -E "^ +TCP +0\.0\.0\.0:5000 " | awk '{print $5}' | head -1)
[ -n "$PID" ] && taskkill //PID "$PID" //F > /dev/null 2>&1
sleep 2
(node src/index.js > /tmp/ps-api.log 2>&1 &)
for i in $(seq 1 30); do
  sleep 2
  grep -qE "listening on|Error" /tmp/ps-api.log 2>/dev/null && break
done
grep -E "listening on|Error" /tmp/ps-api.log | tr -d '\r'
