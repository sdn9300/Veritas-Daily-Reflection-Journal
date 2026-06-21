import React, { useMemo } from "react";
import { Text, View, StyleSheet, useWindowDimensions } from "react-native";
import Svg, {
  Path,
  Circle,
  Line,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
  G,
} from "react-native-svg";

import type { JournalEntry, Mood } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";
import { formatDateString } from "@/utils/dates";

const MOOD_VALUES: Record<Mood, number> = {
  great: 5,
  good: 4,
  okay: 3,
  bad: 2,
  awful: 1,
};

const MOOD_COLORS: Record<Mood, string> = {
  great: "#2D5016",
  good: "#3B7A34",
  okay: "#78716C",
  bad: "#C2410C",
  awful: "#9B1C1C",
};

const MOOD_COLORS_DARK: Record<Mood, string> = {
  great: "#7EC850",
  good: "#5FA844",
  okay: "#A09888",
  bad: "#EA5724",
  awful: "#F87171",
};

const MOOD_LABELS: Record<number, string> = {
  5: "Great",
  4: "Good",
  3: "Okay",
  2: "Bad",
  1: "Awful",
};

const PAD = { top: 12, right: 12, bottom: 32, left: 44 };
const CHART_HEIGHT = 180;
const DAYS = 30;

function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(formatDateString(d));
  }
  return days;
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

interface MoodChartProps {
  entries: JournalEntry[];
  isDark?: boolean;
}

export function MoodChart({ entries, isDark = false }: MoodChartProps) {
  const colors = useColors();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.min(screenWidth - 40, 400);

  const plotW = chartWidth - PAD.left - PAD.right;
  const plotH = CHART_HEIGHT - PAD.top - PAD.bottom;

  const days = useMemo(() => getLast30Days(), []);

  const entryByDate = useMemo(() => {
    const m: Record<string, Mood> = {};
    for (const e of entries) m[e.date] = e.mood;
    return m;
  }, [entries]);

  const dataPoints = useMemo(() => {
    return days
      .map((date, i) => {
        const mood = entryByDate[date];
        if (!mood) return null;
        const val = MOOD_VALUES[mood];
        const x = PAD.left + (i / (DAYS - 1)) * plotW;
        const y = PAD.top + ((5 - val) / 4) * plotH;
        return { x, y, mood, date, val };
      })
      .filter(Boolean) as { x: number; y: number; mood: Mood; date: string; val: number }[];
  }, [days, entryByDate, plotW, plotH]);

  const linePath = useMemo(
    () => smoothPath(dataPoints.map((p) => ({ x: p.x, y: p.y }))),
    [dataPoints]
  );

  const areaPath = useMemo(() => {
    if (dataPoints.length < 2) return "";
    const bottom = PAD.top + plotH;
    return (
      linePath +
      ` L ${dataPoints[dataPoints.length - 1].x} ${bottom}` +
      ` L ${dataPoints[0].x} ${bottom} Z`
    );
  }, [linePath, dataPoints, plotH]);

  const gridY = [1, 2, 3, 4, 5].map((v) => ({
    v,
    y: PAD.top + ((5 - v) / 4) * plotH,
  }));

  const xLabels = [0, 7, 14, 21, 29].map((i) => {
    const date = days[i];
    const [, month, day] = date.split("-").map(Number);
    return {
      x: PAD.left + (i / (DAYS - 1)) * plotW,
      label: `${month}/${day}`,
    };
  });

  const avgVal =
    dataPoints.length > 0
      ? dataPoints.reduce((s, p) => s + p.val, 0) / dataPoints.length
      : null;

  const avgY =
    avgVal !== null ? PAD.top + ((5 - avgVal) / 4) * plotH : null;

  const primaryColor = isDark ? "#7EC850" : "#2D5016";
  const textColor = colors.mutedForeground;
  const gridColor = colors.border;

  return (
    <View>
      <Svg width={chartWidth} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={primaryColor} stopOpacity="0.25" />
            <Stop offset="1" stopColor={primaryColor} stopOpacity="0.02" />
          </LinearGradient>
        </Defs>

        {gridY.map(({ v, y }) => (
          <G key={v}>
            <Line
              x1={PAD.left}
              y1={y}
              x2={PAD.left + plotW}
              y2={y}
              stroke={gridColor}
              strokeWidth={1}
              strokeDasharray={v === 3 ? "0" : "3 4"}
            />
            <SvgText
              x={PAD.left - 8}
              y={y + 4}
              fontSize={9}
              fill={textColor}
              textAnchor="end"
              fontFamily="Inter_400Regular"
            >
              {MOOD_LABELS[v]}
            </SvgText>
          </G>
        ))}

        {avgY !== null && (
          <Line
            x1={PAD.left}
            y1={avgY}
            x2={PAD.left + plotW}
            y2={avgY}
            stroke={primaryColor}
            strokeWidth={1}
            strokeDasharray="5 4"
            strokeOpacity={0.4}
          />
        )}

        {xLabels.map(({ x, label }) => (
          <SvgText
            key={label}
            x={x}
            y={CHART_HEIGHT - 4}
            fontSize={9}
            fill={textColor}
            textAnchor="middle"
            fontFamily="Inter_400Regular"
          >
            {label}
          </SvgText>
        ))}

        {areaPath ? (
          <Path d={areaPath} fill="url(#areaGrad)" />
        ) : null}

        {linePath ? (
          <Path
            d={linePath}
            stroke={primaryColor}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {dataPoints.map((p, i) => {
          const dotColor = isDark ? MOOD_COLORS_DARK[p.mood] : MOOD_COLORS[p.mood];
          return (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={4}
              fill={dotColor}
              stroke={colors.card}
              strokeWidth={1.5}
            />
          );
        })}
      </Svg>

      <View style={styles.legend}>
        {(Object.entries(MOOD_COLORS) as [Mood, string][]).map(([mood, color]) => (
          <View key={mood} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: isDark ? MOOD_COLORS_DARK[mood] : color }]} />
            <Text style={[styles.legendLabel, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {mood.charAt(0).toUpperCase() + mood.slice(1)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function getMoodAverage(entries: JournalEntry[]): number | null {
  if (entries.length === 0) return null;
  return entries.reduce((s, e) => s + MOOD_VALUES[e.mood], 0) / entries.length;
}

export function getMoodTrend(entries: JournalEntry[]): "improving" | "declining" | "stable" | null {
  if (entries.length < 2) return null;
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
  const first = sorted.slice(0, Math.ceil(sorted.length / 2));
  const second = sorted.slice(Math.ceil(sorted.length / 2));
  const firstAvg = first.reduce((s, e) => s + MOOD_VALUES[e.mood], 0) / first.length;
  const secondAvg = second.reduce((s, e) => s + MOOD_VALUES[e.mood], 0) / second.length;
  const diff = secondAvg - firstAvg;
  if (diff > 0.4) return "improving";
  if (diff < -0.4) return "declining";
  return "stable";
}

const styles = StyleSheet.create({
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  legendLabel: {
    fontSize: 11,
  },
});
