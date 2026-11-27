import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _ortak import *
# Anket oyu: uygulamadaki api.vote() ile aynı istek dizisi (tek seçimde önce eski oy silinir, sonra eklenir).
# Eski upsert(onConflict "poll_id,user_id") poll_votes'ta tekil kısıt olmadığı için 42P10 veriyordu.

print("1) Geçici hesaplar + birebir sohbet")
aT, aId = kayit(None, "Test Anketçi", "ank")
bT, bId = kayit(None, "Test Seçmen", "sec")
s, c = req("POST", "/rest/v1/conversations", {"type": "birebir", "created_by": aId}, aT, "return=representation")
check(f"sohbet açıldı ({s})", s == 201)
if s != 201: print(c); sys.exit(1)
conv = c[0]["id"]
s, _ = req("POST", "/rest/v1/conversation_members", [{"conversation_id": conv, "user_id": aId}, {"conversation_id": conv, "user_id": bId}], aT, "return=minimal")
check(f"üyeler eklendi ({s})", s in (201, 204))

print("2) Anket açılır")
s, poll = req("POST", "/rest/v1/rpc/create_poll", {"p_conversation": conv, "p_question": "E2E hangi gün?", "p_options": [{"id": "a", "text": "Cmt"}, {"id": "b", "text": "Paz"}], "p_multiple": False}, aT)
check(f"create_poll ({s})", s == 200 and bool(poll))

def oyla(tok, uid, opt, multiple=False):
    if not multiple:
        req("DELETE", f"/rest/v1/poll_votes?poll_id=eq.{poll}&user_id=eq.{uid}&option_id=neq.{opt}", None, tok, "return=minimal")
    return req("POST", "/rest/v1/poll_votes", {"poll_id": poll, "user_id": uid, "option_id": opt}, tok, "return=minimal")[0]
def oylarim(tok, uid):
    s, d = req("GET", f"/rest/v1/poll_votes?poll_id=eq.{poll}&user_id=eq.{uid}&select=option_id", None, tok)
    return sorted(x["option_id"] for x in (d or []))

print("3) Oy ver, fikir değiştir")
check("ilk oy kaydedildi", oyla(bT, bId, "a") == 201 and oylarim(bT, bId) == ["a"])
check("fikir değişince tek oy kalır (a → b)", oyla(bT, bId, "b") in (201, 409) and oylarim(bT, bId) == ["b"])
check("aynı seçeneğe tekrar dokunmak çift kayıt yapmaz", oyla(bT, bId, "b") in (201, 409) and oylarim(bT, bId) == ["b"])
check("anketi açan da oy verebilir", oyla(aT, aId, "a") == 201 and oylarim(aT, aId) == ["a"])
s, _ = req("DELETE", f"/rest/v1/poll_votes?poll_id=eq.{poll}&user_id=eq.{bId}&option_id=eq.b", None, bT, "return=minimal")
check("oy geri alınabilir", s == 204 and oylarim(bT, bId) == [])
s, _ = req("POST", "/rest/v1/poll_votes", {"poll_id": poll, "user_id": aId, "option_id": "b"}, bT, "return=minimal")
check("başkası adına oy verilemez", s not in (200, 201, 204))

print("4) Temizlik")
req("POST", "/rest/v1/rpc/delete_own_account", {}, aT)
req("POST", "/rest/v1/rpc/delete_own_account", {}, bT)
bitir("Anket oyu")
