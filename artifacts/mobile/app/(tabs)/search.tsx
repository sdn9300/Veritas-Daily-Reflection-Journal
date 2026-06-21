import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useFocusEffect } from "expo-router";

import { EntryCard } from "@/components/EntryCard";
import type { JournalEntry } from "@/context/JournalContext";
import { useJournal } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";
import { formatDisplayDate } from "@/utils/dates";

const MOOD_LABELS: Record<string, string> = {
  great: "great",
  good: "good",
  okay: "okay",
  bad: "bad",
  awful: "awful",
};

function normalize(s: string) {
  return s.toLowerCase().trim();
}

function matchesQuery(entry: JournalEntry, q: string): boolean {
  const n = normalize(q);
  if (!n) return false;
  return (
    normalize(entry.content).includes(n) ||
    normalize(entry.reflection).includes(n) ||
    normalize(entry.mood).includes(n) ||
    normalize(formatDisplayDate(entry.date)).includes(n) ||
    entry.date.includes(n)
  );
}

export default function SearchScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { entries, totalEntries } = useJournal();
  const [query, setQuery] = useState("");
  const inputRef = useRef<TextInput>(null);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  useFocusEffect(
    useCallback(() => {
      const timeout = setTimeout(() => inputRef.current?.focus(), 200);
      return () => clearTimeout(timeout);
    }, [])
  );

  const results = useMemo<JournalEntry[]>(() => {
    const q = query.trim();
    if (!q) return [];
    return entries.filter((e) => matchesQuery(e, q));
  }, [query, entries]);

  const hasQuery = query.trim().length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={hasQuery ? results : []}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(220).delay(index * 30)}>
            <EntryCard entry={item} />
          </Animated.View>
        )}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPad + 16, paddingBottom: botPad + 100 },
        ]}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListHeaderComponent={
          <>
            <Text style={[styles.title, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
              Search
            </Text>

            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="search" size={18} color={colors.mutedForeground} />
              <TextInput
                ref={inputRef}
                style={[styles.searchInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="Search entries, moods, dates…"
                placeholderTextColor={colors.mutedForeground}
                value={query}
                onChangeText={setQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                clearButtonMode="never"
              />
              {query.length > 0 && (
                <TouchableOpacity
                  onPress={() => { setQuery(""); inputRef.current?.focus(); }}
                  hitSlop={10}
                >
                  <Feather name="x" size={16} color={colors.mutedForeground} />
                </TouchableOpacity>
              )}
            </View>

            {hasQuery && (
              <Animated.View entering={FadeIn.duration(200)} style={styles.resultsMeta}>
                <Text style={[styles.resultsLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                  {results.length === 0
                    ? "No results"
                    : `${results.length} result${results.length !== 1 ? "s" : ""}`}
                </Text>
              </Animated.View>
            )}
          </>
        }
        ListEmptyComponent={
          !hasQuery ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="search" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
                Search your journal
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Search across all your thoughts, reflections, moods, and dates. Try{" "}
                <Text style={{ fontFamily: "Inter_500Medium" }}>"grateful"</Text>
                {", "}
                <Text style={{ fontFamily: "Inter_500Medium" }}>"good"</Text>
                {", or a date like "}
                <Text style={{ fontFamily: "Inter_500Medium" }}>"June"</Text>.
              </Text>
              {totalEntries > 0 && (
                <View style={[styles.statsPill, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Feather name="book-open" size={13} color={colors.primary} />
                  <Text style={[styles.statsText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Searching across{" "}
                    <Text style={[styles.statsNum, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {totalEntries}
                    </Text>{" "}
                    {totalEntries === 1 ? "entry" : "entries"}
                  </Text>
                </View>
              )}
            </Animated.View>
          ) : hasQuery && results.length === 0 ? (
            <Animated.View entering={FadeIn.duration(300)} style={styles.emptyState}>
              <View style={[styles.emptyIconWrap, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Feather name="file-text" size={28} color={colors.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
                No entries found
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Nothing matched{" "}
                <Text style={{ fontFamily: "Inter_500Medium", color: colors.foreground }}>
                  "{query}"
                </Text>
                . Try different words or a date.
              </Text>
            </Animated.View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 20 },
  title: { fontSize: 28, marginBottom: 16 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 13 : 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  resultsMeta: {
    paddingHorizontal: 2,
    marginBottom: 14,
    marginTop: 4,
  },
  resultsLabel: {
    fontSize: 12,
    letterSpacing: 0.4,
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 36,
    paddingHorizontal: 12,
    gap: 12,
  },
  emptyIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    maxWidth: 300,
  },
  statsPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    marginTop: 4,
  },
  statsText: { fontSize: 13 },
  statsNum: { fontSize: 13 },
});
