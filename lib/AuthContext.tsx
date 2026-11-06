"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";
import { User, Session } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
});

const PUBLIC_PATHS = ["/login"];

/**
 * Sesión real de Supabase. Sin sesión solo se ve /login; el resto de la app no se pinta.
 * La protección de verdad está en las políticas RLS (seguridad_rls.sql): sin login la base no devuelve nada.
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!session && !isPublic) router.replace("/login");
    if (session && isPublic) router.replace("/");
  }, [loading, session, isPublic, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const ready = !loading && (isPublic ? !session : !!session);

  return (
    <AuthContext.Provider value={{ user: session?.user ?? null, session, loading, signOut }}>
      {ready ? children : <div style={{ minHeight: "100vh", width: "100%" }} />}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
