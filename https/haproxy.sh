#!/bin/bash

# Proxies https://wstd.dev:4001 to http://localhost:4002
# Used for debugging when HTTPS is required

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PEM_PATH="$SCRIPT_DIR/haproxy.pem"
TMP_CFG=$(mktemp /tmp/haproxy.XXXXXX)

echo $TMP_CFG

cat <<EOF > "$TMP_CFG"
frontend proxy-https
  bind *:4001 ssl crt ${PEM_PATH} alpn h2,http/1.1
  default_backend proxy

backend proxy
  balance roundrobin
  mode http
  http-request set-header X-Forwarded-Host %[req.hdr(Host)]
  server  rgw1 localhost:4002 check
EOF

exec haproxy -f "$TMP_CFG" -db
