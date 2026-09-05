// Eksik Var — renk paleti. Açık ve koyu tema; C nesnesi yerinde güncellenir, stil tabloları onThemeChange ile yeniden kurulur.
// react-native yalnızca uygulamada var; Node testlerinde sistem teması "light" kabul edilir
let Appearance = null;
try { Appearance = typeof require === "function" ? require("react-native").Appearance : null; } catch { Appearance = null; }

export const LIGHT = {
  turf: "#0B3D2E", turfLight: "#125A3F",
  pitch: "#17994F", pitchSoft: "#E3F4EA",
  chalk: "#F7F6F2",            // uygulama zemini
  surface: "#FFFFFF",          // kart / giriş kutusu yüzeyi
  kit: "#F4600C", kitSoft: "#FFEDE0",
  star: "#F5B301",
  ink: "#14201B", faint: "#5E6E66", line: "#E8E5DD",
  waBg: "#ECE5DD", waMine: "#D9FDD3", waNotice: "#FCF4DB",
  mist: "#BFD9CC", gray: "#A8B3AC", danger: "#B4232A",
  placeholder: "#9AA79F", isDark: false,
};
export const DARK = {
  turf: "#0B3D2E", turfLight: "#125A3F",
  pitch: "#22B45D", pitchSoft: "#173B2A",
  chalk: "#0F1613",
  surface: "#1A2420",
  kit: "#FF7A2E", kitSoft: "#3A2415",
  star: "#F5B301",
  ink: "#EEF3EF", faint: "#9DB0A5", line: "#2A3833",
  waBg: "#0F1613", waMine: "#1F3D2C", waNotice: "#2E2A1A",
  mist: "#BFD9CC", gray: "#6E7C75", danger: "#FF6B6B",
  placeholder: "#6E7C75", isDark: true,
};

export const C = { ...LIGHT };
let mode = "system";                    // system | light | dark
const listeners = new Set();
export const onThemeChange = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
export const getThemeMode = () => mode;
export const isDarkNow = () => C.isDark;
export function applyTheme(next) {
  mode = next || "system";
  const dark = mode === "dark" || (mode === "system" && Appearance && Appearance.getColorScheme() === "dark");
  Object.keys(C).forEach((k) => delete C[k]);
  Object.assign(C, dark ? DARK : LIGHT);
  listeners.forEach((fn) => { try { fn(C); } catch { /* sessiz */ } });
}
if (Appearance && Appearance.addChangeListener) Appearance.addChangeListener(() => { if (mode === "system") applyTheme("system"); });
