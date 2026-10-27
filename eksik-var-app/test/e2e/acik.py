import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _ortak import *

print("1) Organizatör ilan açar (açıklamada telefon var — dışarı sızmamalı)")
oT,oId=kayit(None,"Açık Sayfa Org","aorg")
s,ev=req("POST","/rest/v1/events",{"organizer_id":oId,"category_id":1,"city_id":6,"title":"Açık Sayfa Testi","venue_name":"Yıldız Halı Saha, Çankaya","description":"Ara: 0555 111 22 33","event_date":tarih(),"total_capacity":10,"needed_count":2,"needed_positions":{"kaleci":1},"price_per_person":120,"skill_level":"orta","kind":"oyuncu","gorev_hakem":True},oT,"return=representation")
check(f"ilan açıldı ({s})", s==201); evId=ev[0]["id"]

print("2) Giriş yapmadan (anon) maç sayfası verisi")
s,e=req("POST","/rest/v1/rpc/public_event",{"p_id":evId})
check(f"public_event cevap verdi ({s})", s==200 and e and e.get("id")==evId)
check("başlık, saha, ücret, eksik, hakem bayrağı var", e and e["title"]=="Açık Sayfa Testi" and e["price"]==120 and e["needed"]==2 and e["hakem"] is True and e["city"]=="Ankara")
check("organizatör adı kısaltılmış (Açık S.)", e and e["org"]=="Açık S.")
check("açıklama / telefon / organizatör id sızmıyor", e and "description" not in e and "0555" not in json.dumps(e, ensure_ascii=False) and oId not in json.dumps(e))

print("3) Şehir / ilçe akışı (anon)")
s,f=req("POST","/rest/v1/rpc/public_feed",{"p_city":6})
check(f"Ankara akışında ilan var ({s})", s==200 and any(x["id"]==evId for x in f))
s,f2=req("POST","/rest/v1/rpc/public_feed",{"p_city":34})
check("İstanbul akışında yok", s==200 and not any(x["id"]==evId for x in f2))
s,st=req("POST","/rest/v1/rpc/public_stats",{"p_city":6})
check("istatistik geldi", s==200 and st and st.get("acik",0)>=1)

print("4) Var olmayan ilan → null, iptal edilen ilan akıştan düşer")
s,e0=req("POST","/rest/v1/rpc/public_event",{"p_id":"00000000-0000-0000-0000-000000000000"})
check("yok ilan için null", s==200 and e0 is None)
req("POST","/rest/v1/rpc/cancel_event",{"p_event":evId,"p_reason":None},oT)
s,f=req("POST","/rest/v1/rpc/public_feed",{"p_city":6})
check("iptal sonrası akışta yok", s==200 and not any(x["id"]==evId for x in f))
s,e=req("POST","/rest/v1/rpc/public_event",{"p_id":evId})
check("maç sayfası 'iptal' diyor", s==200 and e and e["status"]=="iptal")

print("5) Temizlik")
req("DELETE",f"/rest/v1/events?id=eq.{evId}",None,oT,"return=minimal")
req("POST","/rest/v1/rpc/delete_own_account",{},oT)
bitir("Herkese açık sayfalar")
