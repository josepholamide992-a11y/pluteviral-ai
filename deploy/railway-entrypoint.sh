#!/bin/sh
set -eu

# The complete TOML is entered as a Railway secret, never checked into Git.
python3 - <<'PY'
import base64
import os
import pathlib
import sys
import tomllib

value = os.environ.get('PLUTEVIRAL_MPT_CONFIG_B64', '')
if not value:
    sys.exit('Missing PLUTEVIRAL_MPT_CONFIG_B64; refusing to start without authenticated configuration')
try:
    raw = base64.b64decode(value, validate=True)
    settings = tomllib.loads(raw.decode('utf-8'))
except (ValueError, UnicodeError) as exc:
    sys.exit('Invalid base64 TOML configuration: ' + type(exc).__name__)

api_key = settings.get('app', {}).get('api_key')
if not isinstance(api_key, str) or len(api_key) < 24:
    sys.exit('Configure [app] api_key to a randomly generated value at least 24 characters long')

if settings.get('listen_host') != '0.0.0.0':
    sys.exit('Configure listen_host = "0.0.0.0" for the Railway service')

port = settings.get('listen_port')
if not isinstance(port, int) or port != 8080:
    sys.exit('Configure listen_port = 8080 for this deployment')

path = pathlib.Path('/MoneyPrinterTurbo/config.toml')
path.write_bytes(raw)
path.chmod(0o600)
print('PluteViral: private MoneyPrinterTurbo configuration loaded successfully')
PY

exec python3 main.py
