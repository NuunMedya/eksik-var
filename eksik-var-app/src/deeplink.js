// Derin bağlantılar: https://eksikvarapp.com/e/<id>, eksikvar://e/<id>, Expo Go'da exp://.../--/e/<id>
import { useEffect } from "react";
import { Linking } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export function parseEventLink(url) {
  const m = String(url || "").match(/\/e\/([A-Za-z0-9-]+)/);
  return m ? m[1] : null;
}

// Davet kodu: eksikvarapp.com/d/<kullanici>, eksikvar://d/<kullanici> ya da herhangi bir linkte ?d=<kullanici>
export function parseInviteCode(url) {
  const u = String(url || "");
  const m = u.match(/\/d\/([A-Za-z0-9_]+)/) || u.match(/[?&]d=([A-Za-z0-9_]+)/);
  return m ? m[1].toLowerCase() : null;
}
const DAVET_KEY = "eksik.davet";
export async function bekleyenDavet() { try { return await AsyncStorage.getItem(DAVET_KEY); } catch { return null; } }
export async function davetTemizle() { try { await AsyncStorage.removeItem(DAVET_KEY); } catch { /* sessiz */ } }
async function davetSakla(url) {
  const kod = parseInviteCode(url);
  if (!kod) return;
  try { if (!(await AsyncStorage.getItem(DAVET_KEY))) await AsyncStorage.setItem(DAVET_KEY, kod); } catch { /* sessiz */ }
}

// Uygulama linkle açılınca ya da açıkken link gelince onEvent(id) çağırır; davet kodunu saklar
export function useDeepLink(onEvent) {
  useEffect(() => {
    Linking.getInitialURL().then((u) => { davetSakla(u); const id = parseEventLink(u); if (id) onEvent(id); }).catch(() => {});
    const sub = Linking.addEventListener("url", ({ url }) => { davetSakla(url); const id = parseEventLink(url); if (id) onEvent(id); });
    return () => sub.remove();
  }, []);
}
