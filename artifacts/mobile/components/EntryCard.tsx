import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";

import type { JournalEntry } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";
import { getMoodColor } from "@/components/MoodPicker";
import { formatShortDate } from "@/utils/dates";

interface EntryCardProps {
  entry: JournalEntry;
}

const MOOD_LABELS: Record<string, string> = {
  great: "Great",
  good: "Good",
  okay: "Okay",
  bad: "Bad",
  awful: "Awful",
};

export function EntryCard({ entry }: EntryCardProps) {
  const colors = useColors();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const moodColor = getMoodColor(entry.mood, isDark);

  const preview = entry.content.length > 90
    ? entry.content.slice(0, 90).trim() + "…"
    : entry.content || entry.reflection;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(`/entry/${entry.id}`)}
      activeOpacity={0.75}
    >
      <View style={styles.header}>
        <Text style={[styles.date, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          {formatShortDate(entry.date)}
        </Text>
        <View style={[styles.moodBadge, { backgroundColor: moodColor + "22", borderColor: moodColor + "55" }]}>
          <View style={[styles.moodDot, { backgroundColor: moodColor }]} />
          <Text style={[styles.moodText, { color: moodColor, fontFamily: "Inter_500Medium" }]}>
            {MOOD_LABELS[entry.mood]}
          </Text>
        </View>
      </View>
      {preview ? (
        <Text
          style={[styles.preview, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}
          numberOfLines={2}
        >
          {preview}
        </Text>
      ) : null}
      <View style={styles.footer}>
        <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 13,
  },
  moodBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  moodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  moodText: {
    fontSize: 12,
  },
  preview: {
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    alignItems: "flex-end",
  },
});
