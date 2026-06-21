import { Feather } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { CalendarHeatmap } from "@/components/CalendarHeatmap";
import { EntryCard } from "@/components/EntryCard";
import { MoodInsights } from "@/components/MoodInsights";
import { useJournal } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";
import { formatDateString, getTodayString } from "@/utils/dates";

function getCurrentMonthEntries(entries: ReturnType<typeof useJournal>["entries"]) {
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return entries.filter((e) => e.date.startsWith(prefix));
}

function getDaysElapsedThisMonth(): number {
  return new Date().getDate();
}

export default function HistoryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { entries, streak, totalEntries } = useJournal();

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const today = getTodayString();
  const pastEntries = useMemo(
    () => entries.filter((e) => e.date !== today),
    [entries, today]
  );

  const currentMonthEntries = useMemo(() => getCurrentMonthEntries(entries), [entries]);
  const daysElapsed = getDaysElapsedThisMonth();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={pastEntries}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(280).delay(index * 35)}>
            <EntryCard entry={item} />
          </Animated.View>
        )}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPad + 20, paddingBottom: botPad + 100 },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
              Journal
            </Text>

            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                  {totalEntries}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {totalEntries === 1 ? "Entry" : "Entries"}
                </Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.statNum, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                  {streak}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Day streak
                </Text>
              </View>
            </View>

            <View style={[styles.calendarCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Mood calendar
              </Text>
              <Text style={[styles.sectionSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Tap any coloured day to read that entry
              </Text>
              <CalendarHeatmap entries={entries} />
            </View>

            {currentMonthEntries.length > 0 && (
              <Animated.View
                entering={FadeInDown.duration(400).delay(100)}
                style={[styles.insightsCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.sectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  Mood patterns
                </Text>
                <Text style={[styles.sectionSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Based on your entries this month
                </Text>
                <MoodInsights
                  entries={entries}
                  currentMonthEntries={currentMonthEntries}
                  totalDaysThisMonth={daysElapsed}
                />
              </Animated.View>
            )}

            {pastEntries.length > 0 && (
              <Text style={[styles.pastLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                PAST ENTRIES
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          totalEntries === 0 ? (
            <View style={styles.empty}>
              <Feather name="book-open" size={36} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
                No entries yet
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Start journaling today — your entries will appear here.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 20 },
  title: { fontSize: 28, marginBottom: 20 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 20 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 2,
  },
  statNum: { fontSize: 28, lineHeight: 34 },
  statLabel: { fontSize: 13 },
  calendarCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    gap: 4,
  },
  insightsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    gap: 4,
  },
  sectionTitle: { fontSize: 15, marginBottom: 2 },
  sectionSub: { fontSize: 12, marginBottom: 12 },
  pastLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  empty: {
    alignItems: "center",
    paddingTop: 32,
    gap: 10,
    paddingHorizontal: 20,
  },
  emptyTitle: { fontSize: 18, marginTop: 8 },
  emptyText: { fontSize: 15, lineHeight: 22, textAlign: "center" },
});
