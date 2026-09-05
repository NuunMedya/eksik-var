#!/bin/sh
set -e
DB=eksikvar_test
dropdb --if-exists $DB && createdb $DB
psql -d $DB -v ON_ERROR_STOP=1 -q -f supabase_mock.sql
psql -d $DB -v ON_ERROR_STOP=1 -q -f ../supabase_kurulum.sql
for t in test_supabase test_yoklama test_tekrar test_ilce test_hesap test_telefon test_yonetim test_bildirim test_mevki test_davet test_yedek test_rakip test_anket test_varmisin; do
  n=$(psql -d $DB -f $t.sql 2>&1 | grep -c '✓'); echo "$t: $n senaryo geçti"
done
