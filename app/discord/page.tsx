"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, BarChart3, CheckCircle2, Clock, ExternalLink, HardDrive, Megaphone, MessageSquare, Play, RefreshCw,
  Send, Share2, Users, Wifi, Workflow, XCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Portal from "@/components/Portal";
import { Post, fmt, shortDate, today } from "@/lib/social";
import { DISCORD_SERVER_URL, DiscordStats, FlowStatus, SOCIAL_TARGETS, discordGoalFor } from "@/lib/discord";

type Tab = "resumen" | "redes" | "anuncios" | "automatizaciones";
const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "resumen", label: "Resumen", icon: BarChart3 },
  { id: "redes", label: "Avisos de redes", icon: Share2 },
  { id: "anuncios", label: "Anuncios", icon: Megaphone },
  { id: "automatizaciones", label: "Automatizaciones", icon: Workflow },
];

/** Respuesta de una función de Cloudflare; en `next dev` no existen y llega HTML. */
async function callApi<T>(url: string, init: RequestInit): Promise<{ ok: boolean; data?: T; error?: string; noServer?: boolean }> {
  try {
    const r = await fetch(url, init);
    if (!(r.headers.get("content-type") || "").includes("json")) return { ok: false, noServer: true, error: "Sin servidor" };
    const data = await r.json();
    return r.ok && data.ok !== false ? { ok: true, data } : { ok: false, error: data.error || `Error ${r.status}` };
  } catch (e: any) { return { ok: false, error: e?.message || "Error de red" }; }
}

const ago = (iso?: string) => {
  if (!iso) return "—";
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 1) return "ahora"; if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60); if (h < 24) return `hace ${h} h`;
  return `hace ${Math.round(h / 24)} d`;
};

export default function DiscordPage() {
  const { session } = useAuth();
  const auth = useMemo(() => ({ authorization: `Bearer ${session?.access_token || ""}`, "content-type": "application/json" }), [session?.access_token]);
  const [tab, setTab] = useState<Tab>("resumen");
  const [stats, setStats] = useState<DiscordStats | null>(null);
  const [statsErr, setStatsErr] = useState<string>("");
  const [noServer, setNoServer] = useState(false);
  const [toast, setToast] = useState("");
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4500); };

  const loadStats = useCallback(async () => {
    if (!session) return;
    const r = await callApi<DiscordStats>("/api/discord/stats", { headers: auth });
    if (r.noServer) setNoServer(true);
    if (r.ok && r.data) { setStats(r.data); setStatsErr(""); } else setStatsErr(r.error || "");
  }, [session, auth]);
  useEffect(() => { loadStats(); }, [loadStats]);

  return (
    <div className="page-wrapper" style={{ maxWidth: 1400 }}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Objetivo 1 · Comunidad · Atraer y nutrir</div>
          <h2 className="page-title">Discord</h2>
          <p className="page-subtitle">ALDIA Community: métricas del servidor, avisos de lo que publicamos, anuncios y las automatizaciones que lo mantienen vivo.</p>
        </div>
        <a className="btn-primary" href={DISCORD_SERVER_URL} target="_blank" rel="noreferrer"><ExternalLink style={{ width: 17, height: 17 }} /> Abrir el servidor</a>
      </div>

      {noServer && <div className="banner"><AlertTriangle /><div><b>Aquí no hay servidor.</b> En local (<code>next dev</code>) no existen las funciones de Cloudflare: prueba con <code>npx next build && npx wrangler@3 pages dev out</code> o en aldiasmart.pages.dev.</div></div>}
      {!noServer && statsErr && <div className="banner"><AlertTriangle /><div><b>No se pudo leer el Discord.</b> {statsErr}{/DISCORD_BOT_TOKEN/.test(statsErr) && <> · Añade <code>DISCORD_BOT_TOKEN</code> en Cloudflare Pages → Settings → Variables.</>}</div></div>}

      <div className="flex justify-between items-center" style={{ marginBottom: "1.25rem", gap: 12, flexWrap: "wrap" }}>
        <div className="seg">
          {TABS.map((t) => <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}><t.icon style={{ width: 14, height: 14, marginRight: 6, verticalAlign: -2 }} />{t.label}</button>)}
        </div>
        {tab === "resumen" && <button className="btn-ghost" style={{ width: "auto" }} onClick={loadStats}><RefreshCw style={{ width: 15, height: 15 }} /> Actualizar</button>}
      </div>

      {tab === "resumen" && <Resumen stats={stats} />}
      {tab === "redes" && <Redes auth={auth} flash={flash} />}
      {tab === "anuncios" && <Anuncios auth={auth} flash={flash} />}
      {tab === "automatizaciones" && <Automatizaciones auth={auth} flash={flash} session={!!session} />}

      {toast && <Portal><div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "0.75rem 1.25rem", borderRadius: 12, fontSize: "0.875rem", zIndex: 1000 }}>{toast}</div></Portal>}
    </div>
  );
}

// ===================== RESUMEN =====================
function Resumen({ stats }: { stats: DiscordStats | null }) {
  if (!stats) return <div className="card" style={{ padding: "2.5rem", textAlign: "center" }}><p className="text-sm text-secondary">Cargando el Discord…</p></div>;
  const t = today();
  const goal = discordGoalFor(t);
  const { guild, activity, history } = stats;
  const weekAgo = history.find((h) => h.day >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));
  const growth = weekAgo ? guild.members - weekAgo.members : null;
  const maxCh = Math.max(1, ...activity.channels.map((c) => c.messages));
  const maxDay = Math.max(1, ...activity.byDay.map((d) => d.messages));

  return (
    <>
      {!stats.historyReady && (stats.serviceKey === false
        ? <div className="banner"><HardDrive /><div><b>No se guarda el histórico.</b> Falta <code>SUPABASE_SERVICE_ROLE_KEY</code> en Cloudflare Pages → Settings → Variables (como secreto). Las métricas se ven en vivo, pero sin foto diaria ni marca de «avisado» en el Calendario.</div></div>
        : <div className="banner"><HardDrive /><div><b>Falta la tabla del histórico.</b> Ejecuta <code>discord_setup.sql</code> en Supabase y después <code>seguridad_rls.sql</code>. Mientras, las métricas se ven en vivo pero no se guardan.</div></div>)}
      <div className="grid-4" style={{ marginBottom: "1.25rem" }}>
        <div className="card kpi">
          <div className="kpi-label">Miembros <Users /></div>
          <div className="kpi-value">{fmt(guild.members)}<span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 500 }}> / {goal.target}</span></div>
          <div className="target" style={{ marginTop: 8 }}><div style={{ height: 6, borderRadius: 9, background: "var(--border-color)", overflow: "hidden" }}><div style={{ width: `${Math.min(100, (guild.members / goal.target) * 100)}%`, height: "100%", background: "var(--ink)" }} /></div></div>
          <div className="kpi-sub">Meta S{goal.week} ({shortDate(goal.until)}){growth !== null ? ` · ${growth >= 0 ? "+" : ""}${growth} en 7 días` : ""}</div>
        </div>
        <div className="card kpi"><div className="kpi-label">En línea ahora <Wifi /></div><div className="kpi-value">{fmt(guild.online)}</div><div className="kpi-sub">{guild.members ? Math.round((guild.online / guild.members) * 100) : 0}% de los miembros</div></div>
        <div className="card kpi"><div className="kpi-label">Mensajes · 7 días <MessageSquare /></div><div className="kpi-value">{fmt(activity.messages7d)}</div><div className="kpi-sub">{activity.activeAuthors} {activity.activeAuthors === 1 ? "persona activa" : "personas activas"} (sin contar bots)</div></div>
        <div className="card kpi"><div className="kpi-label">Foros · 7 días <Share2 /></div><div className="kpi-value">{activity.forums.reduce((s, f) => s + f.new7d, 0)}</div><div className="kpi-sub">publicaciones nuevas de la comunidad</div></div>
      </div>

      <div className="grid-2-1" style={{ marginBottom: "1.25rem" }}>
        <div className="card">
          <div className="flex justify-between items-center" style={{ marginBottom: 12 }}><h3 style={{ fontWeight: 600 }}>Miembros por día</h3><span className="text-xs text-secondary">Foto diaria a las 23:50</span></div>
          <MembersChart history={history} goal={goal.target} />
        </div>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Mensajes por día</h3>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 170 }}>
            {activity.byDay.map((d) => (
              <div key={d.day} style={{ flex: 1, textAlign: "center" }} title={`${d.messages} mensajes`}>
                <div style={{ height: 140, display: "flex", alignItems: "flex-end" }}><div style={{ width: "100%", height: `${Math.max(3, (d.messages / maxDay) * 100)}%`, background: d.day === today() ? "#c82828" : "var(--ink)", borderRadius: 6, opacity: d.messages ? 1 : 0.15 }} /></div>
                <div className="text-xs text-secondary" style={{ marginTop: 6 }}>{shortDate(d.day).split(" ")[0]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-2-1">
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Actividad por canal · 7 días</h3>
          {activity.channels.slice().sort((a, b) => b.messages - a.messages).map((c) => (
            <div key={c.id} style={{ display: "grid", gridTemplateColumns: "190px 1fr 50px", alignItems: "center", gap: 12, padding: "7px 0" }}>
              <span className="text-sm">{c.name}</span>
              <div style={{ height: 8, borderRadius: 9, background: "var(--border-color)", overflow: "hidden" }}><div style={{ width: `${(c.messages / maxCh) * 100}%`, height: "100%", background: "var(--ink)" }} /></div>
              <span className="text-sm" style={{ textAlign: "right", fontWeight: 600 }}>{c.messages}</span>
            </div>
          ))}
          <p className="text-xs text-secondary" style={{ marginTop: 8 }}>Solo canales donde habla la comunidad; los de solo lectura y los mensajes automáticos no cuentan.</p>
        </div>
        <div className="card">
          <h3 style={{ fontWeight: 600, marginBottom: 12 }}>Foros</h3>
          {activity.forums.map((f) => (
            <div key={f.id} className="flex justify-between items-center" style={{ padding: "9px 0", borderBottom: "1px solid var(--border-color)" }}>
              <span className="text-sm">{f.name}</span>
              <span className="text-xs text-secondary">{f.open} abiertas · {f.new7d} nuevas · {f.replies} respuestas</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function MembersChart({ history, goal }: { history: DiscordStats["history"]; goal: number }) {
  if (history.length < 2) return <div className="empty" style={{ height: 180, display: "grid", placeItems: "center" }}><p className="text-sm text-secondary">La gráfica se irá llenando con una foto cada noche.</p></div>;
  const W = 700, H = 200, L = 36, R = 10, T = 10, B = 24;
  const max = Math.max(goal, ...history.map((h) => h.members)) * 1.1;
  const x = (i: number) => L + (i * (W - L - R)) / (history.length - 1);
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const pts = history.map((h, i) => `${x(i)},${y(h.members)}`).join(" ");
  const step = Math.max(1, Math.ceil(history.length / 8));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
      <line x1={L} x2={W - R} y1={y(goal)} y2={y(goal)} stroke="#c82828" strokeDasharray="4 4" strokeWidth={1.5} />
      <text x={W - R} y={y(goal) - 5} textAnchor="end" fontSize="11" fill="#c82828">meta {goal}</text>
      <polygon points={`${L},${H - B} ${pts} ${x(history.length - 1)},${H - B}`} fill="rgba(11,19,36,0.07)" />
      <polyline points={pts} fill="none" stroke="var(--ink)" strokeWidth={2.5} strokeLinejoin="round" />
      {history.map((h, i) => i % step === 0 || i === history.length - 1 ? <text key={h.day} x={x(i)} y={H - 6} textAnchor="middle" fontSize="11" fill="#8b95aa">{shortDate(h.day)}</text> : null)}
    </svg>
  );
}

// ===================== AVISOS DE REDES =====================
function Redes({ auth, flash }: { auth: Record<string, string>; flash: (m: string) => void }) {
  const [posts, setPosts] = useState<(Post & { discord_notified_at?: string | null })[]>([]);
  const [busy, setBusy] = useState<string>("");
  const [form, setForm] = useState({ platform: "tiktok", url: "", text: "", also: false });

  async function load() {
    const { data } = await supabase.from("content_posts").select("*").eq("status", "publicado").order("publish_date", { ascending: false }).limit(60);
    setPosts(((data as any[]) || []).filter((p) => p.platform in SOCIAL_TARGETS));
  }
  useEffect(() => { load(); }, []);

  async function notify(body: Record<string, unknown>, key: string) {
    setBusy(key);
    const r = await callApi("/api/discord/social", { method: "POST", headers: auth, body: JSON.stringify(body) });
    setBusy("");
    flash(r.ok ? "Aviso publicado en Discord ✅" : `No se pudo avisar: ${r.error}`);
    if (r.ok) load();
    return r.ok;
  }

  const pending = posts.filter((p) => p.url && !p.discord_notified_at);
  const noUrl = posts.filter((p) => !p.url && !p.discord_notified_at);
  const done = posts.filter((p) => p.discord_notified_at).slice(0, 10);

  return (
    <div className="grid-2-1">
      <div>
        <div className="card" style={{ marginBottom: "1.25rem" }}>
          <div className="flex justify-between items-center" style={{ marginBottom: 6 }}>
            <h3 style={{ fontWeight: 600 }}>Publicadas en el Calendario, sin avisar</h3>
            <span className="chip">{pending.length}</span>
          </div>
          <p className="text-xs text-secondary" style={{ marginBottom: 12 }}>Las publicaciones de TikTok, Instagram, YouTube o LinkedIn marcadas como <b>Publicado</b> y con enlace aparecen aquí. Un clic y sale el aviso en su canal del Discord.</p>
          {pending.length === 0 && <div className="empty" style={{ padding: "1.5rem", textAlign: "center" }}><p className="text-sm text-secondary">Todo avisado. 🎉</p></div>}
          {pending.map((p) => (
            <div key={p.id} className="flex justify-between items-center" style={{ gap: 12, padding: "10px 0", borderTop: "1px solid var(--border-color)" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }} className="text-sm">{SOCIAL_TARGETS[p.platform].emoji} {p.title || "Sin título"}</div>
                <div className="text-xs text-secondary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.publish_date ? shortDate(p.publish_date) : ""} · {p.url}</div>
              </div>
              <button className="btn-primary" disabled={busy === p.id} onClick={() => notify({ platform: p.platform, url: p.url, text: p.title, post_id: p.id }, p.id!)}>
                <Send style={{ width: 15, height: 15 }} /> {busy === p.id ? "Avisando…" : "Avisar"}
              </button>
            </div>
          ))}
          {noUrl.length > 0 && <p className="text-xs text-secondary" style={{ marginTop: 10 }}>{noUrl.length} publicada(s) sin enlace: añade el enlace en el Calendario para poder avisar.</p>}
        </div>
        {done.length > 0 && (
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 8 }}>Ya avisadas</h3>
            {done.map((p) => <div key={p.id} className="text-sm flex justify-between" style={{ padding: "6px 0" }}><span>{SOCIAL_TARGETS[p.platform].emoji} {p.title}</span><span className="text-xs text-secondary">{ago(p.discord_notified_at || undefined)}</span></div>)}
          </div>
        )}
      </div>

      <div className="card">
        <h3 style={{ fontWeight: 600, marginBottom: 4 }}>Aviso a mano</h3>
        <p className="text-xs text-secondary" style={{ marginBottom: 14 }}>Para algo que no está en el Calendario.</p>
        <div className="form-group"><label>Red</label>
          <select value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
            {Object.entries(SOCIAL_TARGETS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
          </select>
        </div>
        <div className="form-group"><label>Enlace</label><input placeholder="https://…" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
        <div className="form-group"><label>Texto (opcional)</label><textarea rows={3} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></div>
        <label className="text-sm flex items-center gap-2" style={{ marginBottom: 14 }}><input type="checkbox" style={{ width: 16, height: 16, flex: "none", padding: 0 }} checked={form.also} onChange={(e) => setForm({ ...form, also: e.target.checked })} /> Avisar también en #anuncios</label>
        <button className="btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={!/^https?:\/\//.test(form.url) || busy === "manual"}
          onClick={async () => { if (await notify({ platform: form.platform, url: form.url, text: form.text, also_announce: form.also }, "manual")) setForm({ ...form, url: "", text: "" }); }}>
          <Send style={{ width: 15, height: 15 }} /> Publicar aviso
        </button>
      </div>
    </div>
  );
}

// ===================== ANUNCIOS =====================
function Anuncios({ auth, flash }: { auth: Record<string, string>; flash: (m: string) => void }) {
  const [a, setA] = useState({ title: "", body: "", image_url: "", button_label: "", button_url: "", crosspost: false });
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const valid = a.title.trim() && a.body.trim();

  async function publish() {
    setBusy(true);
    const r = await callApi<{ url: string }>("/api/discord/announce", { method: "POST", headers: auth, body: JSON.stringify(a) });
    setBusy(false); setConfirm(false);
    if (r.ok) { flash("Anuncio publicado en #anuncios ✅"); setA({ title: "", body: "", image_url: "", button_label: "", button_url: "", crosspost: false }); }
    else flash(`No se pudo publicar: ${r.error}`);
  }

  return (
    <div className="grid-2-1" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
      <div className="card">
        <h3 style={{ fontWeight: 600, marginBottom: 14 }}>Nuevo anuncio</h3>
        <div className="form-group"><label>Título</label><input value={a.title} maxLength={200} onChange={(e) => setA({ ...a, title: e.target.value })} placeholder="🚀 Taller en directo: tu primer agente" /></div>
        <div className="form-group"><label>Texto <span className="text-muted">(admite **negrita**, listas con •, enlaces)</span></label><textarea rows={8} value={a.body} maxLength={3500} onChange={(e) => setA({ ...a, body: e.target.value })} /></div>
        <div className="form-group"><label>Imagen (URL, opcional)</label><input value={a.image_url} onChange={(e) => setA({ ...a, image_url: e.target.value })} placeholder="https://…" /></div>
        <div className="flex gap-4">
          <div className="form-group flex-1"><label>Botón (opcional)</label><input value={a.button_label} onChange={(e) => setA({ ...a, button_label: e.target.value })} placeholder="Apúntate" /></div>
          <div className="form-group flex-1"><label>Enlace del botón</label><input value={a.button_url} onChange={(e) => setA({ ...a, button_url: e.target.value })} placeholder="https://…" /></div>
        </div>
        <label className="text-sm flex items-center gap-2" style={{ marginBottom: 14 }}><input type="checkbox" style={{ width: 16, height: 16, flex: "none", padding: 0 }} checked={a.crosspost} onChange={(e) => setA({ ...a, crosspost: e.target.checked })} /> Enviar también a los servidores que siguen #anuncios</label>
        <button className="btn-primary" disabled={!valid || busy} onClick={() => setConfirm(true)}><Megaphone style={{ width: 16, height: 16 }} /> Publicar en #anuncios</button>
      </div>

      <div className="card" style={{ background: "#313338", color: "#dbdee1" }}>
        <div className="text-xs" style={{ color: "#949ba4", marginBottom: 10, letterSpacing: "0.06em" }}>VISTA PREVIA · 📢・anuncios</div>
        <div style={{ display: "flex", gap: 12 }}>
          <img src="/aldia-mark.png" alt="" style={{ width: 40, height: 40, borderRadius: 99, background: "#fff", padding: 9, objectFit: "contain" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, color: "#fff", marginBottom: 6 }}>ALDIA AI <span style={{ background: "#5865f2", fontSize: 10, padding: "1px 5px", borderRadius: 4, marginLeft: 4 }}>APP</span></div>
            <div style={{ borderLeft: "4px solid #c82828", background: "#2b2d31", borderRadius: 8, padding: 14 }}>
              {a.image_url && /^https:\/\//.test(a.image_url) && <img src={a.image_url} alt="" style={{ width: "100%", borderRadius: 6, marginBottom: 10 }} />}
              <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 8 }}>{a.title || "Título del anuncio"}</div>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 14, lineHeight: 1.5 }}>{a.body || "El texto aparecerá aquí."}</div>
              {a.button_label && <div style={{ display: "inline-block", marginTop: 12, background: "#4e5058", color: "#fff", padding: "6px 14px", borderRadius: 6, fontSize: 14 }}>{a.button_label} ↗</div>}
              <div style={{ fontSize: 11, color: "#949ba4", marginTop: 10 }}>ALDIA · AI ENGINEERING PIONEERS</div>
            </div>
          </div>
        </div>
      </div>

      {confirm && <Portal><div className="dialog-overlay" onClick={() => setConfirm(false)}><div className="dialog" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
        <div className="dialog-body">
          <h3 style={{ fontWeight: 600, marginBottom: 8 }}>¿Publicar el anuncio?</h3>
          <p className="text-sm text-secondary" style={{ marginBottom: 18 }}>Lo verá toda la comunidad en #anuncios{a.crosspost ? " y los servidores que lo siguen" : ""}.</p>
          <div className="flex gap-2" style={{ justifyContent: "flex-end" }}><button className="btn-ghost" style={{ width: "auto" }} onClick={() => setConfirm(false)}>Cancelar</button><button className="btn-primary" disabled={busy} onClick={publish}>{busy ? "Publicando…" : "Publicar"}</button></div>
        </div>
      </div></div></Portal>}
    </div>
  );
}

// ===================== AUTOMATIZACIONES =====================
function Automatizaciones({ auth, flash, session }: { auth: Record<string, string>; flash: (m: string) => void; session: boolean }) {
  const [flows, setFlows] = useState<FlowStatus[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    if (!session) return;
    const r = await callApi<{ flows: FlowStatus[] }>("/api/discord/flows", { headers: auth });
    if (r.ok && r.data) { setFlows(r.data.flows); setErr(""); } else setErr(r.error || "");
  }, [auth, session]);
  useEffect(() => { load(); }, [load]);

  async function run(f: FlowStatus) {
    setBusy(f.slug);
    const r = await callApi("/api/discord/flows", { method: "POST", headers: auth, body: JSON.stringify({ slug: f.slug }) });
    setBusy("");
    flash(r.ok ? `${f.name}: lanzado. En unos segundos sale en Discord.` : `No se pudo lanzar: ${r.error}`);
    setTimeout(load, 6000);
  }

  if (err) return <div className="banner"><AlertTriangle /><div><b>No se pudo leer n8n.</b> {err}</div></div>;
  if (!flows) return <div className="card" style={{ padding: "2.5rem", textAlign: "center" }}><p className="text-sm text-secondary">Consultando n8n…</p></div>;
  return (
    <div className="card table-container" style={{ padding: 0 }}>
      <table className="data-table">
        <thead><tr><th>Flujo</th><th>Cuándo</th><th>Última ejecución</th><th>7 días</th><th></th></tr></thead>
        <tbody>
          {flows.map((f) => {
            const ok = f.last?.status === "success", bad = f.last && !ok && f.last.status !== "running" && f.last.status !== "waiting";
            return (
              <tr key={f.slug}>
                <td style={{ fontWeight: 600 }}>{f.name}</td>
                <td className="text-sm"><Clock style={{ width: 13, height: 13, verticalAlign: -2, marginRight: 4, color: "var(--text-muted)" }} />{f.schedule}</td>
                <td className="text-sm">{f.last
                  ? <span className={ok ? "chip chip-ok" : bad ? "chip chip-bad" : "chip"}>{ok ? <CheckCircle2 style={{ width: 13, height: 13 }} /> : bad ? <XCircle style={{ width: 13, height: 13 }} /> : null} {ok ? "Correcta" : bad ? "Error" : f.last.status} · {ago(f.last.at)}</span>
                  : <span className="text-muted">Aún no se ha ejecutado</span>}</td>
                <td className="text-sm">{f.runs7d} {f.errors7d > 0 && <span style={{ color: "var(--bad)" }}>· {f.errors7d} con error</span>}</td>
                <td style={{ textAlign: "right" }}>
                  {f.manual && <button className="btn-secondary" disabled={busy === f.slug} onClick={() => run(f)}><Play style={{ width: 14, height: 14 }} /> {busy === f.slug ? "Lanzando…" : "Lanzar ahora"}</button>}
                  {f.form && <a className="btn-secondary" href={f.form} target="_blank" rel="noreferrer"><ExternalLink style={{ width: 14, height: 14 }} /> Formulario</a>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="flex justify-between items-center" style={{ padding: "0.75rem 1rem" }}>
        <span className="text-xs text-secondary">Los flujos viven en n8n (nombres 0xFe…). Lanzar a mano publica de verdad en el Discord.</span>
        <button className="btn-ghost" style={{ width: "auto" }} onClick={load}><RefreshCw style={{ width: 14, height: 14 }} /> Actualizar</button>
      </div>
    </div>
  );
}
