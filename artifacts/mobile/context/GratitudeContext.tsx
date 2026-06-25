import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

import { getTodayString } from "@/utils/dates";

export interface GratitudeNote {
  id: string;
  text: string;
  date: string;
  createdAt: number;
}

interface GratitudeContextValue {
  notes: GratitudeNote[];
  addNote: (text: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  randomNote: () => GratitudeNote | null;
}

const STORAGE_KEY = "@gratitude_notes";
const GratitudeContext = createContext<GratitudeContextValue | null>(null);

export function GratitudeProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<GratitudeNote[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => { if (raw) setNotes(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const persist = useCallback(async (updated: GratitudeNote[]) => {
    setNotes(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const addNote = useCallback(async (text: string) => {
    const note: GratitudeNote = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text: text.trim(),
      date: getTodayString(),
      createdAt: Date.now(),
    };
    await persist([note, ...notes]);
  }, [notes, persist]);

  const deleteNote = useCallback(async (id: string) => {
    await persist(notes.filter((n) => n.id !== id));
  }, [notes, persist]);

  const randomNote = useCallback((): GratitudeNote | null => {
    if (notes.length === 0) return null;
    return notes[Math.floor(Math.random() * notes.length)];
  }, [notes]);

  return (
    <GratitudeContext.Provider value={{ notes, addNote, deleteNote, randomNote }}>
      {children}
    </GratitudeContext.Provider>
  );
}

export function useGratitude() {
  const ctx = useContext(GratitudeContext);
  if (!ctx) throw new Error("useGratitude must be used within GratitudeProvider");
  return ctx;
}
