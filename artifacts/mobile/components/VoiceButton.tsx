import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
import { ActivityIndicator, Alert, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/hooks/useColors";

function getApiBase(): string {
  const domain = process.env.EXPO_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api`;
  return "/api";
}

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  size?: number;
}

export function VoiceButton({ onTranscript, disabled, size = 34 }: VoiceButtonProps) {
  const colors = useColors();
  const [state, setState] = useState<"idle" | "recording" | "transcribing">("idle");
  const scale = useSharedValue(1);

  const recordingRef = useRef<import("expo-av").Audio.Recording | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const interimRef = useRef("");

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function startPulse() {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.18, { duration: 550 }),
        withTiming(0.94, { duration: 550 })
      ),
      -1,
      true
    );
  }

  function stopPulse() {
    cancelAnimation(scale);
    scale.value = withTiming(1, { duration: 150 });
  }

  async function startWeb() {
    const SR = (window as unknown as { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (!SR) {
      Alert.alert("Not supported", "Voice input isn't available in this browser.");
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognitionRef.current = recognition;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interimText += t;
      }
      if (finalText) {
        interimRef.current = "";
        onTranscript(finalText.trim());
      } else {
        interimRef.current = interimText;
      }
    };

    recognition.onerror = () => {
      setState("idle");
      stopPulse();
    };

    recognition.onend = () => {
      setState("idle");
      stopPulse();
    };

    recognition.start();
    setState("recording");
    startPulse();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function stopWeb() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setState("idle");
    stopPulse();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function startNative() {
    try {
      const { Audio } = await import("expo-av");
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission needed", "Allow microphone access to use voice input.");
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setState("recording");
      startPulse();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      Alert.alert("Error", "Could not start recording.");
    }
  }

  async function stopNative() {
    stopPulse();
    setState("transcribing");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const recording = recordingRef.current;
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const { Audio } = await import("expo-av");
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      if (!uri) throw new Error("No recording URI");

      const FileSystem = await import("expo-file-system");
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const res = await fetch(`${getApiBase()}/insights/transcribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: base64, mimeType: "audio/m4a" }),
      });

      if (!res.ok) throw new Error("Transcription failed");
      const json = (await res.json()) as { text: string };
      if (json.text?.trim()) onTranscript(json.text.trim());
    } catch {
      Alert.alert("Transcription failed", "Could not convert speech to text. Please try again.");
    } finally {
      recordingRef.current = null;
      setState("idle");
    }
  }

  async function handlePress() {
    if (disabled) return;
    if (state === "recording") {
      Platform.OS === "web" ? stopWeb() : await stopNative();
    } else if (state === "idle") {
      Platform.OS === "web" ? await startWeb() : await startNative();
    }
  }

  const isRecording = state === "recording";
  const isTranscribing = state === "transcribing";

  const bgColor = isRecording
    ? "#DC2626"
    : colors.surface;
  const borderColor = isRecording ? "#DC2626" : colors.border;
  const iconColor = isRecording ? "#FFFFFF" : colors.mutedForeground;

  return (
    <Animated.View style={[pulseStyle, { borderRadius: size / 2 }]}>
      <TouchableOpacity
        style={[
          styles.btn,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: bgColor,
            borderColor,
          },
        ]}
        onPress={handlePress}
        disabled={disabled || isTranscribing}
        activeOpacity={0.75}
      >
        {isTranscribing ? (
          <ActivityIndicator size="small" color={colors.primary} />
        ) : (
          <Feather
            name={isRecording ? "square" : "mic"}
            size={size * 0.44}
            color={iconColor}
          />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
});
