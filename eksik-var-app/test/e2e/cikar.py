import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _ortak import *
# Organizatör kadrodan oyuncu çıkarır: uygulamadaki api.removeMember() ile aynı istekler.
# participants silinince tetikleyici grup üyeliğini de siler; ikinci silme boş dönse de işlem başarılıdır.

print("1) Geçici hesaplar + maç + kadroya giriş")
oT, oId = kayit(None, "Test Organizatör", "cik")
pT, pId = kayit(None, "Test Oyuncu", "cko")
s, d = req("POST", "/rest/v1/events", {"organizer_id": oId, "category_id": 1, "city_id": 6, "title": "E2E Çıkarma Testi", "venue_name": "Test Saha", "event_date": tarih(), "total_capacity": 10, "needed_count": 3, "price_per_person": 0, "skill_level": "farketmez", "kind": "oyuncu"}, oT, "return=representation")
check(f"maç açıldı ({s})", s == 201)
if s != 201: print(d); sys.exit(1)
ev = d[0]["id"]
s, d = req("POST", "/rest/v1/applications", {"event_id": ev, "applicant_id": pId, "message": "e2e"}, pT, "return=representation")
app = d[0]["id"] if s == 201 else None
req("PATCH", f"/rest/v1/applications?id=eq.{app}", {"organizer_approved": True}, oT, "return=minimal")
req("PATCH", f"/rest/v1/applications?id=eq.{app}", {"applicant_approved": True}, pT, "return=minimal")
s, g = req("GET", f"/rest/v1/conversations?event_id=eq.{ev}&type=eq.grup&select=id", None, oT)
conv = g[0]["id"] if s == 200 and g else None
check("grup sohbeti var", bool(conv))
s, m = req("GET", f"/rest/v1/conversation_members?conversation_id=eq.{conv}&user_id=eq.{pId}&select=user_id", None, oT)
check("oyuncu grupta", s == 200 and len(m or []) == 1)

print("2) Organizatör çıkarır")
s, a = req("DELETE", f"/rest/v1/participants?event_id=eq.{ev}&user_id=eq.{pId}&select=user_id", None, oT, "return=representation")
s2, b = req("DELETE", f"/rest/v1/conversation_members?conversation_id=eq.{conv}&user_id=eq.{pId}&select=user_id", None, oT, "return=representation")
check("katılımcı silindi (başarı sayılır)", s == 200 and len(a or []) == 1)
check("grup silmesi hatasız (tetikleyici zaten sildi)", s2 == 200)
s, m = req("GET", f"/rest/v1/conversation_members?conversation_id=eq.{conv}&user_id=eq.{pId}&select=user_id", None, oT)
check("oyuncu artık grupta değil", s == 200 and not m)

print("3) Yetkisiz çıkarma başarı sayılmaz")
s, a = req("DELETE", f"/rest/v1/participants?event_id=eq.{ev}&user_id=eq.{oId}&select=user_id", None, pT, "return=representation")
check("oyuncu organizatörü çıkaramaz (0 satır)", s in (200, 403) and not (isinstance(a, list) and a))

print("4) Temizlik")
req("DELETE", f"/rest/v1/events?id=eq.{ev}", None, oT, "return=minimal")
req("POST", "/rest/v1/rpc/delete_own_account", {}, oT)
req("POST", "/rest/v1/rpc/delete_own_account", {}, pT)
bitir("Kadrodan çıkarma")
