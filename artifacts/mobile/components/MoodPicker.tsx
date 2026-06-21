import * as Haptics from "expo-haptics";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import type { Mood } from "@/context/JournalContext";
import { useColors } from "@/hooks/useColors";

interface MoodOption {
  value: Mood;
  label: string;
  color: string;
  darkColor: string;
}

const MOODS: MoodOption[] = [
  { value: "great", label: "Great", color: "#2D5016", darkColor: "#7EC850" },
  { value: "good", label: "Good", color: "#3B7A34", darkColor: "#5FA844" },
  { value: "okay", label: "Okay", color: "#78716C", darkColor: "#A09888" },
  { value: "bad", label: "Bad", color: "#C2410C", darkColor: "#EA5724" },
  { value: "awful", label: "Awful", color: "#9B1C1C", darkColor: "#F87171" },
];

interface MoodPickerProps {
  selected: Mood | null;
  onSelect: (mood: Mood) => void;
}

function MoodButton({
  option,
  isSelected,
  onPress,
}: {
  option: MoodOption;
  isSelected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const dotColor = colors.primary === "#2D5016" ? option.color : option.darkColor;

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
      <Animated.View
        style={[
          styles.moodBtn,
          {
            backgroundColor: isSelected ? dotColor : colors.surface,
            borderColor: isSelected ? dotColor : colors.border,
          },
          animStyle,
        ]}
      >
        <Text
          style={[
            styles.moodLabel,
            {
              color: isSelected ? "#FFFFFF" : colors.mutedForeground,
              fontFamily: "Inter_500Medium",
            },
          ]}
        >
          {option.label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

export function MoodPicker({ selected, onSelect }: MoodPickerProps) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.mutedForeground, fontFamily: "Inter_500Medium" }]}>
        How are you feeling?
      </Text>
      <View style={styles.row}>
        {MOODS.map((m) => (
          <MoodButton
            key={m.value}
            option={m}
            isSelected={selected === m.value}
            onPress={() => onSelect(m.value)}
          />
        ))}
      </View>
    </View>
  );
}

export function getMoodColor(mood: Mood, isDark = false): string {
  const m = MOODS.find((x) => x.value === mood);
  return m ? (isDark ? m.darkColor : m.color) : "#78716C";
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  label: {
    fontSize: 13,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  moodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  moodLabel: {
    fontSize: 14,
  },
});
