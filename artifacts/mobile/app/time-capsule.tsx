import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { type TimeCapsule, useTimeCapsule } from "@/context/TimeCapsuleContext";
import { useColors } from "@/hooks/useColors";
import { formatDisplayDate, getTodayString } from "@/utils/dates";

const PRESETS = [
  { label: "1 month", months: 1 },
  { label: "3 months", months: 3 },
  { label: "6 months", months: 6 },
  { label: "1 year", months: 12 },
];

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr + "T12:00:00");
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

function CapsuleItem({ capsule, onReveal, onDelete }: {
  capsule: TimeCapsule;
  onReveal: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const today = getTodayString();
  const isReady = !capsule.revealed && capsule.revealDate <= today;
  const isRevealed = capsule.revealed;
  const isLocked = !isReady && !isRevealed;

  const [open, setOpen] = useState(false);

  return (
    <Animated.View entering={FadeInDown.duration(300)}>
      <TouchableOpacity
        style={[
          styles.capsuleCard,
          {
            backgroundColor: isRevealed ? colors.surface : isReady ? colors.primary + "12" : colors.card,
            borderColor: isReady ? colors.primary : colors.border,
          }
        ]}
        onPress={() => {
          if (isRevealed || isReady) setOpen((v) => !v);
        }}
        activeOpacity={isLocked ? 1 : 0.8}
      >
        <View style={styles.capsuleTop}>
          <Text style={styles.capsuleIcon}>
            {isRevealed ? "📬" : isReady ? "📮" : "🔒"}
          </Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.capsuleStatus, {
              color: isReady ? colors.primary : colors.mutedForeground,
              fontFamily: "Inter_600SemiBold",
            }]}>
              {isRevealed ? "Revealed" : isReady ? "Ready to open!" : `Opens ${formatDisplayDate(capsule.revealDate)}`}
            </Text>
            <Text style={[styles.capsuleDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Written {formatDisplayDate(capsule.writtenDate)}
            </Text>
          </View>
          <View style={styles.capsuleActions}>
            {isReady && !open && (
              <TouchableOpacity
                style={[styles.openBtn, { backgroundColor: colors.primary }]}
                onPress={() => { setOpen(true); onReveal(); }}
              >
                <Text style={[styles.openBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                  Open
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={onDelete} hitSlop={10}>
              <Feather name="trash-2" size={14} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {(open || isRevealed) && (
          <Animated.View entering={FadeInDown.duration(300)}>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.capsuleMessage, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
              {capsule.message}
            </Text>
          </Animated.View>
        )}

        {isLocked && (
          <Text style={[styles.lockedHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Sealed until {formatDisplayDate(capsule.revealDate)}
          </Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function TimeCapsuleScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { capsules, addCapsule, markRevealed, deleteCapsule } = useTimeCapsule();

  const [message, setMessage] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(3);
  const [saving, setSaving] = useState(false);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const today = getTodayString();
  const revealDate = addMonths(today, PRESETS[selectedPreset].months);

  async function handleSeal() {
    if (!message.trim()) {
      Alert.alert("Write something first", "Your time capsule needs a message.");
      return;
    }
    setSaving(true);
    await addCapsule(message.trim(), revealDate);
    setMessage("");
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function handleDelete(id: string) {
    Alert.alert("Delete capsule", "This will permanently delete this time capsule.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteCapsule(id) },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={[styles.navBar, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          Time Capsule
        </Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 40 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            WRITE A LETTER TO YOUR FUTURE SELF
          </Text>

          <TextInput
            style={[styles.messageInput, {
              backgroundColor: colors.card,
              borderColor: colors.border,
              color: colors.foreground,
              fontFamily: "Merriweather_400Regular",
            }]}
            placeholder={"Dear future me,\n\nToday I'm feeling…"}
            placeholderTextColor={colors.mutedForeground}
            multiline
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
          />

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 20 }]}>
            SEAL UNTIL
          </Text>
          <View style={styles.presetRow}>
            {PRESETS.map((p, i) => {
              const active = selectedPreset === i;
              return (
                <TouchableOpacity
                  key={p.label}
                  style={[styles.presetBtn, {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                    flex: 1,
                  }]}
                  onPress={() => setSelectedPreset(i)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.presetLabel, {
                    color: active ? colors.primaryForeground : colors.foreground,
                    fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                  }]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={[styles.revealPreview, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
            <Text style={[styles.revealText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
              🔒 Will open on {formatDisplayDate(revealDate)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.sealBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
            onPress={handleSeal}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Text style={[styles.sealBtnText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
              {saving ? "Sealing…" : "Seal the capsule 🔒"}
            </Text>
          </TouchableOpacity>
        </Animated.View>

        {capsules.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 36 }]}>
              MY CAPSULES ({capsules.length})
            </Text>
            <View style={{ gap: 10 }}>
              {capsules.map((c) => (
                <CapsuleItem
                  key={c.id}
                  capsule={c}
                  onReveal={() => markRevealed(c.id)}
                  onDelete={() => handleDelete(c.id)}
                />
              ))}
            </View>
          </Animated.View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  navTitle: { fontSize: 17 },
  scroll: { paddingHorizontal: 20, paddingTop: 24 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  messageInput: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    fontSize: 15,
    lineHeight: 26,
    minHeight: 180,
  },
  presetRow: { flexDirection: "row", gap: 8 },
  presetBtn: {
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
  },
  presetLabel: { fontSize: 13 },
  revealPreview: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  revealText: { fontSize: 14 },
  sealBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  sealBtnText: { fontSize: 16 },
  capsuleCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 8,
  },
  capsuleTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  capsuleIcon: { fontSize: 22, lineHeight: 28 },
  capsuleStatus: { fontSize: 14 },
  capsuleDate: { fontSize: 12, marginTop: 2 },
  capsuleActions: { flexDirection: "row", alignItems: "center", gap: 12 },
  openBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  openBtnText: { fontSize: 13 },
  divider: { height: 1, marginVertical: 10 },
  capsuleMessage: { fontSize: 15, lineHeight: 26 },
  lockedHint: { fontSize: 12, textAlign: "center", marginTop: 4 },
});
