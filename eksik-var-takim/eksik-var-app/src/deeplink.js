// Derin bağlantılar: https://eksikvar.app/e/<id>, eksikvar://e/<id>, Expo Go'da exp://.../--/e/<id>
import { useEffect } from "react";
import { Linking } from "react-native";

export function parseEventLink(url) {
  const m = String(url || "").match(/\/e\/([A-Za-z0-9-]+)/);
  return m ? m[1] : null;
}

// Uygulama linkle açılınca ya da açıkken link gelince onEvent(id) çağırır
export function useDeepLink(onEvent) {
  useEffect(() => {
    Linking.getInitialURL().then((u) => { const id = parseEventLink(u); if (id) onEvent(id); }).catch(() => {});
    const sub = Linking.addEventListener("url", ({ url }) => { const id = parseEventLink(url); if (id) onEvent(id); });
    return () => sub.remove();
  }, []);  
}
