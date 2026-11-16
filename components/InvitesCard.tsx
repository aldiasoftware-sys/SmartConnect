"use client";

import { useEffect, useState } from "react";
import { Copy, Check, Link2, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { BrandLogo } from "@/components/AccountIcon";

/** Solo estas redes (LinkedIn y Web en pausa); en este orden. */
const SHOWN = ["tiktok", "instagram", "youtube", "discord"];
const DiscordTile = ({ size = 30 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-label="Discord" className="brand-logo"><rect width="40" height="40" rx="11" fill="#5865F2" />
    <path transform="translate(8 8)" fill="#fff" d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" /></svg>
);

// «De dónde viene la gente»: un enlace de invitación de Discord por red y cuántas personas ha traído cada uno.
type Row = { red: string; label: string; code: string | null; url: string | null; uses: number };
type Data = { redes: Row[]; otros: number; history: Record<string, Record<string, number>>; missing: string[] };
type State = { status: "cargando" | "ok" | "sin-servidor" | "error"; data?: Data; error?: string };

const COLORS: Record<string, string> = { tiktok: "#fe2c55", instagram: "#d6249f", youtube: "#ff0000", discord: "#5865f2" };

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

  const d0 = st.data;
  const d = d0 ? { ...d0, redes: SHOWN.map((id) => d0.redes.find((r) => r.red === id)).filter((r): r is Row => !!r), missing: d0.missing.filter((m) => SHOWN.includes(m)) } : undefined;
  const total = d ? d.redes.reduce((s, r) => s + r.uses, 0) : 0;
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
        <>
        <div className="inv-tiles">
          {d.redes.filter((r) => r.code).map((r) => {
            const g = weekGain(r.red, r.uses);
            const share = total ? Math.round((r.uses / total) * 100) : 0;
            return (
              <div key={r.red} className="inv-tile" style={{ ["--rc" as any]: COLORS[r.red] || "var(--ink)" }}>
                <div className="inv-tile-top">
                  {r.red === "discord" ? <DiscordTile /> : <BrandLogo platform={r.red} size={30} />}
                  <b>{r.label}</b>
                  {g !== null && g > 0 && <span className="inv-up">+{g} sem.</span>}
                </div>
                <div className="inv-tile-n">{r.uses}<small>{r.uses === 1 ? "persona" : "personas"}</small></div>
                <div className="inv-meter"><div style={{ width: `${Math.max(share, r.uses ? 4 : 0)}%` }} /></div>
                <div className="inv-tile-foot">
                  <small>{total ? `${share} % del total` : "sin entradas aún"}</small>
                  {!compact && r.url && (
                    <button className="inv-copy" onClick={() => copy(r.url!, r.red)} title={`Copiar ${r.url}`}>
                      {copied === r.red ? <><Check /> Copiado</> : <><Copy /> Enlace</>}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div>
          {d.redes.some((r) => r.code) && (
            <p className="text-sm" style={{ color: "var(--text-muted)", marginTop: 6 }}>
              {best ? <>La que más trae: <b style={{ color: "var(--ink)" }}>{best.label}</b> ({best.uses} de {total}). </> : "Aún nadie ha entrado por estos enlaces. "}
              {d.otros > 0 && `${d.otros} más entraron por otros enlaces antiguos.`}
            </p>
          )}
        </div>
        </>
      )}
    </div>
  );
}
