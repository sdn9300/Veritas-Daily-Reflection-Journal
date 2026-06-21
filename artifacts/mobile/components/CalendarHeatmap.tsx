import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import type { JournalEntry, Mood } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";
import { formatDateString } from "@/utils/dates";

const MOOD_BG: Record<Mood, { light: string; dark: string }> = {
  great:  { light: "#2D5016", dark: "#7EC850" },
  good:   { light: "#3B7A34", dark: "#5FA844" },
  okay:   { light: "#78716C", dark: "#A09888" },
  bad:    { light: "#C2410C", dark: "#EA5724" },
  awful:  { light: "#9B1C1C", dark: "#F87171" },
};

const MOOD_TEXT: Record<Mood, { light: string; dark: string }> = {
  great:  { light: "#FFFFFF", dark: "#0F0E0B" },
  good:   { light: "#FFFFFF", dark: "#0F0E0B" },
  okay:   { light: "#FFFFFF", dark: "#0F0E0B" },
  bad:    { light: "#FFFFFF", dark: "#0F0E0B" },
  awful:  { light: "#FFFFFF", dark: "#0F0E0B" },
};

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MOOD_ORDER: Mood[] = ["great","good","okay","bad","awful"];
const MOOD_DISPLAY: Record<Mood, string> = { great:"Great", good:"Good", okay:"Okay", bad:"Bad", awful:"Awful" };

interface Props {
  entries: JournalEntry[];
}

export function CalendarHeatmap({ entries }: Props) {
  const colors = useColors();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const { width: screenWidth } = useWindowDimensions();

  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  const CELL_GAP = 4;
  const SIDE_PAD = 0;
  const totalGaps = 6 * CELL_GAP;
  const cellSize = Math.floor((Math.min(screenWidth - 40, 400) - SIDE_PAD * 2 - totalGaps) / 7);

  const entryByDate = useMemo(() => {
    const m: Record<string, JournalEntry> = {};
    for (const e of entries) m[e.date] = e;
    return m;
  }, [entries]);

  const { days, startOffset } = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days: number[] = [];
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return { days, startOffset: firstDay };
  }, [viewDate]);

  const todayStr = formatDateString(today);

  const prevMonth = () =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const nextMonth = () => {
    const next = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1);
    if (next <= new Date(today.getFullYear(), today.getMonth(), 1)) setViewDate(next);
  };
  const isNextDisabled =
    viewDate.getFullYear() === today.getFullYear() &&
    viewDate.getMonth() === today.getMonth();

  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...days,
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  function getDateStr(day: number) {
    const y = viewDate.getFullYear();
    const m = String(viewDate.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}-${String(day).padStart(2, "0")}`;
  }

  function isFuture(day: number) {
    const ds = getDateStr(day);
    return ds > todayStr;
  }

  return (
    <View>
      <View style={styles.navRow}>
        <TouchableOpacity onPress={prevMonth} hitSlop={12}>
          <Feather name="chevron-left" size={20} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.monthLabel, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          {MONTH_NAMES[viewDate.getMonth()]} {viewDate.getFullYear()}
        </Text>
        <TouchableOpacity onPress={nextMonth} disabled={isNextDisabled} hitSlop={12}>
          <Feather name="chevron-right" size={20} color={isNextDisabled ? colors.border : colors.foreground} />
        </TouchableOpacity>
      </View>

      <View style={[styles.dayLabelsRow, { gap: CELL_GAP }]}>
        {DAY_LABELS.map((d) => (
          <View key={d} style={{ width: cellSize, alignItems: "center" }}>
            <Text style={[styles.dayLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>{d}</Text>
          </View>
        ))}
      </View>

      {rows.map((row, ri) => (
        <View key={ri} style={[styles.weekRow, { gap: CELL_GAP, marginBottom: CELL_GAP }]}>
          {row.map((day, di) => {
            if (!day) {
              return <View key={di} style={{ width: cellSize, height: cellSize }} />;
            }
            const ds = getDateStr(day);
            const entry = entryByDate[ds];
            const future = isFuture(day);
            const isToday = ds === todayStr;
            const mood = entry?.mood;
            const bg = mood
              ? (isDark ? MOOD_BG[mood].dark : MOOD_BG[mood].light)
              : future
              ? "transparent"
              : colors.surface;
            const textColor = mood
              ? (isDark ? MOOD_TEXT[mood].dark : MOOD_TEXT[mood].light)
              : future
              ? colors.border
              : colors.mutedForeground;

            return (
              <TouchableOpacity
                key={di}
                style={[
                  styles.cell,
                  {
                    width: cellSize,
                    height: cellSize,
                    borderRadius: cellSize * 0.22,
                    backgroundColor: bg,
                    borderWidth: isToday ? 2 : future ? 1 : mood ? 0 : 1,
                    borderColor: isToday
                      ? colors.primary
                      : future
                      ? colors.border + "55"
                      : colors.border,
                  },
                ]}
                onPress={() => entry && router.push(`/entry/${entry.id}`)}
                activeOpacity={entry ? 0.7 : 1}
                disabled={!entry}
              >
                <Text
                  style={[
                    styles.dayNum,
                    {
                      color: textColor,
                      fontFamily: isToday ? "Inter_700Bold" : "Inter_400Regular",
                      fontSize: cellSize > 38 ? 13 : 11,
                    },
                  ]}
                >
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <View style={styles.legendRow}>
        {MOOD_ORDER.map((mood) => (
          <View key={mood} style={styles.legendItem}>
            <View
              style={[
                styles.legendSwatch,
                { backgroundColor: isDark ? MOOD_BG[mood].dark : MOOD_BG[mood].light },
              ]}
            />
            <Text style={[styles.legendText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {MOOD_DISPLAY[mood]}
            </Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]} />
          <Text style={[styles.legendText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>None</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  monthLabel: { fontSize: 16 },
  dayLabelsRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  dayLabel: { fontSize: 11 },
  weekRow: { flexDirection: "row" },
  cell: {
    alignItems: "center",
    justifyContent: "center",
  },
  dayNum: { lineHeight: undefined },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendText: { fontSize: 11 },
});
