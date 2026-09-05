// Maçı telefonun takvimine ekle. Gerektirir: npx expo install expo-calendar
import * as Calendar from "expo-calendar/legacy";
import { Platform } from "react-native";

async function defaultCalendarId() {
  if (Platform.OS === "ios") { const c = await Calendar.getDefaultCalendarAsync(); return c.id; }
  const cals = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const own = cals.find((c) => c.accessLevel === Calendar.CalendarAccessLevel.OWNER && c.allowsModifications) || cals.find((c) => c.allowsModifications);
  if (own) return own.id;
  return Calendar.createCalendarAsync({ title: "Eksik Var", color: "#17994F", entityType: Calendar.EntityTypes.EVENT, name: "eksikvar", ownerAccount: "eksikvar", accessLevel: Calendar.CalendarAccessLevel.OWNER, source: { isLocalAccount: true, name: "Eksik Var", type: Calendar.SourceType.LOCAL } });
}

export async function addToCalendar(ev) {
  if (!ev.dateISO || !ev.time) throw new Error("TARIH_YOK");
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== "granted") throw new Error("IZIN_YOK");
  const start = new Date(`${ev.dateISO}T${ev.time}:00`);
  const end = new Date(start.getTime() + 90 * 60000);
  const id = await defaultCalendarId();
  return Calendar.createEventAsync(id, {
    title: `⚽ ${ev.title}`, startDate: start, endDate: end, location: [ev.venue, ev.district, ev.city].filter(Boolean).join(", "),
    notes: "Eksik Var ile kadroya girdin. Gelemeyeceksen uygulamadan haber ver.", alarms: [{ relativeOffset: -120 }],
  });
}
