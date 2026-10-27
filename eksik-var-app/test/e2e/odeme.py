import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _ortak import *

print("1) Geçici hesaplar")
orgT, orgId = kayit(None,"Test Organizatör","org")
oyT, oyId   = kayit(None,"Test Oyuncu","oyn")
check("organizatör + oyuncu oturumu", bool(orgT and oyT))

print("2) Organizatör IBAN kaydeder")
s,d=req("POST","/rest/v1/payment_details",{"user_id":orgId,"iban":"TR330006100519786457841326","holder_name":"Test Organizatör"},orgT,"resolution=merge-duplicates,return=minimal")
check(f"payment_details upsert ({s})", s in (200,201,204))

print("3) Ücretli maç açılır")
s,d=req("POST","/rest/v1/events",{"organizer_id":orgId,"category_id":1,"city_id":6,"title":"E2E Ödeme Testi","venue_name":"Test Saha","event_date":tarih(),"total_capacity":10,"needed_count":3,"price_per_person":180,"skill_level":"farketmez","kind":"oyuncu"},orgT,"return=representation")
check(f"event insert ({s})", s==201)
if s!=201: print(d); sys.exit(1)
evId=d[0]["id"]

print("4) Oyuncu başvurur, çift onay")
s,d=req("POST","/rest/v1/applications",{"event_id":evId,"applicant_id":oyId,"message":"e2e"},oyT,"return=representation")
check(f"application insert ({s})", s==201)
appId=d[0]["id"] if s==201 else None
s,_=req("PATCH",f"/rest/v1/applications?id=eq.{appId}",{"organizer_approved":True},orgT,"return=minimal"); check(f"organizatör onayı ({s})", s==204)
s,_=req("PATCH",f"/rest/v1/applications?id=eq.{appId}",{"applicant_approved":True},oyT,"return=minimal"); check(f"oyuncu son onayı ({s})", s==204)
s,d=req("GET",f"/rest/v1/participants?event_id=eq.{evId}&user_id=eq.{oyId}&select=payment_status",None,oyT)
check("oyuncu katılımcı oldu, ödeme 'bekliyor'", s==200 and d and d[0]["payment_status"]=="bekliyor")

print("5) 'Payını öde' sayfası: organizatör IBAN'ını katılımcı görebiliyor")
s,d=req("POST","/rest/v1/rpc/organizer_iban",{"p_event":evId},oyT)
check("organizer_iban → IBAN + alıcı adı", s==200 and d and d[0]["iban"].startswith("TR33") and d[0]["holder"]=="Test Organizatör")
s,d=req("POST","/rest/v1/rpc/organizer_iban",{"p_event":evId},None)
check("katılımcı olmayan (anon) göremiyor", not (s==200 and d))

print("6) Dekontlu 'Ödedim'")
s,d=req("POST","/rest/v1/rpc/claim_payment_proof",{"p_event":evId,"p_url":"https://example.com/dekont.jpg"},oyT)
check(f"claim_payment_proof ({s})", s in (200,204))
s,d=req("GET",f"/rest/v1/v_event_payments?event_id=eq.{evId}&select=full_name,status,proof_url,amount",None,orgT)
row=(d or [{}])[0] if s==200 else {}
check("organizatör listede 'odedim' + dekont + 180₺ görüyor", row.get("status")=="odedim" and row.get("proof_url","").endswith("dekont.jpg") and float(row.get("amount",0))==180)

print("7) Organizatör onaylar")
s,d=req("POST","/rest/v1/rpc/confirm_payment",{"p_event":evId,"p_user":oyId,"p_status":"odendi"},orgT)
s2,d2=req("GET",f"/rest/v1/v_event_payments?event_id=eq.{evId}&select=status",None,oyT)
check("durum 'odendi'", s2==200 and d2 and d2[0]["status"]=="odendi")

print("8) Temizlik")
s,_=req("DELETE",f"/rest/v1/events?id=eq.{evId}",None,orgT,"return=minimal"); check(f"maç silindi ({s})", s==204)
for tk,nm in ((oyT,"oyuncu"),(orgT,"organizatör")):
    s,_=req("POST","/rest/v1/rpc/delete_own_account",{},tk); check(f"{nm} hesabı silindi ({s})", s in (200,204))
bitir("Kolay ödeme")
