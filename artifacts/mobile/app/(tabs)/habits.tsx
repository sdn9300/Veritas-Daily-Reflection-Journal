import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { type Habit, useHabits } from "@/context/HabitContext";
import { useColors } from "@/hooks/useColors";
import { formatDateString, getTodayString } from "@/utils/dates";

const PRESET_EMOJIS = [
  "🏃", "💪", "📚", "🧘", "💧", "🥗", "😴", "🎯",
  "✍️", "🎵", "🏋️", "🚶", "🧠", "☀️", "🌙", "🪴",
  "🎨", "🧹", "💊", "🫁", "🫶", "🔋", "🍎", "📝",
];

const PRESET_COLORS = [
  "#2D5016", "#C2410C", "#1D4ED8", "#7C3AED",
  "#B45309", "#0F766E", "#9D174D", "#92400E",
  "#047857", "#1E3A5F", "#6B21A8", "#BE185D",
];

function getLast7Dates(): string[] {
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(formatDateString(d));
  }
  return dates;
}

function dayLabel(dateStr: string): string {
  const days = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
  const d = new Date(dateStr + "T12:00:00");
  return days[d.getDay()] ?? "";
}

function ProgressRing({ done, total }: { done: number; total: number }) {
  const colors = useColors();
  const pct = total === 0 ? 0 : done / total;
  const size = 72;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ * (1 - pct);

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <View style={{
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: colors.muted,
        position: "absolute",
      }} />
      <View style={{
        width: size - stroke * 2, height: size - stroke * 2,
        borderRadius: (size - stroke * 2) / 2,
        backgroundColor: colors.background,
        position: "absolute",
        top: stroke, left: stroke,
        alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ fontSize: 18, fontFamily: "Inter_700Bold", color: colors.foreground }}>
          {done}
        </Text>
        <Text style={{ fontSize: 9, fontFamily: "Inter_400Regular", color: colors.mutedForeground, lineHeight: 12 }}>
          of {total}
        </Text>
      </View>
      {pct > 0 && (
        <View style={{
          position: "absolute",
          width: size, height: size,
          borderRadius: size / 2,
          borderWidth: stroke,
          borderColor: colors.primary,
          borderTopColor: pct < 0.25 ? "transparent" : colors.primary,
          borderRightColor: pct < 0.5 ? "transparent" : colors.primary,
          borderBottomColor: pct < 0.75 ? "transparent" : colors.primary,
          transform: [{ rotate: "-90deg" }],
          opacity: 0.9,
        }} />
      )}
    </View>
  );
}

function HabitRow({ habit, date, onToggle, onDelete }: {
  habit: Habit;
  date: string;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const colors = useColors();
  const { isCompleted, getStreak } = useHabits();
  const done = isCompleted(habit.id, date);
  const streak = getStreak(habit.id);

  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  function handlePress() {
    scale.value = withSequence(withSpring(1.25), withSpring(1));
    Haptics.impactAsync(done ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    onToggle();
  }

  return (
    <Animated.View entering={FadeInDown.duration(280)} style={[styles.habitRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.habitEmoji, { backgroundColor: habit.color + "20" }]}>
        <Text style={{ fontSize: 20 }}>{habit.emoji}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.habitName, { color: colors.foreground, fontFamily: "Inter_600SemiBold",
          textDecorationLine: done ? "line-through" : "none",
          opacity: done ? 0.6 : 1,
        }]}>
          {habit.name}
        </Text>
        {streak > 0 && (
          <Text style={[styles.streakText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            🔥 {streak} day{streak !== 1 ? "s" : ""}
          </Text>
        )}
      </View>

      <TouchableOpacity onPress={onDelete} hitSlop={8} style={{ marginRight: 10 }}>
        <Feather name="trash-2" size={14} color={colors.mutedForeground} />
      </TouchableOpacity>

      <Animated.View style={animStyle}>
        <TouchableOpacity
          style={[styles.checkbox, {
            backgroundColor: done ? habit.color : colors.background,
            borderColor: done ? habit.color : colors.border,
          }]}
          onPress={handlePress}
          activeOpacity={0.7}
        >
          {done && <Feather name="check" size={16} color="#fff" />}
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}

function WeekGrid({ habits }: { habits: Habit[] }) {
  const colors = useColors();
  const { isCompleted } = useHabits();
  const dates = getLast7Dates();
  const today = getTodayString();

  if (habits.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(350).delay(60)}>
      <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
        LAST 7 DAYS
      </Text>
      <View style={[styles.gridCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.gridHeader}>
          <View style={{ width: 110 }} />
          {dates.map((d) => (
            <Text key={d} style={[styles.dayLabel, {
              color: d === today ? colors.primary : colors.mutedForeground,
              fontFamily: d === today ? "Inter_600SemiBold" : "Inter_400Regular",
            }]}>
              {dayLabel(d)}
            </Text>
          ))}
        </View>
        {habits.map((habit, i) => (
          <View key={habit.id} style={[styles.gridRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
            <View style={styles.gridHabitName}>
              <Text style={{ fontSize: 14 }}>{habit.emoji}</Text>
              <Text style={[styles.gridName, { color: colors.foreground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                {habit.name}
              </Text>
            </View>
            {dates.map((d) => {
              const done = isCompleted(habit.id, d);
              return (
                <View key={d} style={styles.gridCell}>
                  <View style={[styles.gridDot, {
                    backgroundColor: done ? habit.color : colors.muted,
                    opacity: done ? 1 : 0.35,
                  }]} />
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function AddHabitModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const colors = useColors();
  const { addHabit } = useHabits();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState(PRESET_EMOJIS[0]!);
  const [color, setColor] = useState(PRESET_COLORS[0]!);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    await addHabit(name.trim(), emoji, color);
    setSaving(false);
    setName("");
    setEmoji(PRESET_EMOJIS[0]!);
    setColor(PRESET_COLORS[0]!);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={[styles.modalContainer, { backgroundColor: colors.background }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={[styles.modalHeader, { borderBottomColor: colors.border, paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.modalCancel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
            New Habit
          </Text>
          <TouchableOpacity onPress={handleSave} disabled={!name.trim() || saving}>
            <Text style={[styles.modalSave, { color: name.trim() ? colors.primary : colors.mutedForeground, fontFamily: "Inter_700Bold" }]}>
              {saving ? "Adding…" : "Add"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.emojiPreview, { backgroundColor: color + "20" }]}>
            <Text style={{ fontSize: 40 }}>{emoji}</Text>
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            NAME
          </Text>
          <TextInput
            style={[styles.nameInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground, fontFamily: "Inter_400Regular" }]}
            placeholder="e.g. Morning run, Read 20 pages…"
            placeholderTextColor={colors.mutedForeground}
            value={name}
            onChangeText={setName}
            autoFocus
            returnKeyType="done"
          />

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            EMOJI
          </Text>
          <View style={styles.emojiGrid}>
            {PRESET_EMOJIS.map((e) => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiOption, {
                  backgroundColor: emoji === e ? color + "30" : colors.surface,
                  borderColor: emoji === e ? color : colors.border,
                }]}
                onPress={() => setEmoji(e)}
              >
                <Text style={{ fontSize: 22 }}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.fieldLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            COLOR
          </Text>
          <View style={styles.colorRow}>
            {PRESET_COLORS.map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.colorSwatch, {
                  backgroundColor: c,
                  borderWidth: color === c ? 3 : 0,
                  borderColor: colors.foreground,
                  transform: [{ scale: color === c ? 1.15 : 1 }],
                }]}
                onPress={() => setColor(c)}
              />
            ))}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function HabitsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { habits, toggleHabit, completedToday, deleteHabit } = useHabits();

  const [showAdd, setShowAdd] = useState(false);
  const today = getTodayString();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  function handleDelete(habit: Habit) {
    Alert.alert("Delete habit", `Remove "${habit.name}"? This will clear all history.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => deleteHabit(habit.id) },
    ]);
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: topPad + 16, paddingBottom: botPad + 100 },
        ]}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
              Habits
            </Text>
            <Text style={[styles.dateLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
          </View>
          <ProgressRing done={completedToday} total={habits.length} />
        </Animated.View>

        {habits.length > 0 && (
          <Animated.View entering={FadeInDown.duration(350).delay(40)}>
            <View style={[styles.progressBar, { backgroundColor: colors.muted }]}>
              <View style={[styles.progressFill, {
                backgroundColor: completedToday === habits.length ? "#2D5016" : colors.primary,
                width: habits.length > 0 ? `${(completedToday / habits.length) * 100}%` : "0%",
              }]} />
            </View>
            <Text style={[styles.progressLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {completedToday === habits.length && habits.length > 0
                ? "🎉 All done for today!"
                : `${completedToday} of ${habits.length} completed`}
            </Text>
          </Animated.View>
        )}

        <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginTop: 20 }]}>
          TODAY
        </Text>

        {habits.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🎯</Text>
            <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
              No habits yet
            </Text>
            <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              Add a daily habit to track — exercise, reading, meditation, or anything else that matters to you.
            </Text>
          </Animated.View>
        ) : (
          <View style={{ gap: 10 }}>
            {habits.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                date={today}
                onToggle={() => toggleHabit(habit.id, today)}
                onDelete={() => handleDelete(habit)}
              />
            ))}
          </View>
        )}

        {habits.length > 0 && (
          <View style={{ marginTop: 28 }}>
            <WeekGrid habits={habits} />
          </View>
        )}
      </ScrollView>

      <View style={[styles.fab, { bottom: botPad + 20 }]}>
        <TouchableOpacity
          style={[styles.fabBtn, { backgroundColor: colors.primary }]}
          onPress={() => setShowAdd(true)}
          activeOpacity={0.85}
        >
          <Feather name="plus" size={24} color={colors.primaryForeground} />
          <Text style={[styles.fabText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
            Add Habit
          </Text>
        </TouchableOpacity>
      </View>

      <AddHabitModal visible={showAdd} onClose={() => setShowAdd(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  title: { fontSize: 28 },
  dateLabel: { fontSize: 13, marginTop: 4 },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 13, marginTop: 6 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  habitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  habitEmoji: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  habitName: { fontSize: 15 },
  streakText: { fontSize: 12, marginTop: 2 },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    overflow: "hidden",
  },
  gridHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dayLabel: { flex: 1, fontSize: 11, textAlign: "center" },
  gridRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  gridHabitName: {
    width: 110,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  gridName: { fontSize: 12, flex: 1 },
  gridCell: { flex: 1, alignItems: "center" },
  gridDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 32,
    gap: 12,
    paddingHorizontal: 16,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 20, textAlign: "center" },
  emptyText: { fontSize: 15, lineHeight: 24, textAlign: "center" },
  fab: {
    position: "absolute",
    left: 20,
    right: 20,
    alignItems: "center",
  },
  fabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 16,
  },
  fabText: { fontSize: 16 },
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  modalCancel: { fontSize: 16 },
  modalTitle: { fontSize: 17 },
  modalSave: { fontSize: 16 },
  modalScroll: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 60, gap: 12 },
  emojiPreview: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 8,
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 12,
  },
  nameInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emojiOption: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  colorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  colorSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
  },
});
