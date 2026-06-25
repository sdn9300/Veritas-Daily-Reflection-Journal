import { Feather } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { type JournalEntry, useJournal } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";

const MOOD_EMOJI: Record<string, string> = {
  great: "😄", good: "🙂", okay: "😐", bad: "😔", awful: "😢",
};
const MOOD_COLOR: Record<string, string> = {
  great: "#2D5016", good: "#4CAF50", okay: "#F59E0B", bad: "#C2410C", awful: "#7F1D1D",
};
const MOOD_ORDER = ["great", "good", "okay", "bad", "awful"];

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  return "/api";
}

function getMonthName(num: number): string {
  return ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][num - 1] ?? "";
}

function computeStats(entries: JournalEntry[], year: number) {
  const yearEntries = entries.filter((e) => e.date.startsWith(String(year)));
  if (yearEntries.length === 0) return null;

  const moodCounts: Record<string, number> = { great: 0, good: 0, okay: 0, bad: 0, awful: 0 };
  yearEntries.forEach((e) => { moodCounts[e.mood] = (moodCounts[e.mood] ?? 0) + 1; });

  const topMood = Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "good";

  const monthCounts: Record<string, number> = {};
  yearEntries.forEach((e) => {
    const m = e.date.slice(5, 7);
    monthCounts[m] = (monthCounts[m] ?? 0) + 1;
  });
  const topMonthNum = Object.entries(monthCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topMonth = topMonthNum ? getMonthName(parseInt(topMonthNum)) : null;

  const totalWords = yearEntries.reduce((acc, e) => {
    const words = (e.content + " " + e.reflection).split(/\s+/).filter(Boolean).length;
    return acc + words;
  }, 0);

  return { yearEntries, moodCounts, topMood, topMonth, totalWords };
}

interface YearReview {
  narrative: string;
  themes: string[];
  highlights: Array<{ period: string; note: string }>;
  growth: string;
  encouragement: string;
}

export default function YearReviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { entries } = useJournal();

  const year = new Date().getFullYear();
  const stats = useMemo(() => computeStats(entries, year), [entries, year]);

  const [review, setReview] = useState<YearReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  async function generateReview() {
    if (!stats) return;
    setLoading(true);
    setError(null);
    setReview(null);

    const payload = stats.yearEntries
      .sort((a, b) => b.content.length + b.reflection.length - (a.content.length + a.reflection.length))
      .slice(0, 60)
      .map((e) => ({
        date: e.date,
        mood: e.mood,
        snippet: (e.content || e.reflection).slice(0, 120),
      }));

    try {
      const res = await fetch(`${getApiBase()}/insights/year-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, entries: payload }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json() as { review: YearReview };
      setReview(data.review);
    } catch {
      setError("Couldn't generate your review. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const moodTotal = stats ? Object.values(stats.moodCounts).reduce((a, b) => a + b, 0) : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: topPad + 16, paddingBottom: Math.max(insets.bottom, 24) + 60 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ width: 30 }} />
      </View>

      <Animated.View entering={FadeInDown.duration(400)} style={styles.heroSection}>
        <Text style={[styles.yearLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          LOOKING BACK ON
        </Text>
        <Text style={[styles.yearNumber, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
          {year}
        </Text>
      </Animated.View>

      {!stats ? (
        <Animated.View entering={FadeInDown.duration(400)} style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📔</Text>
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
            No entries for {year} yet
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Start journaling and come back here at the end of the year for a full reflection.
          </Text>
        </Animated.View>
      ) : (
        <>
          <Animated.View entering={FadeInDown.duration(400).delay(60)} style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {stats.yearEntries.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                entries
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.statEmoji}>{MOOD_EMOJI[stats.topMood] ?? "😊"}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                top mood
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {stats.topMonth ?? "—"}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                busiest
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.statNum, { color: colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {stats.totalWords > 999 ? `${(stats.totalWords / 1000).toFixed(1)}k` : String(stats.totalWords)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                words
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(120)} style={[styles.moodBreakdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              MOOD BREAKDOWN
            </Text>
            {MOOD_ORDER.map((mood) => {
              const count = stats.moodCounts[mood] ?? 0;
              const pct = moodTotal > 0 ? (count / moodTotal) * 100 : 0;
              return (
                <View key={mood} style={styles.moodRow}>
                  <Text style={styles.moodRowEmoji}>{MOOD_EMOJI[mood]}</Text>
                  <Text style={[styles.moodRowName, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {mood.charAt(0).toUpperCase() + mood.slice(1)}
                  </Text>
                  <View style={[styles.moodBarBg, { backgroundColor: colors.muted }]}>
                    <View style={[styles.moodBarFill, { width: `${pct}%`, backgroundColor: MOOD_COLOR[mood] ?? colors.primary }]} />
                  </View>
                  <Text style={[styles.moodRowCount, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                    {count}
                  </Text>
                </View>
              );
            })}
          </Animated.View>

          {!review && !loading && (
            <Animated.View entering={FadeInDown.duration(400).delay(180)}>
              <TouchableOpacity
                style={[styles.generateBtn, { backgroundColor: colors.primary }]}
                onPress={generateReview}
                activeOpacity={0.85}
              >
                <Text style={{ fontSize: 20 }}>✨</Text>
                <Text style={[styles.generateBtnText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
                  Generate My {year} Review
                </Text>
              </TouchableOpacity>
              <Text style={[styles.generateHint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                AI will read your entries and craft a personal year-end reflection
              </Text>
            </Animated.View>
          )}

          {loading && (
            <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.loadingTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Reflecting on your year…
              </Text>
              <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                Reading through {stats.yearEntries.length} entries
              </Text>
            </View>
          )}

          {error && (
            <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{error}</Text>
              <TouchableOpacity onPress={generateReview}>
                <Text style={[{ color: colors.primary, fontFamily: "Inter_600SemiBold", fontSize: 15, marginTop: 8 }]}>Try again</Text>
              </TouchableOpacity>
            </View>
          )}

          {review && (
            <Animated.View entering={FadeInDown.duration(500)} style={styles.reviewSection}>
              <View style={[styles.narrativeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.sectionLabel, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                  YOUR YEAR
                </Text>
                <Text style={[styles.narrativeText, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
                  {review.narrative}
                </Text>
              </View>

              {review.themes.length > 0 && (
                <View style={[styles.themeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                    RECURRING THEMES
                  </Text>
                  <View style={styles.themesRow}>
                    {review.themes.map((theme, i) => (
                      <Animated.View
                        key={i}
                        entering={FadeInDown.duration(300).delay(i * 60)}
                        style={[styles.themeChip, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
                      >
                        <Text style={[styles.themeText, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                          {theme}
                        </Text>
                      </Animated.View>
                    ))}
                  </View>
                </View>
              )}

              {review.highlights.length > 0 && (
                <View>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium", marginBottom: 10 }]}>
                    STANDOUT MOMENTS
                  </Text>
                  <View style={styles.highlightsCol}>
                    {review.highlights.map((h, i) => (
                      <Animated.View
                        key={i}
                        entering={FadeInDown.duration(350).delay(i * 80)}
                        style={[styles.highlightCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <View style={[styles.highlightDot, { backgroundColor: colors.primary }]} />
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.highlightPeriod, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
                            {h.period}
                          </Text>
                          <Text style={[styles.highlightNote, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
                            {h.note}
                          </Text>
                        </View>
                      </Animated.View>
                    ))}
                  </View>
                </View>
              )}

              {review.growth && (
                <View style={[styles.growthCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                    HOW YOU GREW
                  </Text>
                  <Text style={[styles.growthText, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
                    {review.growth}
                  </Text>
                </View>
              )}

              {review.encouragement && (
                <View style={[styles.encourageCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}>
                  <Text style={[styles.encourageTitle, { color: colors.primary, fontFamily: "Inter_700Bold" }]}>
                    Looking ahead ✨
                  </Text>
                  <Text style={[styles.encourageText, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
                    {review.encouragement}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.regenBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={generateReview}
                activeOpacity={0.8}
              >
                <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
                <Text style={[styles.regenText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Regenerate
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  heroSection: { marginBottom: 24, marginTop: 8 },
  yearLabel: { fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 4 },
  yearNumber: { fontSize: 48, lineHeight: 56 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statNum: { fontSize: 20, lineHeight: 26 },
  statEmoji: { fontSize: 22, lineHeight: 28 },
  statLabel: { fontSize: 11, textAlign: "center" },
  moodBreakdown: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 10,
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  moodRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  moodRowEmoji: { fontSize: 14, width: 20, textAlign: "center" },
  moodRowName: { fontSize: 12, width: 42 },
  moodBarBg: { flex: 1, height: 7, borderRadius: 4, overflow: "hidden" },
  moodBarFill: { height: 7, borderRadius: 4 },
  moodRowCount: { fontSize: 12, width: 20, textAlign: "right" },
  generateBtn: {
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },
  generateBtnText: { fontSize: 16 },
  generateHint: { fontSize: 13, textAlign: "center", lineHeight: 20 },
  loadingBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 32,
    alignItems: "center",
    gap: 12,
    marginTop: 12,
  },
  loadingTitle: { fontSize: 16 },
  loadingText: { fontSize: 14 },
  reviewSection: { gap: 16, marginTop: 12 },
  narrativeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    gap: 10,
  },
  narrativeText: { fontSize: 15, lineHeight: 28 },
  themeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  themesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  themeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeText: { fontSize: 13 },
  highlightsCol: { gap: 10 },
  highlightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  highlightDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  highlightPeriod: { fontSize: 13, marginBottom: 4 },
  highlightNote: { fontSize: 14, lineHeight: 22 },
  growthCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  growthText: { fontSize: 15, lineHeight: 26 },
  encourageCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 18,
    gap: 10,
  },
  encourageTitle: { fontSize: 15 },
  encourageText: { fontSize: 15, lineHeight: 26 },
  regenBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    marginTop: 4,
  },
  regenText: { fontSize: 14 },
  emptyState: { alignItems: "center", paddingTop: 40, gap: 14, paddingHorizontal: 16 },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { fontSize: 20, textAlign: "center" },
  emptyText: { fontSize: 15, lineHeight: 24, textAlign: "center" },
});
