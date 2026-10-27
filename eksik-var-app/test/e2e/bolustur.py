import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _ortak import *

print("1) Hesaplar: 1 organizatör + 2 oyuncu")
oT,oId=kayit(None,"T Organizatör","org"); aT,aId=kayit(None,"T Oyuncu A","oya"); bT,bId=kayit(None,"T Oyuncu B","oyb")
check("üç oturum", all([oT,aT,bT]))
print("2) Saha toplamı 2000₺, kadro 14 → kişi başı otomatik")
s,d=req("POST","/rest/v1/events",{"organizer_id":oId,"category_id":1,"city_id":6,"title":"E2E Bölüşüm","venue_name":"Test Saha","event_date":tarih(),"total_capacity":14,"needed_count":5,"price_per_person":0,"total_cost":2000,"skill_level":"farketmez","kind":"oyuncu","offline_regulars":0},oT,"return=representation")
check(f"event insert ({s})", s==201); ev=d[0]; evId=ev["id"]
check(f"kişi başı otomatik 143₺ (geldi: {ev.get('price_per_person')})", int(ev.get("price_per_person") or 0)==143)
print("3) İki oyuncu katılır, biri muaf")
for tk,uid in ((aT,aId),(bT,bId)):
    s,d=req("POST","/rest/v1/applications",{"event_id":evId,"applicant_id":uid,"message":"e2e"},tk,"return=representation"); ap=d[0]["id"]
    req("PATCH",f"/rest/v1/applications?id=eq.{ap}",{"organizer_approved":True},oT,"return=minimal"); req("PATCH",f"/rest/v1/applications?id=eq.{ap}",{"applicant_approved":True},tk,"return=minimal")
s,d=req("GET",f"/rest/v1/participants?event_id=eq.{evId}&select=user_id",None,oT); check("2 katılımcı", s==200 and len(d)==2)
s,d=req("POST","/rest/v1/rpc/confirm_payment",{"p_event":evId,"p_user":bId,"p_status":"muaf"},oT); check(f"B muaf ({s})", s in (200,204))
print("4) Gelenlere göre yeniden böl → 2000 / 1 ödeyen = 2000₺")
s,d=req("POST","/rest/v1/rpc/rebalance_price",{"p_event":evId},oT); check(f"rebalance ({s}) → {d}", s==200 and int(d)==2000)
s,d=req("GET",f"/rest/v1/notifications?select=title,body&user_id=eq.{aId}&type=eq.odeme&order=created_at.desc&limit=1",None,aT)
check("A'ya 'Payın güncellendi' bildirimi gitti", s==200 and d and "2000" in d[0]["body"])
s,d=req("GET",f"/rest/v1/notifications?select=title&user_id=eq.{bId}&type=eq.odeme",None,bT); check("muaf B'ye bildirim gitmedi", s==200 and not d)
print("5) Sabit ekip 3 eklenince → 2000 / 4 = 500₺")
s,_=req("PATCH",f"/rest/v1/events?id=eq.{evId}",{"offline_regulars":3},oT,"return=minimal"); s,d=req("POST","/rest/v1/rpc/rebalance_price",{"p_event":evId},oT); check(f"rebalance → {d}", s==200 and int(d)==500)
print("6) Oyuncu olmayan biri yeniden bölemez")
s,d=req("POST","/rest/v1/rpc/rebalance_price",{"p_event":evId},aT); check(f"yetki reddi ({s})", s>=400)
print("7) Temizlik")
req("DELETE",f"/rest/v1/events?id=eq.{evId}",None,oT,"return=minimal")
for tk in (aT,bT,oT): req("POST","/rest/v1/rpc/delete_own_account",{},tk)
bitir("Otomatik bölüşüm")
