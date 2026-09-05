// Profil fotoğrafı seçme: kamera ya da galeri, kare kırpma, izin yönetimi.
// Gerektirir: npx expo install expo-image-picker  (Expo Go içinde hazır)
import { Alert, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";

const OPTS = { mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 };

export async function pickAvatar(source) {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) { Alert.alert("İzin gerekli", "Fotoğraf çekmek için kamera izni vermen gerekiyor."); return null; }
    const res = await ImagePicker.launchCameraAsync(OPTS);
    return res.canceled ? null : res.assets[0].uri;
  }
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert("İzin gerekli", "Galeriden seçmek için fotoğraf izni vermen gerekiyor."); return null; }
  const res = await ImagePicker.launchImageLibraryAsync(OPTS);
  return res.canceled ? null : res.assets[0].uri;
}

// Kamera / galeri / kaldır seçeneklerini sunar; sonucu onChange(uri | null) ile bildirir
export function chooseAvatar(current, onChange) {
  const buttons = [
    { text: "Fotoğraf çek", onPress: async () => { const u = await pickAvatar("camera"); if (u) onChange(u); } },
    { text: "Galeriden seç", onPress: async () => { const u = await pickAvatar("library"); if (u) onChange(u); } },
  ];
  if (current) buttons.push({ text: "Fotoğrafı kaldır", style: "destructive", onPress: () => onChange(null) });
  // Android uyarı penceresi en fazla 3 düğme gösterir; geri tuşu zaten kapatır
  if (Platform.OS === "ios" || buttons.length < 3) buttons.push({ text: "Vazgeç", style: "cancel" });
  Alert.alert("Profil fotoğrafı", current ? "Fotoğrafını değiştir" : "Ekip seni yüzünden tanısın", buttons, { cancelable: true });
}

// Sohbet için fotoğraf (kırpmasız, orta kalite)
export async function pickPhoto() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) { Alert.alert("İzin gerekli", "Fotoğraf seçmek için galeri izni vermen gerekiyor."); return null; }
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6 });
  return res.canceled ? null : res.assets[0].uri;
}

// Keşfet için video seçici: en çok 30 sn, galeriden
export async function pickVideo() {
  const izin = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!izin.granted) return null;
  const r = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Videos,
    videoMaxDuration: 30,
    allowsEditing: true,
    quality: 0.8,
  });
  if (r.canceled || !r.assets || !r.assets[0]) return null;
  return r.assets[0].uri;
}
