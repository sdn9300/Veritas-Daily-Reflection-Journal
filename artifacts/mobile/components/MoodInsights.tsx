import React, { useMemo } from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { Feather } from "@expo/vector-icons";

import type { JournalEntry, Mood } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";

const MOOD_VALUES: Record<Mood, number> = {
  great: 5, good: 4, okay: 3, bad: 2, awful: 1,
};

const MOOD_COLORS_LIGHT: Record<Mood, string> = {
  great: "#2D5016", good: "#3B7A34", okay: "#78716C", bad: "#C2410C", awful: "#9B1C1C",
};
const MOOD_COLORS_DARK: Record<Mood, string> = {
  great: "#7EC850", good: "#5FA844", okay: "#A09888", bad: "#EA5724", awful: "#F87171",
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MOOD_DISPLAY: Record<Mood, string> = { great: "Great", good: "Good", okay: "Okay", bad: "Bad", awful: "Awful" };

interface InsightItem {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

interface Props {
  entries: JournalEntry[];
  currentMonthEntries: JournalEntry[];
  totalDaysThisMonth: number;
}

export function MoodInsights({ entries, currentMonthEntries, totalDaysThisMonth }: Props) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const moodColors = isDark ? MOOD_COLORS_DARK : MOOD_COLORS_LIGHT;

  const insights: InsightItem[] = useMemo(() => {
    const result: InsightItem[] = [];

    if (currentMonthEntries.length === 0) return result;

    const consistency = Math.round((currentMonthEntries.length / totalDaysThisMonth) * 100);
    result.push({
      icon: "calendar",
      label: "Monthly consistency",
      value: `${consistency}%`,
      sub: `${currentMonthEntries.length} of ${totalDaysThisMonth} days journaled`,
      color: consistency >= 70 ? moodColors.great : consistency >= 40 ? moodColors.good : moodColors.okay,
    });

    const moodCounts: Record<Mood, number> = { great: 0, good: 0, okay: 0, bad: 0, awful: 0 };
    for (const e of currentMonthEntries) moodCounts[e.mood]++;
    const topMood = (Object.entries(moodCounts) as [Mood, number][])
      .sort((a, b) => b[1] - a[1])[0];
    result.push({
      icon: "smile",
      label: "Most frequent mood",
      value: MOOD_DISPLAY[topMood[0]],
      sub: `${topMood[1]} time${topMood[1] !== 1 ? "s" : ""} this month`,
      color: moodColors[topMood[0]],
    });

    if (currentMonthEntries.length >= 3) {
      const sorted = [...currentMonthEntries].sort((a, b) => a.date.localeCompare(b.date));
      const half = Math.ceil(sorted.length / 2);
      const firstHalf = sorted.slice(0, half);
      const secondHalf = sorted.slice(half);
      const firstAvg = firstHalf.reduce((s, e) => s + MOOD_VALUES[e.mood], 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((s, e) => s + MOOD_VALUES[e.mood], 0) / secondHalf.length;
      const diff = secondAvg - firstAvg;
      const trendLabel = diff > 0.3 ? "Improving" : diff < -0.3 ? "Declining" : "Stable";
      const trendIcon: React.ComponentProps<typeof Feather>["name"] =
        diff > 0.3 ? "trending-up" : diff < -0.3 ? "trending-down" : "minus";
      const trendColor = diff > 0.3 ? moodColors.great : diff < -0.3 ? moodColors.bad : moodColors.okay;
      result.push({
        icon: trendIcon,
        label: "Monthly trend",
        value: trendLabel,
        sub: diff > 0.3 ? "Things are looking up!" : diff < -0.3 ? "Consider more self-care" : "Steady and consistent",
        color: trendColor,
      });
    }

    const dayCounts: Record<number, { count: number; total: number }> = {};
    for (const e of entries) {
      const [year, month, day] = e.date.split("-").map(Number);
      const dow = new Date(year, month - 1, day).getDay();
      if (!dayCounts[dow]) dayCounts[dow] = { count: 0, total: 0 };
      dayCounts[dow].count++;
      dayCounts[dow].total += MOOD_VALUES[e.mood];
    }
    const bestDay = Object.entries(dayCounts)
      .filter(([, v]) => v.count >= 2)
      .sort(([, a], [, b]) => b.total / b.count - a.total / a.count)[0];
    if (bestDay) {
      result.push({
        icon: "sun",
        label: "Best mood day",
        value: DAY_NAMES[Number(bestDay[0])],
        sub: `Avg ${(bestDay[1].total / bestDay[1].count).toFixed(1)}/5 across ${bestDay[1].count} entries`,
        color: moodColors.good,
      });
    }

    return result;
  }, [currentMonthEntries, totalDaysThisMonth, entries, moodColors]);

  const recommendations = useMemo(() => {
    const recs: string[] = [];
    if (currentMonthEntries.length === 0) return recs;

    const consistency = (currentMonthEntries.length / totalDaysThisMonth) * 100;
    if (consistency < 40) {
      recs.push("Set a daily reminder at a consistent time — even 5 minutes of journaling builds the habit.");
    } else if (consistency < 70) {
      recs.push("You're journaling regularly! Try linking it to an existing habit like morning coffee or bedtime.");
    }

    const badDays = currentMonthEntries.filter((e) => e.mood === "bad" || e.mood === "awful").length;
    const total = currentMonthEntries.length;
    if (badDays / total > 0.4) {
      recs.push("More than 40% of your entries this month show difficult days. Consider adding a brief gratitude note — even one line — to shift perspective.");
    }

    const sorted = [...currentMonthEntries].sort((a, b) => a.date.localeCompare(b.date));
    if (sorted.length >= 3) {
      const half = Math.ceil(sorted.length / 2);
      const firstAvg = sorted.slice(0, half).reduce((s, e) => s + MOOD_VALUES[e.mood], 0) / half;
      const secondAvg = sorted.slice(half).reduce((s, e) => s + MOOD_VALUES[e.mood], 0) / (sorted.length - half);
      if (secondAvg - firstAvg < -0.5) {
        recs.push("Your mood has been declining as the month goes on. Review your reflections for recurring stressors you can address proactively.");
      } else if (secondAvg - firstAvg > 0.5) {
        recs.push("Your mood is improving as the month progresses — keep doing what's working and note what changed.");
      }
    }

    const dayCounts: Record<number, { count: number; total: number }> = {};
    for (const e of entries) {
      const [year, month, day] = e.date.split("-").map(Number);
      const dow = new Date(year, month - 1, day).getDay();
      if (!dayCounts[dow]) dayCounts[dow] = { count: 0, total: 0 };
      dayCounts[dow].count++;
      dayCounts[dow].total += MOOD_VALUES[e.mood];
    }
    const worstDay = Object.entries(dayCounts)
      .filter(([, v]) => v.count >= 2)
      .sort(([, a], [, b]) => a.total / a.count - b.total / b.count)[0];
    if (worstDay) {
      recs.push(`${DAY_NAMES[Number(worstDay[0])]}s tend to be your toughest days. Try planning something energising or restorative the evening before.`);
    }

    return recs.slice(0, 3);
  }, [currentMonthEntries, totalDaysThisMonth, entries]);

  if (insights.length === 0 && recommendations.length === 0) return null;

  return (
    <View style={styles.container}>
      {insights.length > 0 && (
        <View style={styles.statsGrid}>
          {insights.map((item, i) => (
            <View
              key={i}
              style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Feather name={item.icon} size={14} color={item.color ?? colors.primary} />
              <Text style={[styles.statLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {item.label}
              </Text>
              <Text style={[styles.statValue, { color: item.color ?? colors.foreground, fontFamily: "Inter_700Bold" }]}>
                {item.value}
              </Text>
              {item.sub && (
                <Text style={[styles.statSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {item.sub}
                </Text>
              )}
            </View>
          ))}
        </View>
      )}

      {recommendations.length > 0 && (
        <View style={styles.recsBlock}>
          <View style={styles.recsTitleRow}>
            <Feather name="arrow-up-circle" size={14} color={colors.primary} />
            <Text style={[styles.recsTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Suggestions
            </Text>
          </View>
          {recommendations.map((rec, i) => (
            <View key={i} style={[styles.recRow, { borderLeftColor: colors.primary + "66" }]}>
              <Text style={[styles.recText, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}>
                {rec}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16 },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 3,
    minWidth: "46%",
    flex: 1,
  },
  statLabel: { fontSize: 11, marginTop: 2 },
  statValue: { fontSize: 18, lineHeight: 24 },
  statSub: { fontSize: 11, lineHeight: 16 },
  recsBlock: { gap: 8 },
  recsTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  recsTitle: { fontSize: 14 },
  recRow: {
    borderLeftWidth: 2,
    paddingLeft: 12,
    paddingVertical: 4,
  },
  recText: { fontSize: 13, lineHeight: 20 },
});
