// Eksik Var — görsel sıkıştırma. Yüklemeden önce fotoğrafı küçültür ve JPEG'e çevirir;
// telefondan çıkan 3-5 MB'lık kareler 100-300 KB'a iner (Supabase trafik kotası için şart).
// Gerektirir: npx expo install expo-image-manipulator  (Expo Go içinde hazır)
let Manip = null;
try { Manip = require("expo-image-manipulator"); } catch { Manip = null; }

export const BOYUT = { avatar: 512, gonderi: 1280, sohbet: 1280, logo: 512 };

/* uri → küçültülmüş JPEG uri. Başarısız olursa (web, eski cihaz) orijinali döndürür; akış asla kırılmaz. */
export async function sikistir(uri, enUzunKenar = 1280, kalite = 0.72) {
  if (!uri || !Manip || typeof uri !== "string" || uri.startsWith("http")) return uri;
  try {
    const fmt = (Manip.SaveFormat && Manip.SaveFormat.JPEG) || "jpeg";
    const r = await Manip.manipulateAsync(uri, [{ resize: { width: enUzunKenar } }], { compress: kalite, format: fmt });
    return (r && r.uri) || uri;
  } catch {
    return uri;
  }
}
