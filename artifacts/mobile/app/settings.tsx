import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useJournal } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";
import { exportJournalAsPDF } from "@/utils/export";
import {
  DEFAULT_REMINDER,
  type ReminderSettings,
  cancelReminder,
  formatReminderTime,
  loadReminderSettings,
  saveReminderSettings,
  scheduleReminder,
} from "@/utils/reminders";

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 15, 30, 45];
const QUICK_PICKS: { label: string; hour: number; minute: number; ampm: "AM" | "PM" }[] = [
  { label: "7:00 AM", hour: 7, minute: 0, ampm: "AM" },
  { label: "8:00 AM", hour: 8, minute: 0, ampm: "AM" },
  { label: "12:00 PM", hour: 12, minute: 0, ampm: "PM" },
  { label: "6:00 PM", hour: 6, minute: 0, ampm: "PM" },
  { label: "8:00 PM", hour: 8, minute: 0, ampm: "PM" },
  { label: "9:00 PM", hour: 9, minute: 0, ampm: "PM" },
  { label: "10:00 PM", hour: 10, minute: 0, ampm: "PM" },
  { label: "11:00 PM", hour: 11, minute: 0, ampm: "PM" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { entries } = useJournal();

  const [settings, setSettings] = useState<ReminderSettings>(DEFAULT_REMINDER);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState(false);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  useEffect(() => {
    loadReminderSettings().then(setSettings);
  }, []);

  function patch(partial: Partial<ReminderSettings>) {
    setSaved(false);
    setSettings((prev) => ({ ...prev, ...partial }));
  }

  async function handleToggle(value: boolean) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!value) {
      patch({ enabled: false });
    } else {
      if (Platform.OS === "web") {
        Alert.alert(
          "Not available on web",
          "Push notifications only work on iOS and Android. Open the app in Expo Go on your phone to enable reminders."
        );
        return;
      }
      patch({ enabled: true });
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      await saveReminderSettings(settings);
      if (settings.enabled) {
        await scheduleReminder(settings);
      } else {
        await cancelReminder();
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSaved(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (msg === "Permission denied") {
        Alert.alert(
          "Permission needed",
          "Please enable notifications for this app in your device settings."
        );
      } else {
        Alert.alert("Error", "Could not save reminder. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleExport() {
    if (entries.length === 0) {
      Alert.alert("No entries", "Write some journal entries first before exporting.");
      return;
    }
    if (Platform.OS === "web") {
      Alert.alert("Not available on web", "PDF export works on iOS and Android. Open the app in Expo Go on your phone.");
      return;
    }
    setExporting(true);
    try {
      await exportJournalAsPDF(entries);
    } catch (e) {
      Alert.alert("Export failed", "Could not export your journal. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  function isQuickActive(q: typeof QUICK_PICKS[number]) {
    return q.hour === settings.hour && q.minute === settings.minute && q.ampm === settings.ampm;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: topPad + 12, borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          Settings
        </Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 24) + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            DAILY REMINDER
          </Text>

          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Feather name="bell" size={18} color={settings.enabled ? colors.primary : colors.mutedForeground} />
                <View>
                  <Text style={[styles.toggleTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    Remind me to journal
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {settings.enabled
                      ? `Daily at ${formatReminderTime(settings)}`
                      : "Off"}
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.enabled}
                onValueChange={handleToggle}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
              />
            </View>
          </View>

          {settings.enabled && (
            <Animated.View entering={FadeInDown.duration(350)}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 24 }]}>
                QUICK PICK
              </Text>
              <View style={styles.quickGrid}>
                {QUICK_PICKS.map((q) => {
                  const active = isQuickActive(q);
                  return (
                    <TouchableOpacity
                      key={q.label}
                      style={[
                        styles.quickPill,
                        {
                          backgroundColor: active ? colors.primary : colors.surface,
                          borderColor: active ? colors.primary : colors.border,
                        },
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        patch({ hour: q.hour, minute: q.minute, ampm: q.ampm });
                      }}
                      activeOpacity={0.75}
                    >
                      <Text style={[styles.quickLabel, {
                        color: active ? colors.primaryForeground : colors.foreground,
                        fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                      }]}>
                        {q.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 24 }]}>
                CUSTOM TIME
              </Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, gap: 18 }]}>
                <View style={styles.pickerRow}>
                  <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Hour</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pillRow}>
                    {HOURS.map((h) => {
                      const active = settings.hour === h;
                      return (
                        <TouchableOpacity
                          key={h}
                          style={[styles.pill, {
                            backgroundColor: active ? colors.primary : colors.surface,
                            borderColor: active ? colors.primary : colors.border,
                          }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            patch({ hour: h });
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.pillText, {
                            color: active ? colors.primaryForeground : colors.foreground,
                            fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                          }]}>
                            {h}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                <View style={styles.pickerRow}>
                  <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Minute</Text>
                  <View style={styles.pillRow}>
                    {MINUTES.map((m) => {
                      const active = settings.minute === m;
                      return (
                        <TouchableOpacity
                          key={m}
                          style={[styles.pill, {
                            backgroundColor: active ? colors.primary : colors.surface,
                            borderColor: active ? colors.primary : colors.border,
                          }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            patch({ minute: m });
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.pillText, {
                            color: active ? colors.primaryForeground : colors.foreground,
                            fontFamily: active ? "Inter_600SemiBold" : "Inter_400Regular",
                          }]}>
                            {m === 0 ? "00" : m}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View style={styles.pickerRow}>
                  <Text style={[styles.pickerLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>Period</Text>
                  <View style={[styles.ampmContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    {(["AM", "PM"] as const).map((p) => {
                      const active = settings.ampm === p;
                      return (
                        <TouchableOpacity
                          key={p}
                          style={[styles.ampmBtn, { backgroundColor: active ? colors.primary : "transparent" }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            patch({ ampm: p });
                          }}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.ampmText, {
                            color: active ? colors.primaryForeground : colors.mutedForeground,
                            fontFamily: active ? "Inter_700Bold" : "Inter_400Regular",
                          }]}>
                            {p}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View style={[styles.previewRow, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
                <Feather name="clock" size={14} color={colors.primary} />
                <Text style={[styles.previewText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                  You'll be reminded daily at {formatReminderTime(settings)}
                </Text>
              </View>
            </Animated.View>
          )}

          <TouchableOpacity
            style={[styles.saveBtn, {
              backgroundColor: saved ? colors.muted : colors.primary,
              marginTop: 28,
              opacity: saving ? 0.7 : 1,
            }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            <Feather
              name={saved ? "check" : "bell"}
              size={18}
              color={saved ? colors.mutedForeground : colors.primaryForeground}
            />
            <Text style={[styles.saveBtnText, {
              color: saved ? colors.mutedForeground : colors.primaryForeground,
              fontFamily: "Inter_600SemiBold",
            }]}>
              {saving ? "Saving…" : saved ? "Reminder saved" : "Save reminder"}
            </Text>
          </TouchableOpacity>

          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 32 }]}>
            EXPORT
          </Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.exportRow}>
              <View style={styles.exportInfo}>
                <Feather name="download" size={18} color={colors.mutedForeground} />
                <View>
                  <Text style={[styles.toggleTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    Export as PDF
                  </Text>
                  <Text style={[styles.toggleSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {entries.length} {entries.length === 1 ? "entry" : "entries"} · beautifully formatted
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.exportBtn, { backgroundColor: colors.primary, opacity: exporting ? 0.7 : 1 }]}
                onPress={handleExport}
                disabled={exporting}
                activeOpacity={0.8}
              >
                <Text style={[styles.exportBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                  {exporting ? "…" : "Export"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  toggleTitle: { fontSize: 15 },
  toggleSub: { fontSize: 13, marginTop: 1 },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickPill: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  quickLabel: { fontSize: 14 },
  pickerRow: { gap: 10 },
  pickerLabel: { fontSize: 12, letterSpacing: 0.3 },
  pillRow: { flexDirection: "row", gap: 8 },
  pill: {
    width: 44,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pillText: { fontSize: 15 },
  ampmContainer: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: "flex-start",
    overflow: "hidden",
  },
  ampmBtn: {
    paddingHorizontal: 24,
    paddingVertical: 9,
  },
  ampmText: { fontSize: 15 },
  previewRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 16,
  },
  previewText: { fontSize: 13 },
  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
  },
  saveBtnText: { fontSize: 16 },
  exportRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  exportInfo: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  exportBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
  },
  exportBtnText: { fontSize: 14 },
});
