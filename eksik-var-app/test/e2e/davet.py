import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from _ortak import *

print("1) Davetçi + davetli")
dT,dId=kayit(None,"Davetci Kisi","dvtc"); yT,yId=kayit(None,"Yeni Gelen","ygln")
s,u=req("GET",f"/rest/v1/users?id=eq.{dId}&select=username",None,dT); kod=u[0]["username"]

print("2) Herkese açık davet sayfası")
s,d=req("POST","/rest/v1/rpc/public_davetci",{"p_kod":kod})
check(f"public_davetci ({s})", s==200 and d and d["ad"]=="Davetci K." and d["username"]==kod)
s,d0=req("POST","/rest/v1/rpc/public_davetci",{"p_kod":"olmayan_kisi_xyz"})
check("olmayan kod → null", s==200 and d0 is None)

print("3) Davet kaydı")
s,r=req("POST","/rest/v1/rpc/davet_kaydet",{"p_kod":kod},dT)
check("kendini davet edemez", s==200 and r is False)
s,r=req("POST","/rest/v1/rpc/davet_kaydet",{"p_kod":" "+kod.upper()+"!"},yT)
check("davetli kaydoldu (büyük/küçük harf, süprüntü temizlendi)", s==200 and r is True)
s,r=req("POST","/rest/v1/rpc/davet_kaydet",{"p_kod":kod},yT)
check("ikinci kez sayılmaz", s==200 and r is False)
s,u=req("GET",f"/rest/v1/users?id=eq.{dId}&select=davet_sayisi",None,dT)
check("davetçi sayacı 1", s==200 and u[0]["davet_sayisi"]==1)
s,u=req("GET",f"/rest/v1/users?id=eq.{yId}&select=davet_eden",None,yT)
check("davetlinin davet_eden'i davetçi", u[0]["davet_eden"]==dId)
s,n=req("GET",f"/rest/v1/notifications?select=title&user_id=eq.{dId}&type=eq.davet_geldi",None,dT)
check("davetçiye bildirim gitti", s==200 and len(n)==1)
s,_=req("PATCH",f"/rest/v1/users?id=eq.{dId}",{"davet_sayisi":99},dT,"return=minimal")
s,u=req("GET",f"/rest/v1/users?id=eq.{dId}&select=davet_sayisi",None,dT)
check("sayaç elle değiştirilemez", u[0]["davet_sayisi"]==1)

print("4) Temizlik")
for tk in (yT,dT): req("POST","/rest/v1/rpc/delete_own_account",{},tk)
bitir("Davet takibi")
