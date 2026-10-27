import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _ortak import *
import datetime

print("1) Hesaplar: organizatör + 2 oyuncu (biri kaleci, biri forvet)")
oT,oId=kayit(None,"Alarm Org","org"); kT,kId=kayit(None,"Alarm Kaleci","kal"); fT,fId=kayit(None,"Alarm Forvet","for")
check("üç oturum", all([oT,kT,fT]))
# push token ve mevki ayarla (alarm yalnız token'ı olanlara gider)
for tk,uid,pos in ((kT,kId,["kaleci"]),(fT,fId,["forvet"])):
    s,_=req("PATCH",f"/rest/v1/users?id=eq.{uid}",{"push_token":"ExponentPushToken[test-"+uid[:6]+"]","positions":pos,"fav_cats":[1]},tk,"return=minimal")
    check(f"profil hazır ({s})", s==204)

print("2) Akşam 21:00 maçı, 1 kaleci eksik → yalnız kaleciye alarm")
d=datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=3)))+datetime.timedelta(days=2)
ev_t=d.replace(hour=21,minute=0,second=0,microsecond=0).astimezone(datetime.timezone.utc).isoformat().replace("+00:00","Z")
s,ev=req("POST","/rest/v1/events",{"organizer_id":oId,"category_id":1,"city_id":6,"title":"Alarm Testi","venue_name":"S","event_date":ev_t,"total_capacity":10,"needed_count":1,"needed_positions":{"kaleci":1},"price_per_person":150,"skill_level":"farketmez","kind":"oyuncu"},oT,"return=representation")
check(f"ilan açıldı ({s})", s==201); evId=ev[0]["id"]
s,nk=req("GET",f"/rest/v1/notifications?select=title,body,data&user_id=eq.{kId}&type=eq.alarm",None,kT)
s2,nf=req("GET",f"/rest/v1/notifications?select=title&user_id=eq.{fId}&type=eq.alarm",None,fT)
check("kaleciye alarm gitti", s==200 and len(nk)==1 and "kaleci" in nk[0]["body"] and nk[0]["data"].get("eventId")==evId)
check("forvete gitmedi (mevki uymuyor)", s2==200 and len(nf)==0)
check(f"metin: {nk[0]['body'] if nk else '-'}", bool(nk) and "150₺" in nk[0]["body"])

print("3) Mevki belirtilmemiş ilan → ikisine de")
s,ev2=req("POST","/rest/v1/events",{"organizer_id":oId,"category_id":1,"city_id":6,"title":"Alarm Testi 2","venue_name":"S","event_date":ev_t,"total_capacity":10,"needed_count":2,"price_per_person":0,"skill_level":"farketmez","kind":"oyuncu"},oT,"return=representation")
s,nf=req("GET",f"/rest/v1/notifications?select=body&user_id=eq.{fId}&type=eq.alarm",None,fT)
check("forvete bu kez gitti, 'ücretsiz' yazıyor", s==200 and len(nf)==1 and "ücretsiz" in nf[0]["body"])

print("4) Günlük sınır: kaleciye 3. alarm gitmez")
s,ev3=req("POST","/rest/v1/events",{"organizer_id":oId,"category_id":1,"city_id":6,"title":"Alarm Testi 3","venue_name":"S","event_date":ev_t,"total_capacity":10,"needed_count":2,"price_per_person":0,"skill_level":"farketmez","kind":"oyuncu"},oT,"return=representation")
s,nk=req("GET",f"/rest/v1/notifications?select=id&user_id=eq.{kId}&type=eq.alarm",None,kT)
check(f"kalecide toplam 2 alarm (geldi: {len(nk) if s==200 else '?'})", s==200 and len(nk)==2)

print("5) Saat dışı ilan (öğlen 13:00) → kimseye gitmez")
og=d.replace(hour=13,minute=0,second=0,microsecond=0).astimezone(datetime.timezone.utc).isoformat().replace("+00:00","Z")
s,_=req("PATCH",f"/rest/v1/users?id=eq.{fId}",{"alarm_saat_bas":17,"alarm_saat_bit":24},fT,"return=minimal")
s,ev4=req("POST","/rest/v1/events",{"organizer_id":oId,"category_id":1,"city_id":6,"title":"Alarm Testi 4","venue_name":"S","event_date":og,"total_capacity":10,"needed_count":2,"price_per_person":0,"skill_level":"farketmez","kind":"oyuncu"},oT,"return=representation")
s,nf=req("GET",f"/rest/v1/notifications?select=id&user_id=eq.{fId}&type=eq.alarm",None,fT)
check("forvette hâlâ 1 alarm", s==200 and len(nf)==1)

print("6) Temizlik")
for e in (ev,ev2,ev3,ev4):
    if isinstance(e,list) and e: req("DELETE",f"/rest/v1/events?id=eq.{e[0]['id']}",None,oT,"return=minimal")
for tk in (kT,fT,oT): req("POST","/rest/v1/rpc/delete_own_account",{},tk)
bitir("Eksik Alarmı")
