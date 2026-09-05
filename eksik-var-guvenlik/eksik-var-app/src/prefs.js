// Görünüm ve dil tercihleri: cihazda saklanır, açılışta uygulanır.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { applyTheme } from "./theme";
import { setLang, systemLang } from "./i18n";

export async function loadPrefs() {
  let theme = "system", lang = null;
  try { theme = (await AsyncStorage.getItem("ev_theme")) || "system"; lang = await AsyncStorage.getItem("ev_lang"); } catch { /* ilk açılış */ }
  applyTheme(theme); setLang(lang || systemLang());
  return { theme, lang: lang || systemLang() };
}
export function saveTheme(mode) { applyTheme(mode); AsyncStorage.setItem("ev_theme", mode).catch(() => {}); }
export function saveLang(id) { setLang(id); AsyncStorage.setItem("ev_lang", id).catch(() => {}); }
