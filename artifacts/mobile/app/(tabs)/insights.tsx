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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

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

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  return "/api";
}

function getLast7DaysEntries(entries: ReturnType<typeof useJournal>["entries"]) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = formatDateString(cutoff);
  return entries.filter((e) => e.date >= cutoffStr);
}

export default function InsightsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { entries } = useJournal();

  const [summary, setSummary] = useState<WeeklySummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recentEntries = getLast7DaysEntries(entries);
  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

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
          Weekly Insights
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {recentEntries.length > 0
            ? `Based on your ${recentEntries.length} entr${recentEntries.length === 1 ? "y" : "ies"} this week`
            : "No entries in the past 7 days"}
        </Text>
      </Animated.View>

      {recentEntries.length === 0 ? (
        <Animated.View entering={FadeInDown.duration(400).delay(80)} style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Feather name="book-open" size={32} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
            Start journaling first
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Write at least one entry this week and come back here for your AI-powered reflection.
          </Text>
        </Animated.View>
      ) : (
        <Animated.View entering={FadeInDown.duration(400).delay(80)}>
          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: summary ? colors.secondary : colors.primary, opacity: loading ? 0.7 : 1 }]}
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
                  {summary ? "Regenerate Summary" : "Generate Weekly Summary"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      )}

      {error && (
        <Animated.View entering={FadeInDown.duration(300)} style={[styles.errorCard, { backgroundColor: colors.destructive + "18", borderColor: colors.destructive + "44" }]}>
          <Text style={[styles.errorText, { color: colors.destructive, fontFamily: "Inter_400Regular" }]}>
            {error}
          </Text>
        </Animated.View>
      )}

      {loading && !summary && (
        <Animated.View entering={FadeInDown.duration(300)} style={styles.loadingBlock}>
          <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
            Reflecting on your week…
          </Text>
        </Animated.View>
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
            <Animated.View entering={FadeInDown.duration(400).delay(120)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

          <Animated.View entering={FadeInDown.duration(400).delay(180)} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeader}>
              <Feather name="star" size={16} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Highlight
              </Text>
            </View>
            <Text style={[styles.cardBody, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
              {summary.highlight}
            </Text>
          </Animated.View>

          {summary.recommendations?.length > 0 && (
            <Animated.View entering={FadeInDown.duration(400).delay(240)}>
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                RECOMMENDATIONS
              </Text>
              {summary.recommendations.map((rec, i) => (
                <View key={i} style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: colors.primary }]}>
                  <Text style={[styles.recTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                    {rec.title}
                  </Text>
                  <Text style={[styles.recBody, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                    {rec.body}
                  </Text>
                </View>
              ))}
            </Animated.View>
          )}

          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={[styles.closingCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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
  title: { fontSize: 28, marginBottom: 6 },
  subtitle: { fontSize: 14, marginBottom: 24 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: { fontSize: 18, textAlign: "center" },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: "center" },
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
  },
  errorText: { fontSize: 14, lineHeight: 20 },
  loadingBlock: {
    alignItems: "center",
    paddingVertical: 32,
  },
  loadingText: { fontSize: 15, marginTop: 8 },
  headlineCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    gap: 6,
  },
  headlineLabel: { fontSize: 11, letterSpacing: 1 },
  headlineText: { fontSize: 20, lineHeight: 30 },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    gap: 10,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardTitle: { fontSize: 15 },
  cardBody: { fontSize: 15, lineHeight: 25 },
  themesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  themePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeText: { fontSize: 13 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 4,
  },
  recCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: 14,
    marginBottom: 10,
    gap: 6,
  },
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
