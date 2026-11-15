"use client";

import { useEffect, useMemo, useState } from "react";
import { Briefcase, MessageSquareQuote, ExternalLink, Check, X, RefreshCw, Undo2, Lock } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getSetting, setSetting } from "@/lib/store";
import { shortDate } from "@/lib/social";

// Posibles clientes que salen del Discord: quien eligió «Tengo un negocio» al entrar y mensajes que suenan a encargo.
// Lo lee el bot (/api/discord/clientes); aquí se marca a quién ya se ha escrito o se descarta (se guarda para los dos).
type Negocio = { id: string; name: string; joined_on: string; url: string };
type Signal = { id: string; channel: string; author: string; authorId: string; content: string; at: string; url: string; match: string };
type Estado = "contactado" | "descartado";
type Marks = Record<string, { estado: Estado; at: string }>;
type State = { status: "cargando" | "ok" | "sin-servidor" | "error"; negocio: Negocio[]; signals: Signal[]; error?: string; at?: string };

export default function PosiblesClientesPage() {
  const { session } = useAuth();
  const [st, setSt] = useState<State>({ status: "cargando", negocio: [], signals: [] });
  const [marks, setMarks] = useState<Marks>({});
  const [verTodo, setVerTodo] = useState(false);

  async function load() {
    if (!session?.access_token) return;
    setSt((s) => ({ ...s, status: "cargando" }));
    getSetting<Marks>("discord_leads_marks", {}).then(setMarks);
    try {
      const r = await fetch("/api/discord/clientes", { headers: { authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      if (!(r.headers.get("content-type") || "").includes("json")) { setSt({ status: "sin-servidor", negocio: [], signals: [] }); return; }
      const j = await r.json();
      setSt(j.ok ? { status: "ok", negocio: j.negocio, signals: j.signals, at: j.at } : { status: "error", negocio: [], signals: [], error: j.error });
    } catch { setSt({ status: "sin-servidor", negocio: [], signals: [] }); }
  }
  useEffect(() => { load(); }, [session?.access_token]);   // eslint-disable-line react-hooks/exhaustive-deps

  async function mark(key: string, estado: Estado | null) {
    const next = { ...marks };
    if (estado) next[key] = { estado, at: new Date().toISOString() }; else delete next[key];
    setMarks(next); await setSetting("discord_leads_marks", next);
  }

  const pend = (k: string) => !marks[k];
  const negocio = useMemo(() => st.negocio.filter((n) => verTodo || pend(`n:${n.id}`)), [st.negocio, marks, verTodo]);   // eslint-disable-line react-hooks/exhaustive-deps
  const signals = useMemo(() => st.signals.filter((s) => verTodo || pend(`m:${s.id}`)), [st.signals, marks, verTodo]);   // eslint-disable-line react-hooks/exhaustive-deps
  const pendientes = st.negocio.filter((n) => pend(`n:${n.id}`)).length + st.signals.filter((s) => pend(`m:${s.id}`)).length;
  const contactados = Object.values(marks).filter((m) => m.estado === "contactado").length;

  const Actions = ({ k, url }: { k: string; url: string }) => {
    const m = marks[k];
    return (
      <div className="lc-actions">
        <a className="btn-secondary lc-btn" href={url} target="_blank" rel="noreferrer"><ExternalLink /> Abrir en Discord</a>
        {m ? (
          <>
            <span className={`chip ${m.estado === "contactado" ? "chip-ok" : ""}`}>{m.estado === "contactado" ? "Contactado" : "Descartado"} · {shortDate(m.at.slice(0, 10))}</span>
            <button className="btn-ghost lc-btn" onClick={() => mark(k, null)} title="Volver a pendiente"><Undo2 /></button>
          </>
        ) : (
          <>
            <button className="btn-ghost lc-btn" onClick={() => mark(k, "contactado")}><Check /> Ya le escribí</button>
            <button className="btn-ghost lc-btn" onClick={() => mark(k, "descartado")}><X /> Descartar</button>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <div className="eyebrow">Comercial · Discord</div>
          <h2 className="page-title">Posibles clientes</h2>
          <p className="page-subtitle">Lo detecta el bot del Discord: quien eligió «Tengo un negocio» al entrar y quien pregunta algo que suena a encargo. Lo nuevo también os lo avisa en el canal privado 🔒・posibles-clientes.</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn-secondary" onClick={() => setVerTodo((v) => !v)}>{verTodo ? "Solo pendientes" : "Ver también los hechos"}</button>
          <button className="btn-secondary" onClick={load} disabled={st.status === "cargando"}><RefreshCw style={{ width: 16, height: 16 }} /> Actualizar</button>
        </div>
      </div>

      <div className="mx-stats">
        <div className="mx-stat hero">
          <div className="mx-stat-top"><span className="mx-stat-label">Pendientes</span><span className="mx-ico"><Briefcase /></span></div>
          <div className="mx-stat-value">{st.status === "ok" ? pendientes : "…"}</div>
          <div className="mx-stat-sub">por escribir o revisar</div>
        </div>
        <div className="mx-stat">
          <div className="mx-stat-top"><span className="mx-stat-label">Con negocio</span><span className="mx-ico ok"><Briefcase /></span></div>
          <div className="mx-stat-value">{st.status === "ok" ? st.negocio.length : "…"}</div>
          <div className="mx-stat-sub">eligieron «Tengo un negocio»</div>
        </div>
        <div className="mx-stat">
          <div className="mx-stat-top"><span className="mx-stat-label">Suenan a encargo</span><span className="mx-ico warn"><MessageSquareQuote /></span></div>
          <div className="mx-stat-value">{st.status === "ok" ? st.signals.length : "…"}</div>
          <div className="mx-stat-sub">mensajes de los últimos 30 días</div>
        </div>
        <div className="mx-stat">
          <div className="mx-stat-top"><span className="mx-stat-label">Contactados</span><span className="mx-ico ink"><Check /></span></div>
          <div className="mx-stat-value">{contactados}</div>
          <div className="mx-stat-sub">marcados como «Ya le escribí»</div>
        </div>
      </div>

      {st.status === "sin-servidor" && <div className="card"><p className="text-sm" style={{ margin: 0 }}>Esto se ve en la versión publicada (aldiasmart.pages.dev): en local no hay conexión con el bot del Discord.</p></div>}
      {st.status === "error" && <div className="card"><p className="text-sm" style={{ margin: 0, color: "var(--bad)" }}>No se ha podido leer el Discord: {st.error}</p></div>}
      {st.status === "cargando" && <div className="mx-skeleton" style={{ height: 220, borderRadius: 18 }} />}

      {st.status === "ok" && (
        <div className="grid-2-1">
          <div className="card">
            <h3 className="section-title">Mensajes que suenan a encargo</h3>
            <p className="section-sub">En la comunidad, ayuda y proyectos («¿cuánto costaría…?», «para mi empresa…», «tengo una clínica…»). No cuentan los del equipo.</p>
            {signals.length === 0 ? <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nada pendiente.</p> : (
              <div className="lc-list">
                {signals.map((s) => (
                  <div key={s.id} className="lc-item">
                    <div className="lc-top"><b>{s.author}</b><span>{s.channel} · {shortDate(s.at.slice(0, 10))}</span></div>
                    <p className="lc-quote">«{s.content}»</p>
                    <Actions k={`m:${s.id}`} url={s.url} />
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="card">
            <h3 className="section-title">Tienen un negocio</h3>
            <p className="section-sub">Eligieron «Tengo un negocio» al entrar. Salúdales en el Discord o por mensaje directo.</p>
            {negocio.length === 0 ? <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nadie pendiente. La opción se añadió el 15 nov: quien entró antes no la tenía.</p> : (
              <div className="lc-list">
                {negocio.map((n) => (
                  <div key={n.id} className="lc-item">
                    <div className="lc-top"><b>{n.name}</b><span>entró el {shortDate(n.joined_on)}</span></div>
                    <Actions k={`n:${n.id}`} url={n.url} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="text-sm" style={{ color: "var(--text-muted)", marginTop: "1.25rem", display: "flex", gap: 8, alignItems: "center" }}>
        <Lock style={{ width: 14, height: 14 }} /> Solo se leen mensajes públicos del servidor; nada de mensajes privados.
      </p>
    </div>
  );
}
