import sys, os, datetime
sys.path.insert(0, os.path.dirname(__file__))
from _ortak import *

def gecmis(dk):
    return (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=dk)).isoformat().replace("+00:00","Z")

print("1) Hesaplar")
oT,oId=kayit(None,"Guven Org","gorg"); pT,pId=kayit(None,"Guven Oyuncu","goyn")
s,u=req("GET",f"/rest/v1/users?id=eq.{pId}&select=guven_puani,kurucu,katilim_seri,odeme_sayisi",None,pT)
check("yeni oyuncu: güven puanı yok (Yeni)", s==200 and u[0]["guven_puani"] is None)
check("kurucu üye bayrağı otomatik", u[0]["kurucu"] is True)
s,_=req("PATCH",f"/rest/v1/users?id=eq.{pId}",{"guven_puani":100,"kurucu":False,"katilim_seri":50},pT,"return=minimal")
s,u=req("GET",f"/rest/v1/users?id=eq.{pId}&select=guven_puani,kurucu,katilim_seri",None,pT)
check("kendi puanını elle değiştiremez", u[0]["guven_puani"] is None and u[0]["kurucu"] is True and u[0]["katilim_seri"]==0)

print("2) 3 ücretli maç (1-2 dk sonraya açılır, saat geçince kapanır): en eskisinde gelmedi, sonraki ikisinde katıldı + ödedi")
import time
def ileri(sn):
    return (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(seconds=sn)).isoformat().replace("+00:00","Z")
plan=[(60,"gelmedi",None),(75,"katildi","odendi"),(90,"katildi","odendi")]
evs=[]
for i,(sn,att,pay) in enumerate(plan):
    s,ev=req("POST","/rest/v1/events",{"organizer_id":oId,"category_id":1,"city_id":6,"title":f"Guven {i}","venue_name":"S","event_date":ileri(sn),"total_capacity":10,"needed_count":3,"price_per_person":100,"skill_level":"farketmez","kind":"oyuncu"},oT,"return=representation")
    if s!=201: print("  ilan açılamadı", s, ev); sys.exit(1)
    evId=ev[0]["id"]; evs.append(evId)
    s,a=req("POST","/rest/v1/applications",{"event_id":evId,"applicant_id":pId,"message":"e2e"},pT,"return=representation")
    if s!=201: print("  başvuru olmadı", s, a); sys.exit(1)
    appId=a[0]["id"]
    req("PATCH",f"/rest/v1/applications?id=eq.{appId}",{"organizer_approved":True},oT,"return=minimal")
    req("PATCH",f"/rest/v1/applications?id=eq.{appId}",{"applicant_approved":True},pT,"return=minimal")
print("   maç saatlerinin geçmesi bekleniyor (~95 sn)…"); time.sleep(95)
for i,(sn,att,pay) in enumerate(plan):
    evId=evs[i]
    req("PATCH",f"/rest/v1/participants?event_id=eq.{evId}&user_id=eq.{pId}",{"attendance":att},oT,"return=minimal")
    if pay: req("POST","/rest/v1/rpc/confirm_payment",{"p_event":evId,"p_user":pId,"p_status":pay},oT)
    s,r=req("POST","/rest/v1/rpc/complete_event",{"p_event":evId},oT)
    check(f"maç {i} tamamlandı ({att}{' + '+pay if pay else ''}) {s}", s==200)

print("3) Güven puanı hesaplandı")
s,u=req("GET",f"/rest/v1/users?id=eq.{pId}&select=guven_puani,reliability_pct,katilim_seri,odeme_pct,odeme_sayisi,events_joined,no_show_count",None,pT)
u=u[0]; print("  ", u)
check("katılım 2/3 → %66.67", float(u["reliability_pct"])==66.67 and u["events_joined"]==2 and u["no_show_count"]==1)
check("seri 2 (son iki maç kaçaksız)", u["katilim_seri"]==2)
check("ödeme: 2 ücretli maçın 2'si ödendi → %100, 2 zamanında", u["odeme_pct"] is not None and float(u["odeme_pct"])==100 and u["odeme_sayisi"]==2)
# 0.60*66.67 + 0.25*100 + 0.15*85 = 40 + 25 + 12.75 = 77.75 → 78
check("güven puanı 78", u["guven_puani"]==78)

print("4) Herkese açık maç sayfası organizatör güvenini verir")
s,e=req("POST","/rest/v1/rpc/public_event",{"p_id":evs[-1]})
check("public_event orgGuven/orgKurucu alanları var", s==200 and "orgGuven" in e and e["orgKurucu"] is True)

print("5) Temizlik")
for e in evs: req("DELETE",f"/rest/v1/events?id=eq.{e}",None,oT,"return=minimal")
for tk in (pT,oT): req("POST","/rest/v1/rpc/delete_own_account",{},tk)
bitir("Güvenilirlik vitrini")
