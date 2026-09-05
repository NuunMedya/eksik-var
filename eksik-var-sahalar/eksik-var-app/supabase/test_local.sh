#!/usr/bin/env bash
# Yerel güvenlik testi: temiz veritabanı → auth saplaması → setup → iller → testler
set -euo pipefail
cd "$(dirname "$0")"
DB=eksikvar_test
run() { su postgres -c "psql -q -v ON_ERROR_STOP=1 -d $DB -f '$PWD/$1'"; }
su postgres -c "dropdb --if-exists $DB && createdb $DB"
run test/auth_stub.sql
run setup.sql 2>&1 | grep -v "skipping" || true
run setup.sql > /dev/null 2>&1 && echo "✓ setup.sql ikinci kez de sorunsuz (yeniden çalıştırılabilir)"
run seed_iller.sql
run test/guvenlik_testleri.sql 2>&1 | sed 's/^psql:.*NOTICE:  //'
