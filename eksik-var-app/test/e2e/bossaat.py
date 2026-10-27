import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _ortak import *

print("1) Hesaplar: onaysız işletme + organizatör")
iT,iId=kayit(None,"Saha İşletme","sisl"); oT,oId=kayit(None,"Saha Org","sorg")
req("PATCH",f"/rest/v1/users?id=eq.{iId}",{"hesap_turu":"isletme"},iT,"return=minimal")
slot={"isletme_id":iId,"city_id":6,"category_id":1,"venue_name":"Test Saha","starts_at":tarih(),"sure_dk":60,"toplam_ucret":1500,"not_":"test"}

print("2) Onaysız işletme boş saat ilanı veremez; oyuncu hiç veremez")
s,r=req("POST","/rest/v1/bos_saatler",slot,iT,"return=representation")
check(f"onaysız işletme reddedildi ({s})", s in (401,403))
s,r=req("POST","/rest/v1/bos_saatler",{**slot,"isletme_id":oId},oT,"return=representation")
check(f"oyuncu reddedildi ({s})", s in (401,403))

print("3) Okuma: anon public_slots çalışır, authenticated liste çalışır")
s,r=req("POST","/rest/v1/rpc/public_slots",{"p_city":6})
check(f"public_slots (anon) {s}", s==200 and isinstance(r,list))
s,r=req("GET","/rest/v1/bos_saatler?select=id&durum=eq.acik&limit=5",None,oT)
check(f"bos_saatler okunuyor ({s})", s==200)

print("4) bos_saat_al: olmayan saat / başkasının maçı hatası")
s,ev=req("POST","/rest/v1/events",{"organizer_id":oId,"category_id":1,"city_id":6,"title":"Boş Saat Maçı","venue_name":"Test Saha","event_date":tarih(),"total_capacity":10,"needed_count":2,"price_per_person":100,"skill_level":"farketmez","kind":"oyuncu"},oT,"return=representation")
evId=ev[0]["id"]
s,r=req("POST","/rest/v1/rpc/bos_saat_al",{"p_id":999999999,"p_event":evId},oT)
check(f"olmayan saat → hata ({s})", s>=400 and "bulunamadı" in str(r))
s,r=req("POST","/rest/v1/rpc/bos_saat_al",{"p_id":999999999,"p_event":evId},iT)
check(f"başkası maçı bağlayamaz ({s})", s>=400)

print("5) Temizlik")
req("DELETE",f"/rest/v1/events?id=eq.{evId}",None,oT,"return=minimal")
for tk in (iT,oT): req("POST","/rest/v1/rpc/delete_own_account",{},tk)
bitir("Boş saat ilanı")
