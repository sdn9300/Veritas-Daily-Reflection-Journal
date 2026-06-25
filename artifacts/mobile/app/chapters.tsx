import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";

import { EntryCard } from "@/components/EntryCard";
import { useJournal } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";

const CHAPTER_COLORS = [
  "#2D5016", "#C2410C", "#1D4ED8", "#7C3AED", "#B45309",
  "#0F766E", "#9D174D", "#1E40AF", "#065F46", "#92400E",
];

function chapterColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return CHAPTER_COLORS[Math.abs(hash) % CHAPTER_COLORS.length];
}

export default function ChaptersScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { entries, chapters, addChapter, removeChapter, setEntryChapter } = useJournal();

  const [newChapterName, setNewChapterName] = useState("");
  const [selectedChapter, setSelectedChapter] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;

  const chapterStats = useMemo(() => {
    return chapters.map((ch) => ({
      name: ch,
      count: entries.filter((e) => e.chapter === ch).length,
      color: chapterColor(ch),
    }));
  }, [chapters, entries]);

  const filteredEntries = useMemo(() => {
    if (!selectedChapter) return entries.filter((e) => !e.chapter);
    return entries.filter((e) => e.chapter === selectedChapter);
  }, [entries, selectedChapter]);

  function handleAddChapter() {
    const name = newChapterName.trim();
    if (!name) return;
    if (chapters.includes(name)) {
      Alert.alert("Chapter exists", `"${name}" is already a chapter.`);
      return;
    }
    addChapter(name);
    setNewChapterName("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleRemoveChapter(name: string) {
    Alert.alert(
      "Remove chapter",
      `Remove "${name}"? Entries will become uncategorized.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: () => {
          removeChapter(name);
          if (selectedChapter === name) setSelectedChapter(null);
        }},
      ]
    );
  }

  function handleAssign(entryId: string) {
    if (chapters.length === 0) {
      Alert.alert("No chapters", "Create a chapter first.");
      return;
    }
    Alert.alert(
      "Add to chapter",
      "Choose a chapter for this entry:",
      [
        ...chapters.map((ch) => ({
          text: ch,
          onPress: () => setEntryChapter(entryId, ch),
        })),
        { text: "Remove from chapter", style: "destructive" as const, onPress: () => setEntryChapter(entryId, undefined) },
        { text: "Cancel", style: "cancel" as const },
      ]
    );
  }

  const uncategorizedCount = entries.filter((e) => !e.chapter).length;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.duration(250).delay(index * 25)}>
            <View>
              <EntryCard entry={item} />
              <TouchableOpacity
                style={[styles.assignBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => handleAssign(item.id)}
              >
                <Feather name="folder-plus" size={12} color={colors.mutedForeground} />
                <Text style={[styles.assignBtnText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {item.chapter ? `📁 ${item.chapter}` : "Add to chapter"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPad + 16, paddingBottom: Math.max(insets.bottom, 24) + 40 },
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.navBar}>
              <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
                <Feather name="arrow-left" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <Text style={[styles.title, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
                Life Chapters
              </Text>
              <View style={{ width: 30 }} />
            </View>

            <View style={[styles.addRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TextInput
                style={[styles.addInput, { color: colors.foreground, fontFamily: "Inter_400Regular" }]}
                placeholder="New chapter name…"
                placeholderTextColor={colors.mutedForeground}
                value={newChapterName}
                onChangeText={setNewChapterName}
                onSubmitEditing={handleAddChapter}
                returnKeyType="done"
              />
              <TouchableOpacity
                style={[styles.addChapterBtn, { backgroundColor: newChapterName.trim() ? colors.primary : colors.muted }]}
                onPress={handleAddChapter}
                disabled={!newChapterName.trim()}
                activeOpacity={0.8}
              >
                <Feather name="plus" size={18} color={newChapterName.trim() ? colors.primaryForeground : colors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {chapterStats.length > 0 && (
              <View style={styles.chipsScroll}>
                <TouchableOpacity
                  style={[styles.chip, {
                    backgroundColor: !selectedChapter ? colors.primary : colors.surface,
                    borderColor: !selectedChapter ? colors.primary : colors.border,
                  }]}
                  onPress={() => setSelectedChapter(null)}
                >
                  <Text style={[styles.chipText, {
                    color: !selectedChapter ? colors.primaryForeground : colors.foreground,
                    fontFamily: !selectedChapter ? "Inter_600SemiBold" : "Inter_400Regular",
                  }]}>
                    Uncategorized ({uncategorizedCount})
                  </Text>
                </TouchableOpacity>

                {chapterStats.map((ch) => (
                  <View key={ch.name} style={styles.chipWrap}>
                    <TouchableOpacity
                      style={[styles.chip, {
                        backgroundColor: selectedChapter === ch.name ? ch.color : colors.surface,
                        borderColor: selectedChapter === ch.name ? ch.color : colors.border,
                      }]}
                      onPress={() => setSelectedChapter(ch.name)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.chapterDot, { backgroundColor: ch.color }]} />
                      <Text style={[styles.chipText, {
                        color: selectedChapter === ch.name ? "#fff" : colors.foreground,
                        fontFamily: selectedChapter === ch.name ? "Inter_600SemiBold" : "Inter_400Regular",
                      }]}>
                        {ch.name} ({ch.count})
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveChapter(ch.name)}
                      hitSlop={8}
                      style={[styles.removeChip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                      <Feather name="x" size={10} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {filteredEntries.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                {selectedChapter ? selectedChapter.toUpperCase() : "UNCATEGORIZED"} · {filteredEntries.length}
              </Text>
            )}

            {filteredEntries.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📁</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
                  {chapters.length === 0
                    ? "Create your first chapter"
                    : selectedChapter
                    ? `No entries in "${selectedChapter}" yet`
                    : "All entries are categorized"}
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {chapters.length === 0
                    ? "Chapters let you group entries from different life periods — travel, work, relationships, growth."
                    : "Use the 'Add to chapter' button on any entry to organize it here."}
                </Text>
              </View>
            )}
          </>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 20 },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  title: { fontSize: 22 },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 6 : 4,
    marginBottom: 16,
    gap: 8,
  },
  addInput: { flex: 1, fontSize: 15, padding: 0, height: 38 },
  addChapterBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  chipsScroll: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chipWrap: { flexDirection: "row", alignItems: "center", gap: 2 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  chapterDot: { width: 7, height: 7, borderRadius: 4 },
  chipText: { fontSize: 13 },
  removeChip: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  assignBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  assignBtnText: { fontSize: 12 },
  emptyState: { alignItems: "center", paddingTop: 32, gap: 10, paddingHorizontal: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { fontSize: 18, textAlign: "center" },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: "center" },
});
