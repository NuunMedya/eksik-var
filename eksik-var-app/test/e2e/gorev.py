import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _ortak import *

print("1) Hesaplar: organizatör + onaysız hakem adayı + oyuncu")
oT,oId=kayit(None,"Gorev Org","gorg"); hT,hId=kayit(None,"Gorev Hakem","ghak"); pT,pId=kayit(None,"Gorev Oyuncu","goyn")
s,_=req("PATCH",f"/rest/v1/users?id=eq.{hId}",{"hesap_turu":"hakem"},hT,"return=minimal")
check(f"hakem hesabı (onay bekliyor) ({s})", s==204)
s,u=req("GET",f"/rest/v1/users?id=eq.{hId}&select=hesap_turu,hesap_onay",None,hT)
check("onay durumu 'bekliyor' (kendisi onaylayamaz)", s==200 and u[0]["hesap_turu"]=="hakem" and u[0]["hesap_onay"]=="bekliyor")
s,_=req("PATCH",f"/rest/v1/users?id=eq.{hId}",{"hesap_onay":"onayli"},hT,"return=minimal")
s,u=req("GET",f"/rest/v1/users?id=eq.{hId}&select=hesap_onay",None,hT)
check("kendi kendine onay verilemiyor", u[0]["hesap_onay"]!="onayli")

print("2) İlan: 'hakem lazım' + 'kameraman lazım'")
s,ev=req("POST","/rest/v1/events",{"organizer_id":oId,"category_id":1,"city_id":6,"title":"Görev Testi","venue_name":"S","event_date":tarih(),"total_capacity":10,"needed_count":2,"price_per_person":100,"skill_level":"farketmez","kind":"oyuncu","gorev_hakem":True,"gorev_medya":True},oT,"return=representation")
check(f"ilan açıldı ({s})", s==201); evId=ev[0]["id"]
s,e=req("GET",f"/rest/v1/events?id=eq.{evId}&select=gorev_hakem,gorev_medya,hakem_id,medya_id,hakem:users!events_hakem_id_fkey(full_name)",None,pT)
check("alanlar okunuyor (hakem aranıyor, atanmamış)", s==200 and e[0]["gorev_hakem"] and e[0]["gorev_medya"] and e[0]["hakem_id"] is None and e[0]["hakem"] is None)
s,n=req("GET",f"/rest/v1/notifications?select=id&user_id=eq.{hId}&type=eq.gorev",None,hT)
check("onaysız hakeme bildirim GİTMEDİ", s==200 and len(n)==0)

print("3) Yetki: onaysız hakem / oyuncu / organizatör görevi alamaz")
s,r=req("POST","/rest/v1/rpc/gorev_al",{"p_event":evId,"p_rol":"hakem"},hT)
check(f"onaysız hakem reddedildi ({s})", s>=400 and "onaylı" in str(r))
s,r=req("POST","/rest/v1/rpc/gorev_al",{"p_event":evId,"p_rol":"hakem"},pT)
check(f"oyuncu reddedildi ({s})", s>=400)
s,r=req("POST","/rest/v1/rpc/gorev_al",{"p_event":evId,"p_rol":"medya"},oT)
check(f"organizatör kendi maçına alamaz ({s})", s>=400)
s,r=req("POST","/rest/v1/rpc/gorev_al",{"p_event":evId,"p_rol":"kaleci"},pT)
check(f"geçersiz rol reddedildi ({s})", s>=400)
s,r=req("POST","/rest/v1/rpc/gorev_birak",{"p_event":evId,"p_rol":"hakem"},pT)
check("boş görev bırakılırsa false", s==200 and r is False)

print("4) Organizatör ilanı güncelleyip 'kameraman' ihtiyacını kapatır")
s,_=req("PATCH",f"/rest/v1/events?id=eq.{evId}",{"gorev_medya":False},oT,"return=minimal")
s,e=req("GET",f"/rest/v1/events?id=eq.{evId}&select=gorev_medya",None,pT)
check("kameraman ihtiyacı kapandı", s==200 and e[0]["gorev_medya"] is False)

print("5) Temizlik")
req("DELETE",f"/rest/v1/events?id=eq.{evId}",None,oT,"return=minimal")
for tk in (hT,pT,oT): req("POST","/rest/v1/rpc/delete_own_account",{},tk)
bitir("Hakem/medya görevi")
