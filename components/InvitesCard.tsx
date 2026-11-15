"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Link2, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

// «De dónde viene la gente»: un enlace de invitación de Discord por red y cuántas personas ha traído cada uno.
type Row = { red: string; label: string; code: string | null; url: string | null; uses: number };
type Data = { redes: Row[]; otros: number; history: Record<string, Record<string, number>>; missing: string[] };
type State = { status: "cargando" | "ok" | "sin-servidor" | "error"; data?: Data; error?: string };

const COLORS: Record<string, string> = { tiktok: "#fe2c55", instagram: "#d6249f", linkedin: "#0a66c2", youtube: "#ff0000", web: "#1e3a8a" };

export default function InvitesCard({ compact = false }: { compact?: boolean }) {
  const { session } = useAuth();
  const [st, setSt] = useState<State>({ status: "cargando" });
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState("");

  async function call(method: "GET" | "POST") {
    if (!session?.access_token) return;
    if (method === "POST") setBusy(true);
    try {
      const r = await fetch("/api/discord/invitaciones", { method, headers: { authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      if (!(r.headers.get("content-type") || "").includes("json")) { setSt({ status: "sin-servidor" }); return; }   // en `next dev` no hay funciones
      const j = await r.json();
      setSt(j.ok ? { status: "ok", data: j } : { status: "error", error: j.error });
    } catch { setSt({ status: "sin-servidor" }); }
    finally { setBusy(false); }
  }
  useEffect(() => { call("GET"); }, [session?.access_token]);   // eslint-disable-line react-hooks/exhaustive-deps

  const copy = async (url: string, red: string) => {
    try { await navigator.clipboard.writeText(url); } catch {
      const t = document.createElement("textarea"); t.value = url; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove();
    }
    setCopied(red); setTimeout(() => setCopied(""), 1500);
  };

  // lo que ha traído cada red en los últimos 7 días (comparando con la foto de hace una semana)
  const weekGain = (red: string, now: number) => {
    const h = st.data?.history || {};
    const days = Object.keys(h).sort();
    const target = new Date(Date.now() - 7 * 864e5).toISOString().slice(0, 10);
    const base = [...days].reverse().find((d) => d <= target);
    return base ? Math.max(0, now - (h[base][red] || 0)) : null;
  };

  const d = st.data;
  const total = d ? d.redes.reduce((s, r) => s + r.uses, 0) : 0;
  const max = d ? Math.max(1, ...d.redes.map((r) => r.uses)) : 1;
  const best = d && total ? [...d.redes].sort((a, b) => b.uses - a.uses)[0] : null;

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
        <div>
          <h3 className="section-title">De dónde viene la gente</h3>
          <p className="section-sub">Un enlace de Discord por red: cada persona que entra por uno suma a esa red.</p>
        </div>
        {st.status === "ok" && <button className="icon-btn" onClick={() => call("GET")} aria-label="Volver a leer" title="Volver a leer"><RefreshCw /></button>}
      </div>

      {st.status === "cargando" && <div className="mx-skeleton" style={{ height: 120, borderRadius: 14, marginTop: 12 }} />}
      {st.status === "sin-servidor" && <p className="text-sm" style={{ color: "var(--text-muted)", marginTop: 12 }}>Se ve en la versión publicada (aldiasmart.pages.dev): en local no hay conexión con el bot.</p>}
      {st.status === "error" && <p className="text-sm" style={{ color: "var(--bad)", marginTop: 12 }}>No se ha podido leer el Discord: {st.error}</p>}

      {d && d.missing.length > 0 && (
        <div className="inv-empty">
          <Link2 />
          <p className="text-sm" style={{ margin: 0 }}>{d.missing.length === d.redes.length ? "Aún no hay enlaces por red." : `Faltan enlaces para ${d.missing.length} redes.`} El bot los crea en 👋・bienvenida y no caducan.</p>
          <button className="btn-primary" onClick={() => call("POST")} disabled={busy}>{busy ? "Creando…" : "Crear enlaces"}</button>
        </div>
      )}

      {d && (
        <div className="inv-rows">
          {d.redes.filter((r) => r.code).map((r) => {
            const g = weekGain(r.red, r.uses);
            return (
              <div key={r.red} className="inv-row" style={{ ["--rc" as any]: COLORS[r.red] || "var(--ink)" }}>
                <span className="inv-name"><i />{r.label}</span>
                <div className="inv-bar"><div style={{ width: `${(r.uses / max) * 100}%` }} /></div>
                <span className="inv-n"><b>{r.uses}</b>{g !== null && g > 0 && <small>+{g} esta semana</small>}</span>
                {!compact && r.url && (
                  <button className="inv-copy" onClick={() => copy(r.url!, r.red)} title={`Copiar ${r.url}`}>
                    {copied === r.red ? <><Check /> Copiado</> : <><Copy /> {r.url.replace("https://", "")}</>}
                  </button>
                )}
              </div>
            );
          })}
          {d.redes.some((r) => r.code) && (
            <p className="text-sm" style={{ color: "var(--text-muted)", marginTop: 6 }}>
              {best ? <>La que más trae: <b style={{ color: "var(--ink)" }}>{best.label}</b> ({best.uses} de {total}). </> : "Aún nadie ha entrado por estos enlaces. "}
              {d.otros > 0 && `${d.otros} más entraron por otros enlaces antiguos.`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
