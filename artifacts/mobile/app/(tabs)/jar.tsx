import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, FadeOutUp } from "react-native-reanimated";

import { type GratitudeNote, useGratitude } from "@/context/GratitudeContext";
import { useColors } from "@/hooks/useColors";
import { formatDisplayDate } from "@/utils/dates";

function NoteCard({ note, onDelete }: { note: GratitudeNote; onDelete: () => void }) {
  const colors = useColors();
  return (
    <Animated.View entering={FadeInDown.duration(280)} style={[styles.noteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.noteText, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
        {note.text}
      </Text>
      <View style={styles.noteMeta}>
        <Text style={[styles.noteDate, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {formatDisplayDate(note.date)}
        </Text>
        <TouchableOpacity onPress={onDelete} hitSlop={10}>
          <Feather name="trash-2" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function JarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { notes, addNote, deleteNote, randomNote } = useGratitude();

  const [text, setText] = useState("");
  const [adding, setAdding] = useState(false);
  const [surprise, setSurprise] = useState<GratitudeNote | null>(null);
  const inputRef = useRef<TextInput>(null);

  const topPad = Platform.OS === "web" ? Math.max(insets.top, 67) : insets.top;
  const botPad = Platform.OS === "web" ? 34 : insets.bottom;

  async function handleAdd() {
    if (!text.trim()) return;
    setAdding(true);
    await addNote(text.trim());
    setText("");
    setAdding(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    inputRef.current?.blur();
  }

  function handleSurprise() {
    const note = randomNote();
    if (!note) {
      Alert.alert("Jar is empty", "Add some gratitude notes first 🫙");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSurprise(note);
  }

  function handleDelete(id: string) {
    Alert.alert("Remove note", "Remove this from your jar?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: () => deleteNote(id) },
    ]);
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <NoteCard note={item} onDelete={() => handleDelete(item.id)} />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        contentContainerStyle={[
          styles.list,
          { paddingTop: topPad + 16, paddingBottom: botPad + 140 },
        ]}
        ListHeaderComponent={
          <>
            <View style={styles.headerRow}>
              <View>
                <Text style={[styles.title, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
                  Gratitude Jar 🫙
                </Text>
                <Text style={[styles.subtitle, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  {notes.length === 0
                    ? "Drop your first note in the jar"
                    : `${notes.length} ${notes.length === 1 ? "note" : "notes"} in your jar`}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.surpriseBtn, { backgroundColor: colors.primary }]}
                onPress={handleSurprise}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 16 }}>✨</Text>
                <Text style={[styles.surpriseBtnText, { color: colors.primaryForeground, fontFamily: "Inter_600SemiBold" }]}>
                  Surprise me
                </Text>
              </TouchableOpacity>
            </View>

            {notes.length === 0 && (
              <Animated.View entering={FadeIn.duration(400)} style={styles.emptyState}>
                <Text style={styles.jarIllustration}>🫙</Text>
                <Text style={[styles.emptyTitle, { color: colors.foreground, fontFamily: "Merriweather_700Bold" }]}>
                  Your jar is empty
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
                  Add things you're grateful for — big or small. On tough days, tap "Surprise me" to read a random note from your past self.
                </Text>
              </Animated.View>
            )}

            {notes.length > 0 && (
              <Text style={[styles.sectionLabel, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
                YOUR NOTES
              </Text>
            )}
          </>
        }
      />

      <View style={[
        styles.inputBar,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: botPad + 16,
        }
      ]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, {
            backgroundColor: colors.card,
            borderColor: colors.border,
            color: colors.foreground,
            fontFamily: "Inter_400Regular",
          }]}
          placeholder="I'm grateful for…"
          placeholderTextColor={colors.mutedForeground}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={300}
          returnKeyType="default"
        />
        <TouchableOpacity
          style={[styles.addBtn, {
            backgroundColor: text.trim() ? colors.primary : colors.muted,
            opacity: adding ? 0.7 : 1,
          }]}
          onPress={handleAdd}
          disabled={adding || !text.trim()}
          activeOpacity={0.8}
        >
          <Feather name="plus" size={22} color={text.trim() ? colors.primaryForeground : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <Modal visible={!!surprise} transparent animationType="fade" onRequestClose={() => setSurprise(null)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSurprise(null)}
        >
          <Animated.View
            entering={FadeInDown.duration(350).springify()}
            style={[styles.surpriseCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          >
            <Text style={styles.surpriseJar}>🫙</Text>
            <Text style={[styles.surpriseLabel, { color: colors.primary, fontFamily: "Inter_500Medium" }]}>
              From your past self · {surprise ? formatDisplayDate(surprise.date) : ""}
            </Text>
            <Text style={[styles.surpriseText, { color: colors.foreground, fontFamily: "Merriweather_400Regular" }]}>
              {surprise?.text}
            </Text>
            <TouchableOpacity
              style={[styles.closeBtn, { backgroundColor: colors.muted }]}
              onPress={() => setSurprise(null)}
            >
              <Text style={[styles.closeBtnText, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
                Close
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  title: { fontSize: 26 },
  subtitle: { fontSize: 13, marginTop: 4 },
  surpriseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 4,
  },
  surpriseBtnText: { fontSize: 14 },
  emptyState: { alignItems: "center", paddingTop: 24, paddingHorizontal: 16, gap: 12 },
  jarIllustration: { fontSize: 64 },
  emptyTitle: { fontSize: 20, textAlign: "center" },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: "center", color: "#999" },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 12,
  },
  noteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  noteText: { fontSize: 15, lineHeight: 24 },
  noteMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  noteDate: { fontSize: 12 },
  inputBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
  },
  addBtn: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  surpriseCard: {
    width: "100%",
    borderRadius: 20,
    borderWidth: 1,
    padding: 28,
    alignItems: "center",
    gap: 14,
  },
  surpriseJar: { fontSize: 48 },
  surpriseLabel: { fontSize: 13 },
  surpriseText: {
    fontSize: 18,
    lineHeight: 30,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  closeBtn: {
    marginTop: 8,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 12,
  },
  closeBtnText: { fontSize: 15 },
});
