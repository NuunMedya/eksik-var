import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { CATEGORIES, GUNLER_UZUN } from "../data";
import { Avatar, Stars, SquadDots, EksikBadge } from "../components";

export default function EventDetailScreen({
  ev, apps, myApp, roster, onBack, onApply, onApprove, onReject, onGoChat, onAttendance, onDispute, onShare,
}) {
  const shareable = ev.status === "acik" && ev.needed - ev.filled > 0;
  const marks = ev.attendance || {};
  const noShows = (roster || []).filter((m) => marks[m.id] === "gelmedi");
  const attended = (roster || []).filter((m) => marks[m.id] === "katildi");
  const cat = CATEGORIES.find((c) => c.id === ev.cat);
  const remaining = ev.needed - ev.filled;
  const eventApps = apps.filter((a) => a.eventId === ev.id && a.who !== "me");

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <TouchableOpacity onPress={onBack} style={st.back}>
            <Ionicons name="chevron-back" size={18} color={C.mist} />
            <Text style={{ color: C.mist, fontWeight: "700", fontSize: 13 }}>Geri</Text>
          </TouchableOpacity>
          {shareable && (
            <TouchableOpacity onPress={() => onShare(ev)} style={st.shareBtn}>
              <Ionicons name="share-social-outline" size={16} color="#fff" />
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>Paylaş</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 22 }}>{cat?.icon}</Text>
            <Text style={st.title}>{ev.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Ionicons name="location-outline" size={13} color={C.mist} />
              <Text style={{ color: C.mist, fontSize: 13, flexShrink: 1 }}>
                {ev.venue} · {ev.district ? `${ev.district}, ` : ""}{ev.city}
              </Text>
            </View>
          </View>
          <EksikBadge ev={ev} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 140 }}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[
            ["calendar-outline", ev.date],
            ["cash-outline", ev.price === 0 ? "Ücretsiz" : `${ev.price}₺/kişi`],
            ["trophy-outline", ev.level],
          ].map(([icon, text], i) => (
            <View key={i} style={st.infoBox}>
              <Ionicons name={icon} size={16} color={C.turf} />
              <Text style={{ fontSize: 11, fontWeight: "800", color: C.ink, marginTop: 3, textAlign: "center" }}>
                {text}
              </Text>
            </View>
          ))}
        </View>

        <View style={st.card}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={st.cardTitle}>KADRO DURUMU</Text>
            <Text style={{ fontSize: 12, fontWeight: "800", color: C.faint }}>
              {ev.capacity - remaining}/{ev.capacity}
            </Text>
          </View>
          <View style={{ marginTop: 10 }}>
            <SquadDots capacity={ev.capacity} needed={ev.needed} filled={ev.filled} size={13} />
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
            <View style={st.legend}>
              <View style={[st.dot, { backgroundColor: C.turf }]} />
              <Text style={st.legendText}>Mevcut ekip</Text>
            </View>
            <View style={st.legend}>
              <View style={[st.dot, { backgroundColor: C.pitch }]} />
              <Text style={st.legendText}>Uygulamadan ({ev.filled}/{ev.needed})</Text>
            </View>
            <View style={st.legend}>
              <View style={[st.dot, { borderWidth: 1.5, borderStyle: "dashed", borderColor: C.kit }]} />
              <Text style={st.legendText}>Eksik</Text>
            </View>
          </View>
        </View>

        {ev.ended && (
          <View style={[st.card, ev.status !== "tamamlandi" && ev.mine && { borderWidth: 1.5, borderColor: C.kit }]}>
            <Text style={st.cardTitle}>YOKLAMA</Text>
            {ev.mine && ev.status !== "tamamlandi" && (
              <Text style={{ fontSize: 13, color: C.ink, marginTop: 6, lineHeight: 19 }}>
                Maç oynandı, yoklama bekleniyor. Gelmeyenleri işaretleyip maçı tamamla; 48 saat içinde
                alınmazsa herkes katıldı sayılır.
              </Text>
            )}
            {ev.mine && ev.status === "tamamlandi" && (
              <View style={{ marginTop: 6 }}>
                <Text style={{ fontSize: 13, color: C.ink }}>
                  <Text style={{ fontWeight: "900", color: C.pitch }}>{attended.length} katıldı</Text>
                  {"  ·  "}
                  <Text style={{ fontWeight: "900", color: noShows.length ? C.kit : C.faint }}>{noShows.length} gelmedi</Text>
                </Text>
                {noShows.length > 0 && (
                  <Text style={{ fontSize: 12, color: C.faint, marginTop: 4 }}>
                    Gelmeyenler: {noShows.map((m) => m.name).join(", ")}
                  </Text>
                )}
              </View>
            )}
            {!ev.mine && ev.joined && (
              <View style={{ marginTop: 6 }}>
                {ev.myAttendance === "katildi" && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="checkmark-circle" size={18} color={C.pitch} />
                    <Text style={{ fontSize: 13, fontWeight: "800", color: C.pitch }}>Katıldın · güvenilirliğin korundu</Text>
                  </View>
                )}
                {ev.myAttendance === "gelmedi" && (
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="close-circle" size={18} color={C.kit} />
                      <Text style={{ fontSize: 13, fontWeight: "800", color: C.kit }}>Gelmedi olarak işaretlendin</Text>
                    </View>
                    {ev.disputed ? (
                      <Text style={{ fontSize: 12, color: C.faint, marginTop: 6 }}>İtirazın iletildi, inceleniyor.</Text>
                    ) : (
                      <TouchableOpacity onPress={() => onDispute(ev.id)} style={st.disputeBtn}>
                        <Text style={{ fontSize: 12, fontWeight: "800", color: C.turf }}>Hatalı mı? İtiraz et</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {!ev.myAttendance && (
                  <Text style={{ fontSize: 13, color: C.faint }}>Organizatör henüz yoklama almadı.</Text>
                )}
              </View>
            )}
          </View>
        )}

        <View style={st.card}>
          <Text style={st.cardTitle}>AÇIKLAMA</Text>
          <Text style={{ fontSize: 14, color: C.ink, lineHeight: 21, marginTop: 6 }}>{ev.desc}</Text>
          {ev.recurrence === "haftalik" && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: C.pitchSoft, borderRadius: 10, padding: 10 }}>
              <Ionicons name="repeat" size={16} color={C.turf} />
              <Text style={{ flex: 1, fontSize: 12, color: C.turf, fontWeight: "700", lineHeight: 17 }}>
                Her {GUNLER_UZUN[ev.weekday]} {ev.time || ""} tekrar eder. Maç bitince gelecek hafta otomatik açılır; ekip grubu aynı kalır.
              </Text>
            </View>
          )}
        </View>

        {!ev.mine && (
          <View style={[st.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
            <Avatar name={ev.org.name} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "800", color: C.ink, fontSize: 14 }}>{ev.org.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                <Stars value={ev.org.rating} size={12} />
                <Text style={{ fontWeight: "800", fontSize: 12, color: C.ink }}>{ev.org.rating}</Text>
                <Text style={{ fontSize: 12, color: C.faint }}>({ev.org.count} puan)</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 2 }}>
                <Ionicons name="shield-checkmark" size={12} color={C.pitch} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.pitch }}>
                  %{ev.org.rel} güvenilirlik
                </Text>
              </View>
            </View>
          </View>
        )}

        {ev.mine && (
          <View style={st.card}>
            <Text style={st.cardTitle}>BAŞVURULAR ({eventApps.length})</Text>
            {eventApps.length === 0 && (
              <Text style={{ color: C.faint, fontSize: 13, marginTop: 6 }}>
                Henüz başvuru yok — talep yayında, gelenler burada listelenecek.
              </Text>
            )}
            {eventApps.map((a) => (
              <View key={a.id} style={st.appRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Avatar name={a.who.name} size={38} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", fontSize: 13, color: C.ink }}>{a.who.name}</Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                      <Stars value={a.who.rating} size={11} />
                      <Text style={{ fontSize: 11, color: C.faint }}>{a.who.rating}</Text>
                      {a.who.rel < 85 ? (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                          <Ionicons name="warning" size={11} color={C.kit} />
                          <Text style={{ fontSize: 11, fontWeight: "800", color: C.kit }}>
                            %{a.who.rel} güvenilirlik
                          </Text>
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                          <Ionicons name="shield-checkmark" size={11} color={C.pitch} />
                          <Text style={{ fontSize: 11, fontWeight: "700", color: C.pitch }}>%{a.who.rel}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
                <Text style={st.note}>"{a.note}"</Text>
                {a.status === "beklemede" && (
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
                    <TouchableOpacity onPress={() => onApprove(a.id)} style={[st.btn, { backgroundColor: C.pitch }]}>
                      <Text style={st.btnText}>Onayla</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => onReject(a.id)} style={[st.btn, st.btnGhost]}>
                      <Text style={[st.btnText, { color: C.faint }]}>Reddet</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {a.status === "orgBekliyor" && (
                  <Text style={{ fontSize: 12, fontWeight: "800", color: C.kit, marginTop: 8 }}>
                    Onayladın · {a.who.name.split(" ")[0]}'ın son onayı bekleniyor…
                  </Text>
                )}
                {a.status === "onaylandi" && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 }}>
                    <Ionicons name="checkmark" size={14} color={C.pitch} />
                    <Text style={{ fontSize: 12, fontWeight: "900", color: C.pitch }}>
                      Kadroda — grup sohbetine eklendi
                    </Text>
                  </View>
                )}
                {a.status === "reddedildi" && (
                  <Text style={{ fontSize: 12, fontWeight: "700", color: C.faint, marginTop: 8 }}>Reddedildi</Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {ev.mine && shareable && (
        <View style={st.bottomBar}>
          <TouchableOpacity onPress={() => onShare(ev)} style={[st.cta, st.waBtn]}>
            <Ionicons name="logo-whatsapp" size={20} color="#fff" />
            <Text style={st.ctaText}>WhatsApp grubuna at · {ev.needed - ev.filled} eksik</Text>
          </TouchableOpacity>
        </View>
      )}

      {ev.mine && ev.ended && ev.status !== "tamamlandi" && (
        <View style={st.bottomBar}>
          <TouchableOpacity onPress={() => onAttendance(ev.id)} style={[st.cta, { backgroundColor: C.kit }]}>
            <Text style={st.ctaText}>Yoklama al ve maçı tamamla</Text>
          </TouchableOpacity>
        </View>
      )}

      {!ev.mine && (
        <View style={st.bottomBar}>
          {ev.joined ? (
            <TouchableOpacity onPress={() => onGoChat("g-" + ev.id)} style={[st.cta, { backgroundColor: C.turf }]}>
              <Text style={st.ctaText}>Grup sohbetine git</Text>
            </TouchableOpacity>
          ) : myApp ? (
            <TouchableOpacity onPress={() => onGoChat("dm-" + ev.id)} style={[st.cta, { backgroundColor: C.pitchSoft }]}>
              <Text style={[st.ctaText, { color: C.turf }]}>Başvurun iletildi · Sohbete git</Text>
            </TouchableOpacity>
          ) : ev.status === "doldu" ? (
            <View style={[st.cta, { backgroundColor: C.turf, opacity: 0.5 }]}>
              <Text style={st.ctaText}>Kadro tamamlandı</Text>
            </View>
          ) : (
            <TouchableOpacity onPress={onApply} style={[st.cta, { backgroundColor: C.pitch }]}>
              <Text style={st.ctaText}>
                Başvur{ev.price > 0 ? ` · ${ev.price}₺/kişi` : ""}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: C.turf, paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18 },
  back: { flexDirection: "row", alignItems: "center" },
  shareBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
  },
  waBtn: { backgroundColor: "#25D366", flexDirection: "row", justifyContent: "center", gap: 8 },
  title: { color: "#fff", fontSize: 22, fontWeight: "900", marginTop: 4 },
  infoBox: {
    flex: 1, backgroundColor: "#fff", borderRadius: 14, paddingVertical: 12,
    alignItems: "center", justifyContent: "center",
  },
  card: { backgroundColor: "#fff", borderRadius: 16, padding: 14, marginTop: 12 },
  cardTitle: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turf },
  legend: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendText: { fontSize: 11, fontWeight: "600", color: C.faint },
  dot: { width: 10, height: 10, borderRadius: 5 },
  appRow: { borderWidth: 1, borderColor: C.line, borderRadius: 14, padding: 12, marginTop: 10 },
  note: {
    backgroundColor: C.chalk, borderRadius: 10, padding: 10, marginTop: 8,
    fontSize: 13, fontStyle: "italic", color: C.ink,
  },
  btn: { flex: 1, borderRadius: 12, alignItems: "center", paddingVertical: 9 },
  btnGhost: { backgroundColor: "#fff", borderWidth: 1, borderColor: C.line },
  btnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  disputeBtn: {
    alignSelf: "flex-start", backgroundColor: C.chalk, borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 7, marginTop: 8,
  },
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.line, padding: 14,
  },
  cta: { borderRadius: 14, alignItems: "center", paddingVertical: 14 },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: 14 },
});
