// Yol tarifi: kullanıcıya 🚶/🚗/🚌 sorup Google Haritalar'ı o modda açar.
import { Alert, Linking } from "react-native";
import { t } from "./i18n";

const url = (lat, lng, sorgu, mod) => {
  const hedef = lat != null && lng != null ? `${lat},${lng}` : encodeURIComponent(sorgu || "");
  return `https://www.google.com/maps/dir/?api=1&destination=${hedef}&travelmode=${mod}`;
};

export function yolSec(ad, lat, lng, sorgu) {
  const ac = (mod) => Linking.openURL(url(lat, lng, sorgu, mod)).catch(() => {});
  Alert.alert(ad || t("Yol tarifi"), t("Nasıl gideceksin?"), [
    { text: t("🚶 Yürüyerek"), onPress: () => ac("walking") },
    { text: t("🚗 Arabayla"), onPress: () => ac("driving") },
    { text: t("🚌 Toplu taşıma"), onPress: () => ac("transit") },
    { text: t("Vazgeç"), style: "cancel" },
  ]);
}
