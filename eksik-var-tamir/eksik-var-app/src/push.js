// Push bildirimleri (Expo). Gerektirir: npx expo install expo-notifications expo-device expo-constants
// Not: Expo Go'da push, iOS'ta çalışır; Android'de development build gerekir (SDK 53+).
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import Constants from "expo-constants";
import { Platform } from "react-native";

try {
  if (Notifications && typeof Notifications.setNotificationHandler === "function") Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowAlert: true, shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});
} catch { /* Expo Go: bildirim modülü söküldü — mağaza derlemesinde gerçek push */ }

export async function registerForPush() {
  try {
    if (!Device.isDevice) return null;
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("default", {
        name: "Eksik Var", importance: Notifications.AndroidImportance.HIGH, vibrationPattern: [0, 250, 250, 250], lightColor: "#17994F",
      });
    }
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return null;
    const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;
    if (!Notifications || typeof Notifications.getExpoPushTokenAsync !== "function") return null;
    const token = (await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined)).data;
    return token || null;
  } catch {
    return null; // Expo Go'da EAS projectId yoksa sessizce atla; build'de çalışır
  }
}

// Bildirime dokununca (uygulama kapalıyken de) veriyi cb'ye ver
export function onNotificationTap(cb) {
  const sub = Notifications.addNotificationResponseReceivedListener((r) => cb(r.notification.request.content.data || {}));
  Notifications.getLastNotificationResponseAsync().then((r) => { if (r) cb(r.notification.request.content.data || {}); }).catch(() => {});
  return () => sub.remove();
}
