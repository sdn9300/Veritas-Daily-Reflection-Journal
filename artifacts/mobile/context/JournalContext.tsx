import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { formatDateString, getTodayString, sortDateDescending } from "@/utils/dates";

export type Mood = "great" | "good" | "okay" | "bad" | "awful";

export interface JournalEntry {
  id: string;
  date: string;
  content: string;
  mood: Mood;
  prompt: string;
  reflection: string;
  createdAt: number;
  updatedAt: number;
}

interface JournalContextValue {
  entries: JournalEntry[];
  todayEntry: JournalEntry | null;
  streak: number;
  totalEntries: number;
  isLoading: boolean;
  saveEntry: (data: {
    content: string;
    mood: Mood;
    prompt: string;
    reflection: string;
    date?: string;
  }) => Promise<void>;
  getEntry: (id: string) => JournalEntry | undefined;
  deleteEntry: (id: string) => Promise<void>;
}

const STORAGE_KEY = "@journal_entries";

const JournalContext = createContext<JournalContextValue | null>(null);

function computeStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;

  const dates = new Set(entries.map((e) => e.date));
  const today = getTodayString();
  let streak = 0;
  let checkDate = new Date();

  if (!dates.has(today)) {
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterday = formatDateString(checkDate);
    if (!dates.has(yesterday)) return 0;
    checkDate.setDate(checkDate.getDate() - 1);
    streak = 0;
    let cur = yesterday;
    while (dates.has(cur)) {
      streak++;
      checkDate = new Date(cur);
      checkDate.setDate(checkDate.getDate() - 1);
      cur = formatDateString(checkDate);
    }
    return streak;
  }

  let cur = today;
  while (dates.has(cur)) {
    streak++;
    const d = new Date(cur);
    d.setDate(d.getDate() - 1);
    cur = formatDateString(d);
  }
  return streak;
}

export function JournalProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEntries();
  }, []);

  const loadEntries = async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: JournalEntry[] = JSON.parse(raw);
        parsed.sort((a, b) => sortDateDescending(a.date, b.date));
        setEntries(parsed);
      }
    } catch (e) {
    } finally {
      setIsLoading(false);
    }
  };

  const saveEntry = useCallback(
    async (data: {
      content: string;
      mood: Mood;
      prompt: string;
      reflection: string;
      date?: string;
    }) => {
      const date = data.date ?? getTodayString();
      const existing = entries.find((e) => e.date === date);
      let updated: JournalEntry[];

      if (existing) {
        const refreshed: JournalEntry = {
          ...existing,
          content: data.content,
          mood: data.mood,
          prompt: data.prompt,
          reflection: data.reflection,
          updatedAt: Date.now(),
        };
        updated = entries.map((e) => (e.date === date ? refreshed : e));
      } else {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
        const entry: JournalEntry = {
          id,
          date,
          content: data.content,
          mood: data.mood,
          prompt: data.prompt,
          reflection: data.reflection,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        updated = [entry, ...entries];
      }

      updated.sort((a, b) => sortDateDescending(a.date, b.date));
      setEntries(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [entries]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      const updated = entries.filter((e) => e.id !== id);
      setEntries(updated);
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    },
    [entries]
  );

  const getEntry = useCallback(
    (id: string) => entries.find((e) => e.id === id),
    [entries]
  );

  const today = getTodayString();
  const todayEntry = entries.find((e) => e.date === today) ?? null;
  const streak = computeStreak(entries);

  return (
    <JournalContext.Provider
      value={{
        entries,
        todayEntry,
        streak,
        totalEntries: entries.length,
        isLoading,
        saveEntry,
        getEntry,
        deleteEntry,
      }}
    >
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal() {
  const ctx = useContext(JournalContext);
  if (!ctx) throw new Error("useJournal must be used within JournalProvider");
  return ctx;
}
