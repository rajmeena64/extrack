#!/usr/bin/env bash
set -euo pipefail

DOMAIN="mqtt.entrack.in"
MQTT_USER="entrack_mqtt"
CERT_DIR="/etc/mosquitto/certs"
PASS_FILE="/etc/mosquitto/passwd"
TLS_CONF="/etc/mosquitto/conf.d/tls-${DOMAIN}.conf"
HOOK="/etc/letsencrypt/renewal-hooks/deploy/mosquitto-${DOMAIN}.sh"

if [ ! -f "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" ]; then
  echo "Certificate not found for ${DOMAIN}" >&2
  exit 1
fi

install -d -m 0750 -o root -g mosquitto "${CERT_DIR}"
install -m 0644 -o root -g mosquitto "/etc/letsencrypt/live/${DOMAIN}/chain.pem" "${CERT_DIR}/chain.pem"
install -m 0644 -o root -g mosquitto "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" "${CERT_DIR}/fullchain.pem"
install -m 0640 -o root -g mosquitto "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" "${CERT_DIR}/privkey.pem"

MQTT_PASS="$(openssl rand -base64 24 | tr -d '\n')"
mosquitto_passwd -b -c "${PASS_FILE}" "${MQTT_USER}" "${MQTT_PASS}"
chown root:mosquitto "${PASS_FILE}"
chmod 0640 "${PASS_FILE}"

cat > "${TLS_CONF}" <<CONF
per_listener_settings true

listener 1883 127.0.0.1
protocol mqtt
allow_anonymous true

listener 8883 0.0.0.0
protocol mqtt
cafile ${CERT_DIR}/chain.pem
certfile ${CERT_DIR}/fullchain.pem
keyfile ${CERT_DIR}/privkey.pem
allow_anonymous false
password_file ${PASS_FILE}
CONF

cat > "${HOOK}" <<HOOKSCRIPT
#!/bin/sh
set -eu
DOMAIN="${DOMAIN}"
CERT_DIR="${CERT_DIR}"
install -d -m 0750 -o root -g mosquitto "\${CERT_DIR}"
install -m 0644 -o root -g mosquitto "/etc/letsencrypt/live/\${DOMAIN}/chain.pem" "\${CERT_DIR}/chain.pem"
install -m 0644 -o root -g mosquitto "/etc/letsencrypt/live/\${DOMAIN}/fullchain.pem" "\${CERT_DIR}/fullchain.pem"
install -m 0640 -o root -g mosquitto "/etc/letsencrypt/live/\${DOMAIN}/privkey.pem" "\${CERT_DIR}/privkey.pem"
systemctl restart mosquitto
HOOKSCRIPT
chmod 0755 "${HOOK}"

systemctl restart mosquitto

if command -v netfilter-persistent >/dev/null 2>&1; then
  netfilter-persistent save >/dev/null 2>&1 || true
fi

echo "MQTT_HOST=${DOMAIN}"
echo "MQTT_PORT=8883"
echo "MQTT_USER=${MQTT_USER}"
echo "MQTT_PASSWORD=${MQTT_PASS}"
echo "CERT_FILE=${CERT_DIR}/fullchain.pem"
echo "KEY_FILE=${CERT_DIR}/privkey.pem"
systemctl is-active mosquitto
ss -ltnp | grep -E ':1883|:8883' || true
