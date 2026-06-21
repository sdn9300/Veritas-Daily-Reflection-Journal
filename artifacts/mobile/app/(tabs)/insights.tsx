import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { MoodChart, getMoodAverage, getMoodTrend } from "@/components/MoodChart";
import { useJournal } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";
import { formatDateString } from "@/utils/dates";

interface Recommendation {
  title: string;
  body: string;
}

interface WeeklySummary {
  headline: string;
  moodPattern: string;
  keyThemes: string[];
  highlight: string;
  recommendations: Recommendation[];
  closingThought: string;
}

const TREND_LABELS = {
  improving: { label: "Trending up", icon: "trending-up" as const, color: "#2D5016" },
  declining: { label: "Trending down", icon: "trending-down" as const, color: "#C2410C" },
  stable: { label: "Holding steady", icon: "minus" as const, color: "#78716C" },
};

const MOOD_NAMES = ["", "Awful", "Bad", "Okay", "Good", "Great"];

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  return "/api";
}

function getLast7DaysEntries(entries: ReturnType<typeof useJournal>["entries"]) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  return entries.filter((e) => e.date >= formatDateString(cutoff));
}

function getLast30DaysEntries(entries: ReturnType<typeof useJournal>["entries"]) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);
  return entries.filter((e) => e.date >= formatDateString(cutoff));
}

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { entries } = useJournal();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recentEntries = getLast7DaysEntries(entries);
  const last30 = getLast30DaysEntries(entries);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const avg = getMoodAverage(last30);
  const trend = getMoodTrend(last30);
  const trendInfo = trend ? TREND_LABELS[trend] : null;
  const trendColor = trendInfo
    ? isDark
      ? trendInfo.color === "#2D5016" ? "#7EC850" : trendInfo.color
      : trendInfo.color
    : colors.mutedForeground;

  const handleGenerate = async () => {
    if (recentEntries.length === 0) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    try {
      const base = getApiBase();
      const res = await fetch(`${base}/insights/weekly`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entries: recentEntries }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error((json as { error?: string }).error ?? "Request failed");
      }
      const json = (await res.json()) as { summary: WeeklySummary };
      setSummary(json.summary);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.scroll,
        { paddingTop: topPad + 20, paddingBottom: botPad + 100 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View entering={FadeInDown.duration(400)}>
        <Text style={[styles.title, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
          Insights
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {last30.length > 0
            ? `${last30.length} entr${last30.length === 1 ? "y" : "ies"} in the past 30 days`
            : "No entries yet — start journaling today"}
        </Text>
      </Animated.View>

      {last30.length > 0 && (
        <Animated.View entering={FadeInDown.duration(400).delay(60)}>
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={[styles.chartTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  Mood over 30 days
                </Text>
                {avg !== null && (
                  <Text style={[styles.chartSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    Avg: {MOOD_NAMES[Math.round(avg)]} ({avg.toFixed(1)}/5)
                  </Text>
                )}
              </View>
              {trendInfo && (
                <View style={[styles.trendBadge, { backgroundColor: trendColor + "20", borderColor: trendColor + "44" }]}>
                  <Feather name={trendInfo.icon} size={13} color={trendColor} />
                  <Text style={[styles.trendLabel, { color: trendColor, fontFamily: "Inter_500Medium" }]}>
                    {trendInfo.label}
                  </Text>
                </View>
              )}
            </View>
            <MoodChart entries={last30} isDark={isDark} />
          </View>
        </Animated.View>
      )}

      {last30.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(400).delay(80)} style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="book-open" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
            Start journaling first
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Write at least one entry this week and come back for your AI-powered reflection.
          </Text>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.duration(400).delay(120)}>
          <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
            AI WEEKLY SUMMARY
          </Text>
          {recentEntries.length === 0 ? (
            <View style={[styles.noWeekCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.noWeekText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                No entries this week yet. Write something today to unlock your weekly summary.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.generateBtn, {
                backgroundColor: summary ? colors.secondary : colors.primary,
                opacity: loading ? 0.7 : 1,
              }]}
              onPress={handleGenerate}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={summary ? colors.foreground : colors.primaryForeground} />
              ) : (
                <>
                  <Feather name="zap" size={18} color={summary ? colors.foreground : colors.primaryForeground} />
                  <Text style={[styles.generateBtnText, { color: summary ? colors.foreground : colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                    {summary ? "Regenerate Summary" : `Analyse My Week (${recentEntries.length} entr${recentEntries.length === 1 ? "y" : "ies"})`}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </Animated.View>
      )}

      {error && (
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.errorCard, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "44" }]}>
          <Feather name="alert-circle" size={15} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
            {error}
          </Text>
        </Animated.View>
      )}

      {loading && !summary && (
        <View style={styles.loadingBlock}>
          <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Reflecting on your week…
          </Text>
        </View>
      )}

      {summary && (
        <>
          <Animated.View entering={FadeInDown.duration(400).delay(0)} style={[styles.headlineCard, { backgroundColor: colors.primary }]}>
            <Text style={[styles.headlineLabel, { color: colors.primaryForeground + "99", fontFamily: "Inter_500Medium" }]}>
              THIS WEEK
            </Text>
            <Text style={[styles.headlineText, { color: colors.primaryForeground, fontFamily: "Merriweather_700Bold" }]}>
              {summary.headline}
            </Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(400).delay(60)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Feather name="activity" size={16} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Mood Pattern
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
              {summary.moodPattern}
            </Text>
          </Animated.View>

          {summary.keyThemes?.length > 0 && (
            <Animated.View entering={FadeInDown.duration(400).delay(100)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.cardHeader}>
                <Feather name="tag" size={16} color={colors.primary} />
                <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  Key Themes
                </Text>
              </View>
              <View style={styles.themesRow}>
                {summary.keyThemes.map((theme, i) => (
                  <View key={i} style={[styles.themePill, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "44" }]}>
                    <Text style={[styles.themeText, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
                      {theme}
                    </Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.duration(400).delay(140)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Feather name="star" size={16} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Week Highlight
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
              {summary.highlight}
            </Text>
          </Animated.View>

          {summary.recommendations?.length > 0 && (
            <Animated.View entering={FadeInDown.duration(400).delay(180)}>
              <View style={styles.recHeader}>
                <Feather name="arrow-up-circle" size={16} color={colors.primary} />
                <Text style={[styles.recSectionTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                  Recommendations for You
                </Text>
              </View>
              {summary.recommendations.map((rec, i) => (
                <Animated.View
                  key={i}
                  entering={FadeInDown.duration(350).delay(200 + i * 60)}
                  style={[styles.recCard, {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                    borderLeftColor: colors.primary,
                  }]}
                >
                  <View style={styles.recNum}>
                    <Text style={[styles.recNumText, { color: colors.primaryForeground, fontFamily: "Inter_700Bold" }]}>
                      {i + 1}
                    </Text>
                  </View>
                  <View style={styles.recContent}>
                    <Text style={[styles.recTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                      {rec.title}
                    </Text>
                    <Text style={[styles.recBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                      {rec.body}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.duration(400).delay(360)} style={[styles.closingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Feather name="heart" size={16} color={colors.accent} />
            <Text style={[styles.closingText, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
              {summary.closingThought}
            </Text>
          </Animated.View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  title: { fontSize: 28, marginBottom: 4 },
  subtitle: { fontSize: 14, marginBottom: 20 },
  chartCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    overflow: "hidden",
  },
  chartHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  chartTitle: { fontSize: 15 },
  chartSub: { fontSize: 12, marginTop: 2 },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  trendLabel: { fontSize: 12 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 18, textAlign: "center" },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: "center" },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
  },
  noWeekCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  noWeekText: { fontSize: 14, lineHeight: 22 },
  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    paddingVertical: 16,
    marginBottom: 24,
  },
  generateBtnText: { fontSize: 16 },
  errorCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  errorText: { fontSize: 14, lineHeight: 20, flex: 1 },
  loadingBlock: { alignItems: "center", paddingVertical: 32 },
  loadingText: { fontSize: 15 },
  headlineCard: { borderRadius: 16, padding: 20, marginBottom: 12, gap: 6 },
  headlineLabel: { fontSize: 11, letterSpacing: 1 },
  headlineText: { fontSize: 20, lineHeight: 30 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { fontSize: 15 },
  cardBody: { fontSize: 15, lineHeight: 25 },
  themesRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  themePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeText: { fontSize: 13 },
  recHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
    marginTop: 4,
  },
  recSectionTitle: { fontSize: 15 },
  recCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 10,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  recNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2D5016",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  recNumText: { fontSize: 12 },
  recContent: { flex: 1, gap: 4 },
  recTitle: { fontSize: 15 },
  recBody: { fontSize: 14, lineHeight: 22 },
  closingCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginTop: 4,
  },
  closingText: { fontSize: 15, lineHeight: 24, flex: 1 },
});
