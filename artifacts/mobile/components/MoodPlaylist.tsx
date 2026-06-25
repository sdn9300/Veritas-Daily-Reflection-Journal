import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
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

interface Song {
  title: string;
  artist: string;
  reason: string;
  emoji: string;
}

interface Props {
  mood: string;
  content: string;
  reflection: string;
}

const BASE_URL =
  Platform.OS === "web"
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/api`
    : `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

export function MoodPlaylist({ mood, content, reflection }: Props) {
  const colors = useColors();
  const [songs, setSongs] = useState<Song[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetched, setFetched] = useState(false);

  async function fetchPlaylist() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BASE_URL}/insights/playlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood, content, reflection }),
      });
      if (!res.ok) throw new Error("Server error");
      const data = await res.json() as { songs: Song[] };
      setSongs(data.songs ?? []);
      setFetched(true);
    } catch {
      setError("Couldn't generate playlist. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function openSearch(song: Song) {
    const query = encodeURIComponent(`${song.title} ${song.artist}`);
    Linking.openURL(`https://open.spotify.com/search/${query}`);
  }

  if (!fetched && !loading) {
    return (
      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <TouchableOpacity
          style={[styles.promptCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={fetchPlaylist}
          activeOpacity={0.8}
        >
          <View style={[styles.promptIcon, { backgroundColor: colors.muted }]}>
            <Text style={styles.noteEmoji}>🎵</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.promptTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
              Today's mood playlist
            </Text>
            <Text style={[styles.promptSub, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
              5 songs curated to match your day
            </Text>
          </View>
          <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
          Curating your playlist…
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.loadingBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.loadingText, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>{error}</Text>
        <TouchableOpacity onPress={fetchPlaylist}>
          <Text style={[styles.retry, { color: colors.primary, fontFamily: "Inter_600SemiBold" }]}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]}>
          🎵 Your mood playlist
        </Text>
        <TouchableOpacity
          onPress={() => { setFetched(false); setSongs(null); }}
          hitSlop={10}
        >
          <Feather name="refresh-cw" size={14} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>
      {(songs ?? []).map((song, i) => (
        <Animated.View
          key={i}
          entering={FadeInDown.duration(300).delay(i * 60)}
          style={[styles.songCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={styles.songEmoji}>{song.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.songTitle, { color: colors.foreground, fontFamily: "Inter_600SemiBold" }]} numberOfLines={1}>
              {song.title}
            </Text>
            <Text style={[styles.songArtist, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
              {song.artist}
            </Text>
            <Text style={[styles.songReason, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]} numberOfLines={2}>
              {song.reason}
            </Text>
          </View>
          <TouchableOpacity onPress={() => openSearch(song)} hitSlop={8} style={styles.spotifyBtn}>
            <Feather name="external-link" size={14} color={colors.primary} />
          </TouchableOpacity>
        </Animated.View>
      ))}
      <Text style={[styles.hint, { color: colors.mutedForeground, fontFamily: "Inter_400Regular" }]}>
        Tap ↗ to search on Spotify
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  promptCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  promptIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  noteEmoji: { fontSize: 18 },
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
  container: { gap: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  headerTitle: { fontSize: 14 },
  songCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  songEmoji: { fontSize: 20, lineHeight: 26 },
  songTitle: { fontSize: 14 },
  songArtist: { fontSize: 12, marginTop: 1 },
  songReason: { fontSize: 12, lineHeight: 18, marginTop: 4 },
  spotifyBtn: { paddingTop: 2 },
  hint: { fontSize: 11, textAlign: "center", marginTop: 2 },
});
