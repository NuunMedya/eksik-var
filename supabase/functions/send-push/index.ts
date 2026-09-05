// Eksik Var — push iletimi. notifications tablosuna bağlı Database Webhook (INSERT + UPDATE) bu fonksiyonu çağırır;
// fonksiyon kullanıcının Expo push belirtecini bulup Expo'nun push servisine iletir.
// Kurulum: supabase functions deploy send-push --no-verify-jwt ; supabase secrets set WEBHOOK_SECRET=<rastgele>
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const secret = Deno.env.get("WEBHOOK_SECRET");
  if (secret && req.headers.get("x-webhook-secret") !== secret) return new Response("yetkisiz", { status: 401 });

  const payload = await req.json();
  const rec = payload.record;
  if (!rec) return new Response("kayıt yok");
  // Mesaj bildirimleri aynı satırda güncellenir; güncellemede de push gitsin (okunmamışsa ve zaman değiştiyse)
  if (payload.type === "UPDATE") {
    if (rec.type !== "mesaj" || rec.is_read || payload.old_record?.created_at === rec.created_at) return new Response("atlandı");
  } else if (payload.type !== "INSERT") return new Response("atlandı");

  // Gece sessizliği (Türkiye saati 23:00–08:00): yalnızca zamana bağlı türler geçer
  const hourTR = (new Date().getUTCHours() + 3) % 24;
  if ((hourTR >= 23 || hourTR < 8) && !["yedek", "hatirlatma", "davet"].includes(rec.type)) return new Response("gece sessiz");

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: u } = await admin.from("users").select("push_token").eq("id", rec.user_id).maybeSingle();
  if (!u?.push_token) return new Response("belirteç yok");

  const res = await fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      to: u.push_token, title: rec.title, body: rec.body, sound: "default", channelId: "default",
      data: { ...(rec.data || {}), type: rec.type, notification_id: rec.id },
    }),
  });
  const out = await res.json().catch(() => ({}));
  const err = out?.data?.details?.error ?? out?.data?.[0]?.details?.error;
  if (err === "DeviceNotRegistered") await admin.from("users").update({ push_token: null }).eq("id", rec.user_id);
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json" } });
});
