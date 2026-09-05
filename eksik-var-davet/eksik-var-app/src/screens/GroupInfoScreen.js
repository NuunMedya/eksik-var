import React from "react";
import { View, Text, TouchableOpacity, ScrollView, Modal, Alert, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { C } from "../theme";
import { CATEGORIES } from "../data";
import { Avatar, Stars } from "../components";

/* ---------- ortak: üye satırındaki etiketler ---------- */
function Tag({ text, color, bg }) {
  return (
    <View style={{ backgroundColor: bg, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Text style={{ fontSize: 10, fontWeight: "800", color }}>{text}</Text>
    </View>
  );
}

function MemberTags({ m }) {
  return (
    <View style={{ flexDirection: "row", gap: 4, flexWrap: "wrap" }}>
      {m.id === "me" && <Tag text="SEN" color={C.turf} bg={C.pitchSoft} />}
      {m.role === "organizator" && <Tag text="ORGANİZATÖR" color={C.kit} bg={C.kitSoft} />}
      {m.via === "uygulama" && <Tag text="UYGULAMADAN" color={C.pitch} bg={C.pitchSoft} />}
    </View>
  );
}

/* ---------- üye profil kartı (grup listesi + birebir sohbet başlığı) ---------- */
export function MemberSheet({ member, rules, canRemove, onClose, onMessage, onCall, onRemove, blocked = false, onBlock, onReport, onProfile, onInvite }) {
  if (!member) return null;
  const isMe = member.id === "me";
  const confirmBlock = () =>
    blocked
      ? onBlock(member)
      : Alert.alert("Engelle", `${member.name} artık sana yazamaz, arayamaz; etkinliklerini görmezsin. Engeli Ayarlar'dan kaldırabilirsin.`,
          [{ text: "Vazgeç", style: "cancel" }, { text: "Engelle", style: "destructive", onPress: () => onBlock(member) }]);
  const confirmRemove = () =>
    Alert.alert(
      "Kadrodan çıkar",
      `${member.name} bu kadrodan ve grup sohbetinden çıkarılacak. Emin misin?`,
      [{ text: "Vazgeç", style: "cancel" }, { text: "Çıkar", style: "destructive", onPress: () => onRemove(member) }]
    );

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.backdrop}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={onClose} />
        <View style={st.sheet}>
          <View style={{ alignItems: "center" }}>
            <Avatar name={member.name} uri={member.avatar} size={68} />
            <Text style={{ fontSize: 18, fontWeight: "900", color: C.ink, marginTop: 10 }}>{member.name}</Text>
            <Text style={{ fontSize: 13, color: C.faint, marginTop: 2 }}>@{member.username}</Text>
            <View style={{ marginTop: 8 }}><MemberTags m={member} /></View>
          </View>

          <View style={st.statRow}>
            <View style={st.stat}>
              <Stars value={member.rating} size={14} />
              <Text style={st.statBig}>{member.rating}</Text>
              <Text style={st.statSub}>{member.count} değerlendirme</Text>
            </View>
            <View style={st.stat}>
              <Ionicons name="shield-checkmark" size={16} color={member.rel < 85 ? C.kit : C.pitch} />
              <Text style={[st.statBig, member.rel < 85 && { color: C.kit }]}>%{member.rel}</Text>
              <Text style={st.statSub}>güvenilirlik</Text>
            </View>
          </View>

          {isMe ? (
            <Text style={{ textAlign: "center", color: C.faint, fontSize: 13, marginTop: 6 }}>Bu sensin 👋</Text>
          ) : (
            <>
              {onProfile && (
                <TouchableOpacity onPress={() => onProfile(member)} style={st.profileBtn}>
                  <Ionicons name="person-circle-outline" size={18} color={C.turf} />
                  <Text style={{ color: C.turf, fontWeight: "900", fontSize: 14 }}>Profili ve yorumları gör</Text>
                  <Ionicons name="chevron-forward" size={16} color={C.turf} />
                </TouchableOpacity>
              )}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 6 }}>
                <TouchableOpacity
                  disabled={!rules.canMessage}
                  onPress={() => onMessage(member)}
                  style={[st.btn, { backgroundColor: C.pitchSoft }, !rules.canMessage && { opacity: 0.4 }]}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={C.turf} />
                  <Text style={[st.btnText, { color: C.turf }]}>Mesaj</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={!rules.canCall}
                  onPress={() => onCall(member)}
                  style={[st.btn, { backgroundColor: C.pitch }, !rules.canCall && { opacity: 0.4 }]}
                >
                  <Ionicons name="call" size={16} color="#fff" />
                  <Text style={[st.btnText, { color: "#fff" }]}>Ara</Text>
                </TouchableOpacity>
              </View>
              {(!rules.canMessage || !rules.canCall) && (
                <Text style={st.reason}>{rules.messageReason || rules.callReason}</Text>
              )}
              {onInvite && !blocked && (
                <TouchableOpacity onPress={() => onInvite(member)} style={[st.btn, { backgroundColor: C.kitSoft, marginTop: 10 }]}>
                  <Ionicons name="person-add-outline" size={16} color={C.kit} />
                  <Text style={[st.btnText, { color: C.kit }]}>Kadroya davet et</Text>
                </TouchableOpacity>
              )}
              {canRemove && (
                <TouchableOpacity onPress={confirmRemove} style={st.removeBtn}>
                  <Ionicons name="person-remove-outline" size={15} color={C.danger} />
                  <Text style={{ color: C.danger, fontWeight: "800", fontSize: 13 }}>Kadrodan çıkar</Text>
                </TouchableOpacity>
              )}
              {(onBlock || onReport) && (
                <View style={{ flexDirection: "row", justifyContent: "center", gap: 18, marginTop: 12 }}>
                  {onBlock && (
                    <TouchableOpacity onPress={confirmBlock} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name={blocked ? "lock-open-outline" : "ban-outline"} size={14} color={C.faint} />
                      <Text style={{ fontSize: 12, fontWeight: "700", color: C.faint }}>{blocked ? "Engeli kaldır" : "Engelle"}</Text>
                    </TouchableOpacity>
                  )}
                  {onReport && (
                    <TouchableOpacity onPress={() => onReport(member)} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="flag-outline" size={14} color={C.faint} />
                      <Text style={{ fontSize: 12, fontWeight: "700", color: C.faint }}>Şikayet et</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}

/* ---------- grup bilgisi ekranı ---------- */
export default function GroupInfoScreen({ chat, event, me, onBack, onOpenEvent, onSelectMember }) {
  // "me" kaydını gerçek kullanıcı bilgisiyle doldur, sonra sırala: organizatör → sen → puana göre
  const members = (chat.members || [])
    .map((m) => (m.id === "me" ? { ...me, role: m.role, via: m.via, id: "me" } : m))
    .sort((a, b) => {
      const w = (m) => (m.role === "organizator" ? 2 : m.id === "me" ? 1 : 0);
      return w(b) - w(a) || b.rating - a.rating;
    });
  const n = members.length || 1;
  const avgRating = (members.reduce((s, m) => s + (m.rating || 0), 0) / n).toFixed(1);
  const avgRel = Math.round(members.reduce((s, m) => s + (m.rel || 0), 0) / n);
  const fromApp = members.filter((m) => m.via === "uygulama").length;
  const cat = event ? CATEGORIES.find((c) => c.id === event.cat) : null;

  return (
    <View style={{ flex: 1, backgroundColor: C.chalk }}>
      <View style={st.header}>
        <TouchableOpacity onPress={onBack} style={{ paddingRight: 6 }}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={st.groupIcon}><Ionicons name="people" size={20} color="#fff" /></View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text numberOfLines={1} style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>{chat.title}</Text>
          <Text style={{ color: C.mist, fontSize: 11 }}>Grup bilgisi · {members.length} üye</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: 60 }}>
        <View style={st.summary}>
          <View style={st.sumItem}>
            <Text style={st.sumBig}>★ {avgRating}</Text>
            <Text style={st.sumSub}>kadro puanı</Text>
          </View>
          <View style={st.sumItem}>
            <Text style={st.sumBig}>%{avgRel}</Text>
            <Text style={st.sumSub}>güvenilirlik</Text>
          </View>
          <View style={st.sumItem}>
            <Text style={st.sumBig}>{fromApp}</Text>
            <Text style={st.sumSub}>uygulamadan</Text>
          </View>
        </View>

        {event && (
          <TouchableOpacity onPress={() => onOpenEvent(event.id)} style={st.eventCard}>
            <View style={st.catBox}><Text style={{ fontSize: 20 }}>{cat ? cat.icon : "⚽"}</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: "900", letterSpacing: 0.8, color: C.turf }}>BAĞLI ETKİNLİK</Text>
              <Text style={{ fontWeight: "800", fontSize: 14, color: C.ink, marginTop: 2 }}>{event.title}</Text>
              <Text style={{ fontSize: 12, color: C.faint, marginTop: 2 }}>
                {event.date} · {event.venue.split(",")[0]}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={C.gray} />
          </TouchableOpacity>
        )}

        <Text style={st.section}>ÜYELER ({members.length})</Text>
        <View style={st.list}>
          {members.map((m, i) => (
            <TouchableOpacity
              key={m.id}
              onPress={() => onSelectMember(m)}
              style={[st.row, i === members.length - 1 && { borderBottomWidth: 0 }]}
            >
              <Avatar name={m.name} uri={m.avatar} size={42} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Text style={{ fontWeight: "800", fontSize: 14, color: C.ink }}>{m.name}</Text>
                  <MemberTags m={m} />
                </View>
                <Text style={{ fontSize: 12, color: C.faint, marginTop: 1 }}>@{m.username}</Text>
              </View>
              <View style={{ alignItems: "flex-end", gap: 3 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Stars value={m.rating} size={11} />
                  <Text style={{ fontSize: 13, fontWeight: "900", color: C.ink }}>{m.rating}</Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Ionicons name="shield-checkmark" size={11} color={m.rel < 85 ? C.kit : C.pitch} />
                  <Text style={{ fontSize: 11, fontWeight: "700", color: m.rel < 85 ? C.kit : C.pitch }}>%{m.rel}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={st.hint}>Bir üyeye dokunarak profilini görebilir, mesaj atabilir ya da arayabilirsin.</Text>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  header: { backgroundColor: C.turf, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 12 },
  groupIcon: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  summary: { flexDirection: "row", backgroundColor: "#fff", borderRadius: 16, padding: 12, borderWidth: 1, borderColor: C.line },
  sumItem: { flex: 1, alignItems: "center" },
  sumBig: { fontSize: 17, fontWeight: "900", color: C.turf },
  sumSub: { fontSize: 10, color: C.faint, marginTop: 2 },
  eventCard: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff",
    borderRadius: 16, padding: 12, marginTop: 12, borderWidth: 1, borderColor: C.line,
  },
  catBox: { width: 42, height: 42, borderRadius: 12, backgroundColor: C.pitchSoft, alignItems: "center", justifyContent: "center" },
  section: { fontSize: 11, fontWeight: "900", letterSpacing: 0.8, color: C.turf, marginTop: 18, marginBottom: 6, marginLeft: 4 },
  list: { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: C.line, paddingHorizontal: 12 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.line },
  hint: { fontSize: 11, color: C.faint, textAlign: "center", marginTop: 12 },
  backdrop: { flex: 1, backgroundColor: "rgba(11,26,20,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 34 },
  statRow: { flexDirection: "row", gap: 10, marginTop: 16, marginBottom: 10 },
  stat: { flex: 1, backgroundColor: C.chalk, borderRadius: 14, paddingVertical: 12, alignItems: "center", gap: 3 },
  statBig: { fontSize: 18, fontWeight: "900", color: C.turf },
  statSub: { fontSize: 11, color: C.faint },
  profileBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: C.pitchSoft, backgroundColor: "#F3FAF5", borderRadius: 12, paddingVertical: 11, marginBottom: 10 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 12 },
  btnText: { fontWeight: "900", fontSize: 14 },
  reason: { textAlign: "center", fontSize: 12, color: C.faint, marginTop: 8 },
  removeBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingVertical: 11, marginTop: 10,
  },
});
