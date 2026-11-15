"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Undo2, CalendarPlus, Users, TrendingUp, CalendarRange, Trophy, HardDrive, X, Trash2, RefreshCw } from "lucide-react";
import { SKOOL_AT, fmt, pct, shortDate, today, weekStart } from "@/lib/social";
import { deleteRow, listRows, saveRow, tableMode } from "@/lib/store";
import Portal from "@/components/Portal";
import { useAuth } from "@/lib/AuthContext";
import InvitesCard from "@/components/InvitesCard";
import Link from "next/link";

// Contador de la comunidad: no guardamos datos de nadie, solo «ha entrado uno más» y el día.
// Las altas del servidor de Discord se leen solas (/api/discord/miembros); a mano solo se apunta a quien entra por otro sitio.
type Join = { id?: string; joined_on: string; created_at?: string };
type Perfil = { name: string; count: number };
type DiscordState = { status: "cargando" | "ok" | "intent" | "sin-servidor" | "error"; joins: string[]; at?: string; error?: string; perfiles?: Perfil[]; niveles?: Perfil[]; sinPerfil?: number; comunidad?: number };

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const parse = (s: string) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const addDays = (s: string, n: number) => { const d = parse(s); d.setDate(d.getDate() + n); return iso(d); };
const monthKey = (s: string) => s.slice(0, 7);
const monthLabel = (k: string) => { const [y, m] = k.split("-").map(Number); return `${MES[m - 1]}${y !== new Date().getFullYear() ? ` ${String(y).slice(2)}` : ""}`; };
const prevMonthKey = (k: string, n = 1) => { const [y, m] = k.split("-").map(Number); const d = new Date(y, m - 1 - n, 1); return iso(d).slice(0, 7); };

function Delta({ now, before }: { now: number; before: number }) {
  if (!before && !now) return <span>sin movimiento</span>;
  const diff = now - before;
  const color = diff > 0 ? "var(--ok)" : diff < 0 ? "var(--bad)" : "var(--text-muted)";
  return <span style={{ color, fontWeight: 600 }}>{diff > 0 ? "+" : ""}{diff} vs. anterior</span>;
}

function Bars({ data, highlight }: { data: { label: string; value: number; key: string }[]; highlight: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="cm-bars" role="img" aria-label={data.map((d) => `${d.label}: ${d.value}`).join(", ")}>
      {data.map((d) => (
        <div key={d.key} className="cm-bar-col" title={`${d.label}: ${d.value}`}>
          <span className="cm-bar-val">{d.value || ""}</span>
          <div className="cm-bar-track"><div className={`cm-bar ${d.key === highlight ? "now" : ""}`} style={{ height: `${(d.value / max) * 100}%` }} /></div>
          <span className="cm-bar-lbl">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function ComunidadPage() {
  const { session } = useAuth();
  const [manual, setJoins] = useState<Join[]>([]);
  const [dc, setDc] = useState<DiscordState>({ status: "cargando", joins: [] });
  const [local, setLocal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ date: today(), count: 1 });
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 3000); };

  async function load() {
    setLocal((await tableMode("community_joins")) === "local");
    setJoins(await listRows<Join>("community_joins", "created_at")); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function loadDiscord() {
    if (!session?.access_token) return;
    setDc((d) => ({ ...d, status: "cargando" }));
    try {
      const r = await fetch("/api/discord/miembros", { headers: { authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      if (!(r.headers.get("content-type") || "").includes("json")) { setDc({ status: "sin-servidor", joins: [] }); return; }   // en `next dev` no hay funciones de Cloudflare
      const j = await r.json();
      if (j.ok) setDc({ status: "ok", joins: j.joins, at: j.at, perfiles: j.perfiles, niveles: j.niveles, sinPerfil: j.sinPerfil, comunidad: j.comunidad });
      else setDc({ status: j.needsIntent ? "intent" : "error", joins: [], error: j.error });
    } catch { setDc({ status: "sin-servidor", joins: [] }); }
  }
  useEffect(() => { loadDiscord(); }, [session?.access_token]);   // eslint-disable-line react-hooks/exhaustive-deps

  // todas las altas: las de Discord (solas) + las apuntadas a mano
  const auto = dc.status === "ok";
  const joins = useMemo<Join[]>(() => [...dc.joins.map((d) => ({ joined_on: d })), ...manual], [dc.joins, manual]);

  async function add(date: string, count = 1) {
    setBusy(true);
    try {
      const stamp = new Date().toISOString();
      for (let i = 0; i < count; i++) await saveRow<Join>("community_joins", { joined_on: date, created_at: stamp });
      flash(count === 1 ? "+1 en la comunidad" : `+${count} en la comunidad`);
      await load();
    } catch (e: any) { flash(`No se ha guardado: ${e?.message || e}`); }
    setBusy(false);
  }

  // deshacer = quitar el último apuntado (por hora de creación)
  const last = useMemo(() => [...manual].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0], [manual]);
  const lastDay = useMemo(() => joins.reduce((m, j) => (j.joined_on > m ? j.joined_on : m), ""), [joins]);
  async function undo() {
    if (!last?.id) return;
    setBusy(true);
    try { await deleteRow("community_joins", last.id); flash(`Quitado el del ${shortDate(last.joined_on)}`); await load(); }
    catch (e: any) { flash(`No se ha podido quitar: ${e?.message || e}`); }
    setBusy(false);
  }

  const t = today();
  const ws = weekStart();
  const mk = monthKey(t);
  const total = joins.length;

  const byDay = useMemo(() => { const m = new Map<string, number>(); joins.forEach((j) => m.set(j.joined_on, (m.get(j.joined_on) || 0) + 1)); return m; }, [joins]);
  const inRange = (from: string, to: string) => joins.filter((j) => j.joined_on >= from && j.joined_on <= to).length;

  const thisWeek = inRange(ws, addDays(ws, 6));
  const lastWeek = inRange(addDays(ws, -7), addDays(ws, -1));
  const thisMonth = joins.filter((j) => monthKey(j.joined_on) === mk).length;
  const lastMonth = joins.filter((j) => monthKey(j.joined_on) === prevMonthKey(mk)).length;
  const todayCount = byDay.get(t) || 0;

  // últimas 12 semanas (lunes a domingo)
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = addDays(ws, -7 * (11 - i));
    return { key: start, label: shortDate(start), value: inRange(start, addDays(start, 6)) };
  });
  // últimos 6 meses
  const months = Array.from({ length: 6 }, (_, i) => {
    const k = prevMonthKey(mk, 5 - i);
    return { key: k, label: monthLabel(k), value: joins.filter((j) => monthKey(j.joined_on) === k).length };
  });

  // análisis: media semanal desde la primera entrada, mejor semana, días de la semana que más entran
  const first = useMemo(() => joins.reduce((m, j) => (!m || j.joined_on < m ? j.joined_on : m), ""), [joins]);
  const weeksSinceFirst = first ? Math.max(1, Math.floor((parse(weekStart()).getTime() - parse(weekStart(parse(first))).getTime()) / (7 * 864e5) + 0.5) + 1) : 0;
  const avgWeek = weeksSinceFirst ? total / weeksSinceFirst : 0;
  const bestWeek = useMemo(() => {
    const m = new Map<string, number>(); joins.forEach((j) => { const k = weekStart(parse(j.joined_on)); m.set(k, (m.get(k) || 0) + 1); });
    let best = { key: "", value: 0 }; m.forEach((v, k) => { if (v > best.value) best = { key: k, value: v }; }); return best;
  }, [joins]);
  const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"];
  const byWeekday = useMemo(() => { const c = Array(7).fill(0); joins.forEach((j) => { c[(parse(j.joined_on).getDay() + 6) % 7]++; }); return c; }, [joins]);
  const topDay = total ? DIAS[byWeekday.indexOf(Math.max(...byWeekday))] : "";
  const toSkool = Math.max(0, SKOOL_AT - total);
  const weeksToSkool = toSkool && avgWeek > 0 ? Math.ceil(toSkool / avgWeek) : 0;

  const recent = useMemo(() => [...byDay.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 8), [byDay]);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <div className="eyebrow">Objetivo 1 · Comunidad</div>
          <h2 className="page-title">Comunidad</h2>
          <p className="page-subtitle">{auto
            ? "Se cuenta solo: cada persona que entra en el Discord suma uno, con su día. Sin datos personales; de aquí sale el análisis por semana y por mes."
            : "Un contador: cada vez que alguien nuevo entra en la comunidad, +1. Sin datos personales; de aquí sale el análisis por semana y por mes."}</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(!auto || last) && <button className="btn-secondary" onClick={undo} disabled={busy || !last} title={last ? `Quitar el último apuntado a mano (${shortDate(last.joined_on)})` : "Nada que deshacer"}><Undo2 style={{ width: 16, height: 16 }} /> Deshacer</button>}
          <button className="btn-secondary" onClick={() => { setForm({ date: t, count: 1 }); setAdding(true); }} disabled={busy}><CalendarPlus style={{ width: 16, height: 16 }} /> {auto ? "Añadir a mano" : "Otro día"}</button>
        </div>
      </div>

      {dc.status === "intent" && (
        <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: "1.25rem", borderColor: "var(--warn)" }}>
          <Users style={{ width: 18, height: 18, color: "var(--warn)", flexShrink: 0 }} />
          <p className="text-sm" style={{ margin: 0 }}>Para contar solo las altas del Discord, activad <b>Server Members Intent</b> en el bot ALDIA AI (Discord Developer Portal › Bot › Privileged Gateway Intents). Mientras, se cuenta a mano.</p>
        </div>
      )}
      {dc.status === "error" && <p className="text-sm" style={{ color: "var(--bad)", marginBottom: "1rem" }}>No se ha podido leer el Discord ({dc.error}). Mientras, se cuenta a mano.</p>}
      {local && (
        <div className="card" style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: "1.25rem", borderColor: "var(--warn)" }}>
          <HardDrive style={{ width: 18, height: 18, color: "var(--warn)", flexShrink: 0 }} />
          <p className="text-sm" style={{ margin: 0 }}>Falta la tabla <code>community_joins</code> en Supabase: de momento se guarda en este navegador y se sube sola en cuanto la creéis (<code>community_joins.sql</code>).</p>
        </div>
      )}

      <div className="cm-hero card">
        <div>
          <span className="mx-stat-label">{auto ? "En la comunidad · Discord" : "En la comunidad"}</span>
          <div className="cm-total">{loading || dc.status === "cargando" ? "…" : fmt(total)}</div>
          <p className="mx-stat-sub" style={{ marginTop: 0 }}>
            {todayCount ? `${todayCount} hoy` : "Nadie nuevo hoy todavía"}{lastDay ? ` · último el ${shortDate(lastDay)}` : ""}
            {auto && manual.length ? ` · ${manual.length} apuntados a mano` : ""}
          </p>
        </div>
        {auto ? (
          <button className="cm-sync" onClick={loadDiscord} title="Volver a leer el Discord">
            <RefreshCw /> <span>Se cuenta solo<small>{dc.at ? `leído a las ${new Date(dc.at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : ""}</small></span>
          </button>
        ) : (
          <button className="cm-plus" onClick={() => add(t)} disabled={busy || loading} aria-label="Sumar una persona nueva hoy">
            <Plus /> <span>1</span>
          </button>
        )}
      </div>

      <div className="mx-stats">
        <div className="mx-stat">
          <div className="mx-stat-top"><span className="mx-stat-label">Esta semana</span><span className="mx-ico"><CalendarRange /></span></div>
          <div className="mx-stat-value">{thisWeek}</div>
          <div className="mx-stat-sub"><Delta now={thisWeek} before={lastWeek} /> ({lastWeek})</div>
        </div>
        <div className="mx-stat">
          <div className="mx-stat-top"><span className="mx-stat-label">Este mes</span><span className="mx-ico ok"><TrendingUp /></span></div>
          <div className="mx-stat-value">{thisMonth}</div>
          <div className="mx-stat-sub"><Delta now={thisMonth} before={lastMonth} /> ({lastMonth})</div>
        </div>
        <div className="mx-stat">
          <div className="mx-stat-top"><span className="mx-stat-label">Media semanal</span><span className="mx-ico ink"><Users /></span></div>
          <div className="mx-stat-value">{avgWeek ? avgWeek.toFixed(1).replace(".", ",") : "0"}</div>
          <div className="mx-stat-sub">{first ? `desde el ${shortDate(first)}` : "aún sin datos"}</div>
        </div>
        <div className="mx-stat">
          <div className="mx-stat-top"><span className="mx-stat-label">Mejor semana</span><span className="mx-ico warn"><Trophy /></span></div>
          <div className="mx-stat-value">{bestWeek.value}</div>
          <div className="mx-stat-sub">{bestWeek.key ? `semana del ${shortDate(bestWeek.key)}` : "aún sin datos"}</div>
        </div>
      </div>

      <div className="grid-2-1">
        <div className="card">
          <h3 className="section-title">Por semana</h3>
          <p className="section-sub">Personas nuevas cada semana (lunes a domingo), últimas 12.</p>
          <Bars data={weeks} highlight={ws} />
        </div>
        <div className="card">
          <h3 className="section-title">Por mes</h3>
          <p className="section-sub">Últimos 6 meses.</p>
          <Bars data={months} highlight={mk} />
        </div>
      </div>

      <div className="grid-2-1" style={{ marginTop: "1.25rem" }}>
        <div className="card">
          <h3 className="section-title">Lectura rápida</h3>
          <ul className="cm-read">
            <li>{thisWeek > lastWeek ? `Esta semana va mejor que la anterior (${thisWeek} frente a ${lastWeek}).` : thisWeek < lastWeek ? `Esta semana va por debajo de la anterior (${thisWeek} frente a ${lastWeek}).` : `Esta semana va igual que la anterior (${thisWeek}).`}</li>
            <li>{thisMonth >= lastMonth ? `El mes lleva ${thisMonth}, ${thisMonth - lastMonth >= 0 ? `${thisMonth - lastMonth} más` : ""} que el mes pasado (${lastMonth}).` : `El mes lleva ${thisMonth}; el pasado cerró con ${lastMonth}.`}</li>
            {topDay && <li>El día que más gente entra es el <b>{topDay}</b>: buen día para publicar lo que más tire.</li>}
            {!total && !auto && <li>Pulsa +1 cada vez que entre alguien nuevo. Si ya había gente antes de empezar a contar, apúntala con «Otro día».</li>}
            {auto && <li>Cuenta a quien sigue en el servidor (si alguien se va, deja de contar). Quien entre por otro sitio, con «Añadir a mano».</li>}
          </ul>
        </div>
        <div className="card">
          <h3 className="section-title">Hacia Skool</h3>
          <p className="section-sub" style={{ marginBottom: "0.875rem" }}>Con {SKOOL_AT}–50 personas, abrir Skool gratis por invitación.</p>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span className="text-sm font-semibold">Personas</span><span className="font-bold">{total}/{SKOOL_AT}</span>
          </div>
          <div style={{ height: 10, borderRadius: 99, background: "var(--bg-subtle, #eef0f3)", overflow: "hidden" }}>
            <div style={{ width: `${Math.min(100, pct(total, SKOOL_AT))}%`, height: "100%", background: total >= SKOOL_AT ? "var(--ok)" : "var(--ink, var(--navy))" }} />
          </div>
          <p className="text-sm" style={{ marginTop: 10, color: "var(--text-secondary)" }}>
            {total >= SKOOL_AT ? "Ya toca abrir Skool." : weeksToSkool ? `Faltan ${toSkool}; a este ritmo, unas ${weeksToSkool} semanas.` : `Faltan ${toSkool}.`}
          </p>
          {recent.length > 0 && (
            <>
              <h4 className="text-sm font-semibold" style={{ margin: "1.125rem 0 0.5rem" }}>Últimos días</h4>
              <div className="cm-days">
                {recent.map(([d, n]) => <span key={d} className="chip">{shortDate(d)} · +{n}</span>)}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid-2-1" style={{ marginTop: "1.25rem" }}>
        <InvitesCard />
        <div className="card">
          <h3 className="section-title">Perfiles</h3>
          <p className="section-sub">Lo que cada uno eligió al entrar en «¿Qué te interesa?» (puede elegir varios).</p>
          {auto && dc.perfiles ? (
            <>
              <div className="pf-list">
                {(() => { const mx = Math.max(1, ...dc.perfiles!.map((p) => p.count)); return dc.perfiles!.map((p) => (
                  <div key={p.name} className={`pf-row${p.name === "Tengo un negocio" ? " hot" : ""}`}>
                    <span>{p.name}</span><div className="pf-bar"><div style={{ width: `${(p.count / mx) * 100}%` }} /></div><span>{p.count}</span>
                  </div>
                )); })()}
              </div>
              {!!dc.sinPerfil && <p className="text-sm" style={{ color: "var(--text-muted)", marginTop: 10 }}>{dc.sinPerfil} de {dc.comunidad} aún sin perfil (entraron antes de que fuera obligatorio).</p>}
              {dc.niveles && <p className="text-sm" style={{ color: "var(--text-secondary)", marginTop: 6 }}>Nivel: {dc.niveles.map((n) => `${n.name} ${n.count}`).join(" · ")}</p>}
              <Link href="/posibles-clientes" className="btn-secondary" style={{ marginTop: 12, display: "inline-flex" }}>Ver posibles clientes</Link>
            </>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-muted)", marginTop: 12 }}>Se ve en la versión publicada: lo lee el bot del Discord.</p>
          )}
        </div>
      </div>

      {adding && (
        <Portal>
          <div className="dialog-overlay" onClick={() => setAdding(false)}>
            <form className="dialog" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}
              onSubmit={async (e) => { e.preventDefault(); await add(form.date, form.count); setAdding(false); }}>
              <div className="dialog-head">
                <div>
                  <div className="eyebrow" style={{ marginBottom: 2 }}>Comunidad</div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em" }}>{auto ? "Añadir a mano (fuera de Discord)" : "Apuntar en otro día"}</h3>
                </div>
                <button type="button" className="icon-btn" onClick={() => setAdding(false)} aria-label="Cerrar"><X /></button>
              </div>
              <div className="dialog-body">
                <p className="text-sm" style={{ color: "var(--text-secondary)", marginTop: 0, marginBottom: "1rem" }}>Para quien entró un día que no se apuntó, o para la gente que ya estaba antes de empezar a contar.</p>
                <div className="form-group"><label>Día</label>
                  <input type="date" value={form.date} max={t} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div className="form-group" style={{ marginBottom: 0 }}><label>Cuántas personas</label>
                  <input type="number" min={1} max={500} value={form.count} onChange={(e) => setForm({ ...form, count: Math.max(1, Math.min(500, Number(e.target.value) || 1)) })} /></div>
                {manual.some((x) => x.joined_on === form.date) ? (
                  <p className="text-sm" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: "0.875rem" }}>Ese día hay {manual.filter((x) => x.joined_on === form.date).length} apuntados a mano.
                    <button type="button" className="btn-ghost" disabled={busy} onClick={async () => {
                      const j = manual.filter((x) => x.joined_on === form.date).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))[0];
                      if (j?.id) { setBusy(true); await deleteRow("community_joins", j.id); await load(); setBusy(false); }
                    }}><Trash2 style={{ width: 14, height: 14 }} /> Quitar uno</button>
                  </p>
                ) : null}
              </div>
              <div className="dialog-foot">
                <span />
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary" onClick={() => setAdding(false)}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={busy || !form.date}><Plus style={{ width: 16, height: 16 }} /> Sumar {form.count}</button>
                </div>
              </div>
            </form>
          </div>
        </Portal>
      )}

      {toast && <Portal><div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "0.75rem 1.25rem", borderRadius: 12, fontSize: "0.875rem", zIndex: 1000, boxShadow: "var(--shadow-lg)", maxWidth: "90vw" }}>{toast}</div></Portal>}
    </div>
  );
}
