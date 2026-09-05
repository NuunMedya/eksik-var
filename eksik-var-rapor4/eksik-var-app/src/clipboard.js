// Panoya kopyalama. Gerektirir: npx expo install expo-clipboard
import * as Clipboard from "expo-clipboard";
export async function copyText(text) {
  try { await Clipboard.setStringAsync(String(text)); return true; } catch (e) { return false; }
}
