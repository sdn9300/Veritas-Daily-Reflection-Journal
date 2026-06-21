import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

interface Recommendation {
  emoji: string;
  title: string;
  description: string;
}

interface Props {
  mood: string;
  content: string;
  reflection: string;
  prompt: string;
}

const BASE_URL =
  Platform.OS === "web"
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api`
    : `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export function DayRecommendations({ mood, content, reflection, prompt }: Props) {
  const colors = useColors();
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  async function fetchRecs() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/insights/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, content, reflection, prompt }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json() as { recommendations: Recommendation[] };
      setRecs(data.recommendations ?? []);
      setFetched(true);
    } catch {
      setError("Couldn't load recommendations. Try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!fetched && !loading) {
    return (
      <Animated.View entering={FadeInDown.duration(400).delay(100)}>
        <TouchableOpacity
          style={[styles.promptCard, { backgroundColor: colors.primary + "12", borderColor: colors.primary + "30" }]}
          onPress={fetchRecs}
          activeOpacity={0.8}
        >
          <View style={[styles.promptIcon, { backgroundColor: colors.primary + "20" }]}>
            <Text style={styles.star}>✨</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.promptTitle, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>
              How to make tomorrow better
            </Text>
            <Text style={[styles.promptSub, { color: colors.primary + "BB", fontFamily: "Inter_400Regular" }]}>
              Get AI coaching based on today's entry
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.primary + "80"} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Thinking about your day…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          {error}
        </Text>
        <TouchableOpacity onPress={fetchRecs}>
          <Text style={[styles.retry, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.recsContainer}>
      <View style={styles.recsHeader}>
        <Text style={[styles.recsTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          ✨ For a better tomorrow
        </Text>
        <TouchableOpacity onPress={() => { setFetched(false); setRecs(null); }} hitSlop={10}>
          <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
      {(recs ?? []).map((rec, i) => (
        <Animated.View
          key={i}
          entering={FadeInDown.duration(350).delay(i * 80)}
          style={[styles.recCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={styles.recEmoji}>{rec.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.recTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              {rec.title}
            </Text>
            <Text style={[styles.recDesc, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              {rec.description}
            </Text>
          </View>
        </Animated.View>
      ))}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  promptCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
  },
  promptIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  star: { fontSize: 18 },
  promptTitle: { fontSize: 15 },
  promptSub: { fontSize: 12, marginTop: 2 },
  loadingBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
  loadingText: { fontSize: 14 },
  retry: { fontSize: 14 },
  recsContainer: { gap: 10 },
  recsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  recsTitle: { fontSize: 14 },
  recCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  recEmoji: { fontSize: 22, lineHeight: 28 },
  recTitle: { fontSize: 14, marginBottom: 4 },
  recDesc: { fontSize: 13, lineHeight: 20 },
});
