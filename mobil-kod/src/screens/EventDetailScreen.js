import React from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { CATEGORIES } from "../data";
import { Avatar, Stars, SquadDots, EksikBadge } from "../components";

export default function EventDetailScreen({
  ev, apps, myApp, onBack, onApply, onApprove, onReject, onGoChat,
}) {
  const cat = CATEGORIES.find((c) => c.id === ev.cat);
  const remaining = ev.needed - ev.filled;
  const eventApps = apps.filter((a) => a.eventId === ev.id && a.who !== "me");

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={st.back}>
          <Ionicons name="chevron-back" size={18} color={C.mist} />
          <Text style={{ color: C.mist, fontWeight: "700", fontSize: 13 }}>Geri</Text>
        </TouchableOpacity>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View style={{ flex: 1, paddingRight: 10 }}>
            <Text style={{ fontSize: 22 }}>{cat?.icon}</Text>
            <Text style={st.title}>{ev.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 }}>
              <Ionicons name="location-outline" size={13} color={C.mist} />
              <Text style={{ color: C.mist, fontSize: 13, flexShrink: 1 }}>
                {ev.venue} · {ev.city}
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

        <View style={st.card}>
          <Text style={st.cardTitle}>AÇIKLAMA</Text>
          <Text style={{ fontSize: 14, color: C.ink, lineHeight: 21, marginTop: 6 }}>{ev.desc}</Text>
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
  back: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
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
  bottomBar: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: C.line, padding: 14,
  },
  cta: { borderRadius: 14, alignItems: "center", paddingVertical: 14 },
  ctaText: { color: "#fff", fontWeight: "900", fontSize: 14 },
});
