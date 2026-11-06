"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { SHARED_OWNER, TeamMember, memberByEmail } from "./team";

// Quién ha entrado y qué quiere ver: lo del equipo o solo lo suyo (se recuerda en este navegador).
export type Scope = "equipo" | "yo";
interface ScopeContextType {
  me: TeamMember | null;
  scope: Scope;
  setScope: (s: Scope) => void;
  /** ¿Esta pieza del calendario la sube él? (las suyas y las de la cuenta conjunta sin dueño) */
  isMine: (owner?: string | null) => boolean;
  /** con el selector en «Yo»: ¿se enseña este dueño? (en «Equipo» siempre sí) */
  inScope: (owner?: string | null) => boolean;
}

const ScopeContext = createContext<ScopeContextType>({ me: null, scope: "equipo", setScope: () => {}, isMine: () => true, inScope: () => true });
const KEY = "aldia_scope";

export default function ScopeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const me = memberByEmail(user?.email);
  const [scope, setScopeState] = useState<Scope>("equipo");
  useEffect(() => { try { const v = localStorage.getItem(KEY); if (v === "yo" || v === "equipo") setScopeState(v); } catch { /* sin almacenamiento */ } }, []);
  const setScope = (s: Scope) => { setScopeState(s); try { localStorage.setItem(KEY, s); } catch { /* sin almacenamiento */ } };

  const isMine = (owner?: string | null) => !me || !owner || owner === me.owner || owner === me.name || owner === me.folder || owner === SHARED_OWNER || owner === "Ambos";
  const inScope = (owner?: string | null) => scope === "equipo" || isMine(owner);

  return <ScopeContext.Provider value={{ me, scope: me ? scope : "equipo", setScope, isMine, inScope }}>{children}</ScopeContext.Provider>;
}

export const useScope = () => useContext(ScopeContext);
