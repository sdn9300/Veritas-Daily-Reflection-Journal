import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useJournal } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";
import { formatDisplayDate, getTodayString } from "@/utils/dates";

const MOOD_EMOJI: Record<string, string> = {
  great: "😄", good: "🙂", okay: "😐", bad: "😔", awful: "😢",
};

export function OnThisDay() {
  const colors = useColors();
  const router = useRouter();
  const { entries } = useJournal();

  const today = getTodayString();
  const todayMD = today.slice(5);
  const thisYear = today.slice(0, 4);

  const pastEntries = entries.filter(
    (e) => e.date.slice(5) === todayMD && e.date.slice(0, 4) !== thisYear
  );

  if (pastEntries.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.duration(400).delay(50)}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
          🕰 ON THIS DAY
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {pastEntries.map((entry) => {
          const yearsAgo = parseInt(thisYear) - parseInt(entry.date.slice(0, 4));
          return (
            <TouchableOpacity
              key={entry.id}
              style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push(`/entry/${entry.id}`)}
              activeOpacity={0.8}
            >
              <View style={styles.cardTop}>
                <Text style={styles.emoji}>{MOOD_EMOJI[entry.mood] ?? "📝"}</Text>
                <Text style={[styles.yearsAgo, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                  {yearsAgo} {yearsAgo === 1 ? "year" : "years"} ago
                </Text>
              </View>
              <Text style={[styles.date, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {formatDisplayDate(entry.date)}
              </Text>
              {entry.content ? (
                <Text
                  style={[styles.preview, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}
                  numberOfLines={3}
                >
                  {entry.content}
                </Text>
              ) : entry.reflection ? (
                <Text
                  style={[styles.preview, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}
                  numberOfLines={3}
                >
                  {entry.reflection}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  headerRow: { marginBottom: 10 },
  label: { fontSize: 11, letterSpacing: 0.8, textTransform: "uppercase" },
  scrollContent: { gap: 12, paddingRight: 4 },
  card: {
    width: 220,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  emoji: { fontSize: 20 },
  yearsAgo: { fontSize: 12 },
  date: { fontSize: 12 },
  preview: { fontSize: 13, lineHeight: 20 },
});
