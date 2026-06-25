import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { getTodayString } from "@/utils/dates";

export interface TimeCapsule {
  id: string;
  message: string;
  writtenDate: string;
  revealDate: string;
  revealed: boolean;
}

interface TimeCapsuleContextValue {
  capsules: TimeCapsule[];
  pendingReveals: TimeCapsule[];
  addCapsule: (message: string, revealDate: string) => Promise<void>;
  markRevealed: (id: string) => Promise<void>;
  deleteCapsule: (id: string) => Promise<void>;
}

const STORAGE_KEY = "@time_capsules";
const TimeCapsuleContext = createContext<TimeCapsuleContextValue | null>(null);

export function TimeCapsuleProvider({ children }: { children: React.ReactNode }) {
  const [capsules, setCapsules] = useState<TimeCapsule[]>([]);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => { if (raw) setCapsules(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  const persist = useCallback(async (updated: TimeCapsule[]) => {
    setCapsules(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, []);

  const today = getTodayString();

  const pendingReveals = useMemo(
    () => capsules.filter((c) => !c.revealed && c.revealDate <= today),
    [capsules, today]
  );

  const addCapsule = useCallback(async (message: string, revealDate: string) => {
    const cap: TimeCapsule = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      message,
      writtenDate: getTodayString(),
      revealDate,
      revealed: false,
    };
    await persist([cap, ...capsules]);
  }, [capsules, persist]);

  const markRevealed = useCallback(async (id: string) => {
    await persist(capsules.map((c) => c.id === id ? { ...c, revealed: true } : c));
  }, [capsules, persist]);

  const deleteCapsule = useCallback(async (id: string) => {
    await persist(capsules.filter((c) => c.id !== id));
  }, [capsules, persist]);

  return (
    <TimeCapsuleContext.Provider value={{ capsules, pendingReveals, addCapsule, markRevealed, deleteCapsule }}>
      {children}
    </TimeCapsuleContext.Provider>
  );
}

export function useTimeCapsule() {
  const ctx = useContext(TimeCapsuleContext);
  if (!ctx) throw new Error("useTimeCapsule must be used within TimeCapsuleProvider");
  return ctx;
}
