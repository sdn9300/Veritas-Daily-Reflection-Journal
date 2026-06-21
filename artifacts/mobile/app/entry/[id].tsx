import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useLayoutEffect } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getMoodColor } from "@/components/MoodPicker";
import { useJournal } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";
import { formatDisplayDate } from "@/utils/dates";

const MOOD_LABELS: Record<string, string> = {
  great: "Great",
  good: "Good",
  okay: "Okay",
  bad: "Bad",
  awful: "Awful",
};

export default function EntryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { getEntry, deleteEntry } = useJournal();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const entry = getEntry(id ?? "");

  const handleDelete = () => {
    Alert.alert("Delete Entry", "Are you sure you want to delete this entry?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (entry) {
            await deleteEntry(entry.id);
            router.back();
          }
        },
      },
    ]);
  };

  if (!entry) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={[styles.notFoundText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Entry not found.
        </Text>
      </View>
    );
  }

  const moodColor = getMoodColor(entry.mood, isDark);
  const botPad = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.navBar, { paddingTop: insets.top + (Platform.OS === "web" ? 20 : 12), borderBottomColor: colors.border, backgroundColor: colors.background }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} hitSlop={12}>
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom, 24) + botPad }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.dateText, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
          {formatDisplayDate(entry.date)}
        </Text>

        <View style={[styles.moodRow, { backgroundColor: moodColor + "22", borderColor: moodColor + "55" }]}>
          <View style={[styles.moodDot, { backgroundColor: moodColor }]} />
          <Text style={[styles.moodLabel, { color: moodColor, fontFamily: "Inter_600SemiBold" }]}>
            Feeling {MOOD_LABELS[entry.mood]}
          </Text>
        </View>

        {entry.content ? (
          <View style={styles.block}>
            <Text style={[styles.blockLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              Thoughts
            </Text>
            <Text style={[styles.bodyText, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
              {entry.content}
            </Text>
          </View>
        ) : null}

        {entry.reflection ? (
          <View style={styles.block}>
            <Text style={[styles.blockLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
              Reflection
            </Text>
            <View style={[styles.promptBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.promptText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                {entry.prompt}
              </Text>
            </View>
            <Text style={[styles.bodyText, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
              {entry.reflection}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  deleteBtn: {
    padding: 4,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 0,
  },
  dateText: {
    fontSize: 24,
    lineHeight: 34,
    marginBottom: 14,
  },
  moodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 28,
  },
  moodDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  moodLabel: {
    fontSize: 14,
  },
  block: {
    marginBottom: 24,
    gap: 10,
  },
  blockLabel: {
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  promptBox: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  promptText: {
    fontSize: 14,
    lineHeight: 22,
  },
  bodyText: {
    fontSize: 17,
    lineHeight: 28,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  notFoundText: {
    fontSize: 16,
  },
});
