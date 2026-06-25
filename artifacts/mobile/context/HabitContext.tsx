import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { formatDateString, getTodayString } from "@/utils/dates";

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  createdAt: number;
}

export interface HabitLog {
  id: string;
  habitId: string;
  date: string;
  completedAt: number;
}

interface HabitContextValue {
  habits: Habit[];
  logs: HabitLog[];
  addHabit: (name: string, emoji: string, color: string) => Promise<void>;
  deleteHabit: (id: string) => Promise<void>;
  toggleHabit: (habitId: string, date: string) => Promise<void>;
  isCompleted: (habitId: string, date: string) => boolean;
  getStreak: (habitId: string) => number;
  completedToday: number;
}

const HABITS_KEY = "@habits_v1";
const LOGS_KEY = "@habit_logs_v1";

const HabitContext = createContext<HabitContextValue | null>(null);

function computeStreak(habitId: string, logs: HabitLog[]): number {
  const dates = new Set(logs.filter((l) => l.habitId === habitId).map((l) => l.date));
  if (dates.size === 0) return 0;

  const today = getTodayString();
  let streak = 0;
  let checkDate = new Date();

  if (!dates.has(today)) {
    checkDate.setDate(checkDate.getDate() - 1);
  }

  let cur = formatDateString(checkDate);
  while (dates.has(cur)) {
    streak++;
    const d = new Date(cur);
    d.setDate(d.getDate() - 1);
    cur = formatDateString(d);
  }
  return streak;
}

export function HabitProvider({ children }: { children: React.ReactNode }) {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(HABITS_KEY),
      AsyncStorage.getItem(LOGS_KEY),
    ]).then(([h, l]) => {
      if (h) setHabits(JSON.parse(h));
      if (l) setLogs(JSON.parse(l));
    }).catch(() => {});
  }, []);

  const persistHabits = useCallback(async (updated: Habit[]) => {
    setHabits(updated);
    await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(updated));
  }, []);

  const persistLogs = useCallback(async (updated: HabitLog[]) => {
    setLogs(updated);
    await AsyncStorage.setItem(LOGS_KEY, JSON.stringify(updated));
  }, []);

  const addHabit = useCallback(async (name: string, emoji: string, color: string) => {
    const habit: Habit = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      emoji,
      color,
      createdAt: Date.now(),
    };
    await persistHabits([...habits, habit]);
  }, [habits, persistHabits]);

  const deleteHabit = useCallback(async (id: string) => {
    await persistHabits(habits.filter((h) => h.id !== id));
    await persistLogs(logs.filter((l) => l.habitId !== id));
  }, [habits, logs, persistHabits, persistLogs]);

  const toggleHabit = useCallback(async (habitId: string, date: string) => {
    const existing = logs.find((l) => l.habitId === habitId && l.date === date);
    if (existing) {
      await persistLogs(logs.filter((l) => l.id !== existing.id));
    } else {
      const log: HabitLog = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        habitId,
        date,
        completedAt: Date.now(),
      };
      await persistLogs([...logs, log]);
    }
  }, [logs, persistLogs]);

  const isCompleted = useCallback((habitId: string, date: string) => {
    return logs.some((l) => l.habitId === habitId && l.date === date);
  }, [logs]);

  const getStreak = useCallback((habitId: string) => {
    return computeStreak(habitId, logs);
  }, [logs]);

  const today = getTodayString();
  const completedToday = useMemo(() => {
    const todayLogs = new Set(logs.filter((l) => l.date === today).map((l) => l.habitId));
    return habits.filter((h) => todayLogs.has(h.id)).length;
  }, [habits, logs, today]);

  return (
    <HabitContext.Provider value={{ habits, logs, addHabit, deleteHabit, toggleHabit, isCompleted, getStreak, completedToday }}>
      {children}
    </HabitContext.Provider>
  );
}

export function useHabits() {
  const ctx = useContext(HabitContext);
  if (!ctx) throw new Error("useHabits must be used within HabitProvider");
  return ctx;
}
