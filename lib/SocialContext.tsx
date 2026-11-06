"use client";

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { ACCOUNTS, Post, Snapshot, checkinWeek as currentCheckinWeek, toISO } from "./social";
import { listRows, tableMode } from "./store";
import { syncCalendarWithFiles } from "./contentSync";

interface SocialContextType {
  snapshots: Snapshot[];
  posts: Post[];
  loading: boolean;
  /** alguna tabla nueva no existe todavía en Supabase: se guarda en este navegador */
  local: boolean;
  /** falta apuntar los seguidores de esta semana */
  pending: boolean;
  checkinWeek: string | null;
  openCheckin: (week?: string) => void;
  closeCheckin: (snooze?: boolean) => void;
  refresh: () => Promise<void>;
}

const SocialContext = createContext<SocialContextType | null>(null);
const SNOOZE = "aldia_checkin_snooze";

export default function SocialProvider({ children }: { children: ReactNode }) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState(false);
  const [checkinWeek, setCheckinWeek] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    await syncCalendarWithFiles();   // lo que haya entrado o salido de Archivos, al calendario
    const [s, p, m1, m2] = await Promise.all([
      listRows<Snapshot>("social_snapshots", "week_start"), listRows<Post>("content_posts", "publish_date"),
      tableMode("social_snapshots"), tableMode("content_posts"),
    ]);
    setSnapshots(s); setPosts(p); setLocal(m1 === "local" || m2 === "local"); setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const thisWeek = currentCheckinWeek();
  const pending = !loading && ACCOUNTS.some((a) => !snapshots.some((s) => s.account === a.id && s.week_start === thisWeek));

  // al abrir la app: si falta el check-in de esta semana, se pregunta (salvo que hoy se haya pospuesto)
  useEffect(() => {
    if (!pending) return;
    let snoozed = false;
    try { snoozed = localStorage.getItem(SNOOZE) === toISO(new Date()); } catch { /* sin almacenamiento */ }
    if (!snoozed) setCheckinWeek(thisWeek);
  }, [pending, thisWeek]);

  const openCheckin = (week?: string) => setCheckinWeek(week || thisWeek);
  const closeCheckin = (snooze = false) => {
    if (snooze) { try { localStorage.setItem(SNOOZE, toISO(new Date())); } catch { /* sin almacenamiento */ } }
    setCheckinWeek(null);
  };

  return (
    <SocialContext.Provider value={{ snapshots, posts, loading, local, pending, checkinWeek, openCheckin, closeCheckin, refresh }}>
      {children}
    </SocialContext.Provider>
  );
}

export function useSocial() {
  const ctx = useContext(SocialContext);
  if (!ctx) throw new Error("useSocial must be used inside SocialProvider");
  return ctx;
}
