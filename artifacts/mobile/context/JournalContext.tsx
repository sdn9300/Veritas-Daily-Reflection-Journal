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
  chapter?: string;
}

interface JournalContextValue {
  entries: JournalEntry[];
  todayEntry: JournalEntry | null;
  streak: number;
  totalEntries: number;
  isLoading: boolean;
  chapters: string[];
  saveEntry: (data: {
    content: string;
    mood: Mood;
    prompt: string;
    reflection: string;
    date?: string;
    chapter?: string;
  }) => Promise<void>;
  getEntry: (id: string) => JournalEntry | undefined;
  deleteEntry: (id: string) => Promise<void>;
  addChapter: (name: string) => Promise<void>;
  removeChapter: (name: string) => Promise<void>;
  setEntryChapter: (id: string, chapter: string | undefined) => Promise<void>;
}

const STORAGE_KEY = "@journal_entries";
const CHAPTERS_KEY = "@journal_chapters";

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
  const [chapters, setChapters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(CHAPTERS_KEY),
    ]).then(([rawEntries, rawChapters]) => {
      if (rawEntries) {
        const parsed: JournalEntry[] = JSON.parse(rawEntries);
        parsed.sort((a, b) => sortDateDescending(a.date, b.date));
        setEntries(parsed);
      }
      if (rawChapters) setChapters(JSON.parse(rawChapters));
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, []);

  const persistEntries = useCallback(async (updated: JournalEntry[]) => {
    const sorted = [...updated].sort((a, b) => sortDateDescending(a.date, b.date));
    setEntries(sorted);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
  }, []);

  const persistChapters = useCallback(async (updated: string[]) => {
    setChapters(updated);
    await AsyncStorage.setItem(CHAPTERS_KEY, JSON.stringify(updated));
  }, []);

  const saveEntry = useCallback(
    async (data: {
      content: string;
      mood: Mood;
      prompt: string;
      reflection: string;
      date?: string;
      chapter?: string;
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
          chapter: data.chapter ?? existing.chapter,
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
          chapter: data.chapter,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        updated = [entry, ...entries];
      }

      await persistEntries(updated);
    },
    [entries, persistEntries]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      await persistEntries(entries.filter((e) => e.id !== id));
    },
    [entries, persistEntries]
  );

  const getEntry = useCallback(
    (id: string) => entries.find((e) => e.id === id),
    [entries]
  );

  const addChapter = useCallback(async (name: string) => {
    if (chapters.includes(name)) return;
    await persistChapters([...chapters, name]);
  }, [chapters, persistChapters]);

  const removeChapter = useCallback(async (name: string) => {
    const updated = entries.map((e) =>
      e.chapter === name ? { ...e, chapter: undefined } : e
    );
    await persistEntries(updated);
    await persistChapters(chapters.filter((c) => c !== name));
  }, [chapters, entries, persistEntries, persistChapters]);

  const setEntryChapter = useCallback(async (id: string, chapter: string | undefined) => {
    const updated = entries.map((e) =>
      e.id === id ? { ...e, chapter } : e
    );
    await persistEntries(updated);
  }, [entries, persistEntries]);

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
        chapters,
        saveEntry,
        getEntry,
        deleteEntry,
        addChapter,
        removeChapter,
        setEntryChapter,
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
