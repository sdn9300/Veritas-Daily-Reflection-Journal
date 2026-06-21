import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
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
import Animated, {
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";

import { MoodPicker } from "@/components/MoodPicker";
import type { Mood } from "@/context/JournalContext";
import { useJournal } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";
import { formatDisplayDate, getGreeting, getTodayString } from "@/utils/dates";
import { getDailyPrompt } from "@/utils/prompts";

const today = getTodayString();
const prompt = getDailyPrompt(today);

export default function TodayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { todayEntry, saveEntry, streak } = useJournal();

  const [content, setContent] = useState(todayEntry?.content ?? "");
  const [reflection, setReflection] = useState(todayEntry?.reflection ?? "");
  const [mood, setMood] = useState<Mood | null>(todayEntry?.mood ?? null);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setContent(todayEntry?.content ?? "");
      setReflection(todayEntry?.reflection ?? "");
      setMood(todayEntry?.mood ?? null);
    }, [todayEntry])
  );

  const handleSave = async () => {
    if (!content.trim() && !reflection.trim()) {
      Alert.alert("Nothing to save", "Write something before saving your entry.");
      return;
    }
    if (!mood) {
      Alert.alert("Pick a mood", "Select how you're feeling before saving.");
      return;
    }
    setSaving(true);
    await saveEntry({ content, mood, prompt, reflection, date: today });
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const isEdited =
    content !== (todayEntry?.content ?? "") ||
    reflection !== (todayEntry?.reflection ?? "") ||
    mood !== (todayEntry?.mood ?? null);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingTop: topPad + 20, paddingBottom: botPad + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400).delay(0)}>
          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.greeting, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {getGreeting()}
              </Text>
              <Text style={[styles.date, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
                {formatDisplayDate(today)}
              </Text>
            </View>
            {streak > 0 && (
              <View style={[styles.streak, { backgroundColor: colors.primary }]}>
                <Text style={[styles.streakNum, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
                  {streak}
                </Text>
                <Text style={[styles.streakLabel, { color: colors.primaryForeground + "CC", fontFamily: "Inter_400Regular" }]}>
                  day{streak !== 1 ? "s" : ""}
                </Text>
              </View>
            )}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <View style={[styles.promptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.promptLabel, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              Today's Prompt
            </Text>
            <Text style={[styles.promptText, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
              {prompt}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(140)} style={styles.section}>
          <MoodPicker selected={mood} onSelect={setMood} />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Your thoughts
          </Text>
          <TextInput
            style={[
              styles.textArea,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
                fontFamily: "Merriweather_400Regular",
              },
            ]}
            placeholder="What's on your mind today?"
            placeholderTextColor={colors.mutedForeground}
            multiline
            value={content}
            onChangeText={setContent}
            textAlignVertical="top"
          />
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(260)} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            Reflection
          </Text>
          <TextInput
            style={[
              styles.textArea,
              styles.reflectionArea,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                color: colors.foreground,
                fontFamily: "Merriweather_400Regular",
              },
            ]}
            placeholder={prompt}
            placeholderTextColor={colors.mutedForeground}
            multiline
            value={reflection}
            onChangeText={setReflection}
            textAlignVertical="top"
          />
        </Animated.View>
      </ScrollView>

      <Animated.View
        entering={FadeInUp.duration(400).delay(300)}
        style={[
          styles.saveBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, 16) + (Platform.OS === "web" ? 34 : 0),
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.saveBtn,
            {
              backgroundColor: isEdited || !todayEntry ? colors.primary : colors.muted,
              opacity: saving ? 0.7 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={[styles.saveBtnText, { color: isEdited || !todayEntry ? colors.primaryForeground : colors.mutedForeground, fontFamily: "Inter_600SemiBold" }]}>
            {saving ? "Saving…" : todayEntry ? (isEdited ? "Update Entry" : "Saved") : "Save Entry"}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  greeting: {
    fontSize: 15,
    marginBottom: 2,
  },
  date: {
    fontSize: 22,
    lineHeight: 30,
  },
  streak: {
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  streakNum: {
    fontSize: 20,
    lineHeight: 24,
  },
  streakLabel: {
    fontSize: 11,
  },
  promptCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 8,
    marginBottom: 24,
  },
  promptLabel: {
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  promptText: {
    fontSize: 16,
    lineHeight: 25,
  },
  section: {
    marginBottom: 20,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 13,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  textArea: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    fontSize: 16,
    lineHeight: 25,
    minHeight: 130,
  },
  reflectionArea: {
    minHeight: 110,
  },
  saveBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 16,
  },
});
