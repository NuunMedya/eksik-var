"""Ortak yardımcılar — canlı Supabase'e karşı uçtan uca testler.
Çalıştırma: npm test  (python3 gerekir; anahtar uygulamanın herkese açık anon anahtarıdır)
Testler kendi geçici hesaplarını açar ve sonunda siler; gerçek verilere dokunmaz."""
import json, urllib.request, urllib.error, os, sys, datetime
KEY=os.environ.get("SUPABASE_ANON_KEY","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4bW5nbmR0d25kcWJtbGxqaHRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0MTU1ODksImV4cCI6MjEwMzk5MTU4OX0.ckpunuwIGPFBqil8VQVD3oVfE0Cb_maDfXqfok4AXkc")
B=os.environ.get("SUPABASE_URL","https://rxmngndtwndqbmlljhth.supabase.co")
fails=0
def req(m,p,b=None,tok=None,prefer=None):
    h={"apikey":KEY,"Content-Type":"application/json","Authorization":"Bearer "+(tok or KEY)}
    if prefer:h["Prefer"]=prefer
    r=urllib.request.Request(B+p,data=json.dumps(b).encode() if b is not None else None,headers=h,method=m)
    try:
        with urllib.request.urlopen(r,timeout=25) as x: t=x.read().decode(); return x.status,(json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t=e.read().decode()
        try:return e.code,json.loads(t)
        except:return e.code,t
def check(n,c):
    global fails; print(("  ✅ " if c else "  ❌ ")+n); fails+=0 if c else 1
import random, time
_seq = int(time.time()) % 100000
def yeni_tel():
    """Her koşuda benzersiz test numarası (+90555 09xxxxx) — eski koşulardan kalan auth kayıtlarıyla çakışmaz."""
    global _seq; _seq = (_seq + 1) % 100000
    return f"+9055509{_seq:05d}"
def kayit(ph,ad,ku):
    if ph is None: ph = yeni_tel(); ku = f"{ku}_{ph[-5:]}"
    s,d=req("POST","/auth/v1/signup",{"phone":ph,"password":"Test1234!","data":{"full_name":ad,"username":ku,"city_id":"6","phone":ph}})
    if s!=200 or not (d and d.get("access_token")): s,d=req("POST","/auth/v1/token?grant_type=password",{"phone":ph,"password":"Test1234!"})
    if not (d and d.get("access_token")): print("  ❌ hesap açılamadı:", ph, s, str(d)[:200]); sys.exit(1)
    return d["access_token"],d["user"]["id"]
def tarih(gun=2):
    return (datetime.datetime.now(datetime.UTC)+datetime.timedelta(days=gun)).replace(microsecond=0).isoformat().replace("+00:00","Z")
def bitir(ad):
    print("\n"+ad+":", "TÜM ADIMLAR GEÇTİ" if fails==0 else f"{fails} adım başarısız"); sys.exit(1 if fails else 0)
