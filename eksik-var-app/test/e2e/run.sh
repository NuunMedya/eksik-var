#!/usr/bin/env bash
# Tüm uçtan uca testleri koşar; biri bile kalırsa 1 döner.
set -u; cd "$(dirname "$0")"; rc=0
for f in odeme.py bolustur.py alarm.py gorev.py; do echo "━━━ $f ━━━"; python3 -I "$f" || rc=1; done
exit $rc
