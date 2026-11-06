"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X, Trash2, Mail, Users, Send, CalendarClock, HardDrive, AlertTriangle, ArrowUp, ArrowDown, Copy, Check, Download, UserPlus, FlaskConical, Search } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Portal from "@/components/Portal";
import { Person, addDays, fmt, fromISO, pct, shortDate, today } from "@/lib/social";
import {
  Edition, EditionItem, ITEM_KINDS, ItemKind, NEWSLETTER_NAME, Subscriber, blankEdition, cadenceFor, goalFor, renderEmailHtml,
} from "@/lib/newsletter";

type Estado = { ok: boolean; resend?: boolean; supabase?: boolean; from?: string; testMode?: boolean; origins?: string[] } | null;
type Tab = "ediciones" | "suscriptores" | "captar";
const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  borrador: { label: "Borrador", cls: "chip" }, enviando: { label: "Enviando…", cls: "chip chip-bad" }, enviada: { label: "Enviada", cls: "chip chip-ok" },
  pendiente: { label: "Sin confirmar", cls: "chip" }, activo: { label: "Activo", cls: "chip chip-ok" }, baja: { label: "Baja", cls: "chip chip-bad" },
};
const missingTable = (e: any) => /42P01|PGRST205|could not find the table|does not exist/i.test(`${e?.code} ${e?.message}`);

/** Próximo viernes desde hoy (la newsletter se prepara y sale el viernes). */
function nextFriday(from: string) { let d = from; while (fromISO(d).getDay() !== 5) d = addDays(d, 1); return d; }

export default function NewsletterPage() {
  const { session } = useAuth();
  const [subs, setSubs] = useState<Subscriber[]>([]);
  const [eds, setEds] = useState<Edition[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [missing, setMissing] = useState(false);
  const [estado, setEstado] = useState<Estado | "sin-servidor">(null);
  const [tab, setTab] = useState<Tab>("ediciones");
  const [editing, setEditing] = useState<Edition | null>(null);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState("");

  const auth = useMemo(() => ({ authorization: `Bearer ${session?.access_token || ""}`, "content-type": "application/json" }), [session?.access_token]);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 4500); };

  async function load() {
    const [s, e, p] = await Promise.all([
      supabase.from("newsletter_subscribers").select("*").order("created_at", { ascending: false }),
      supabase.from("newsletter_editions").select("*").order("created_at", { ascending: false }),
      supabase.from("community_people").select("*"),
    ]);
    if (s.error && missingTable(s.error)) { setMissing(true); return; }
    setMissing(false);
    setSubs((s.data as Subscriber[]) || []); setEds((e.data as Edition[]) || []); setPeople((p.data as Person[]) || []);
  }
  useEffect(() => { load(); }, []);
  useEffect(() => {
    if (!session) return;
    fetch("/api/newsletter/estado", { headers: auth }).then(async (r) => {
      const ct = r.headers.get("content-type") || "";
      setEstado(ct.includes("json") ? await r.json() : "sin-servidor");   // en `next dev` no hay funciones de Cloudflare
    }).catch(() => setEstado("sin-servidor"));
  }, [session, auth]);

  const t = today();
  const active = subs.filter((s) => s.status === "activo");
  const pending = subs.filter((s) => s.status === "pendiente");
  const gone = subs.filter((s) => s.status === "baja");
  const goal = goalFor(t);
  const sent = eds.filter((e) => e.status === "enviada").sort((a, b) => (b.sent_at || "").localeCompare(a.sent_at || ""));
  const last = sent[0];
  const cadence = cadenceFor(t);
  const nextDue = last?.sent_at ? nextFriday(addDays(last.sent_at.slice(0, 10), cadence === "quincenal" ? 12 : 5)) : nextFriday(t);
  const newThisWeek = active.filter((s) => (s.confirmed_at || s.created_at).slice(0, 10) >= addDays(t, -6)).length;
  const bySource = Object.entries(active.reduce<Record<string, number>>((m, s) => { const k = s.source || "web"; m[k] = (m[k] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);
  const serverReady = estado && estado !== "sin-servidor" && estado.ok && estado.resend && estado.supabase;

  function newEdition() {
    const n = Math.max(0, ...eds.map((e) => e.number || 0)) + 1;
    setEditing({ ...blankEdition(n), planned_for: nextDue });
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: 1400 }}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Objetivo 1 · Comunidad · Nutrir</div>
          <h2 className="page-title">Newsletter</h2>
          <p className="page-subtitle">{NEWSLETTER_NAME}: {cadence} hasta el 6-dic y semanal después. Una noticia, una automatización y una herramienta o caso real. Sale el viernes.</p>
        </div>
        {!missing && <button className="btn-primary" onClick={newEdition}><Plus style={{ width: 17, height: 17 }} /> Nueva edición</button>}
      </div>

      {missing && <div className="banner"><HardDrive /><div><b>Faltan las tablas de la newsletter.</b> Ejecuta <code>newsletter_setup.sql</code> en Supabase y después <code>seguridad_rls.sql</code>.</div></div>}
      {!missing && estado === "sin-servidor" && <div className="banner"><AlertTriangle /><div><b>Aquí no hay servidor de envíos.</b> En local (<code>next dev</code>) las funciones de Cloudflare no corren: los envíos y las altas solo funcionan en aldiasmart.pages.dev.</div></div>}
      {!missing && estado && estado !== "sin-servidor" && estado.ok && (!estado.resend || !estado.supabase) && (
        <div className="banner"><AlertTriangle /><div><b>Falta configurar el envío.</b> En Cloudflare Pages → Settings → Variables añadid {[!estado.resend && <code key="r">RESEND_API_KEY</code>, !estado.supabase && <code key="s">SUPABASE_SERVICE_ROLE_KEY</code>].filter(Boolean).reduce<React.ReactNode[]>((a, c, i) => (i ? [...a, " y ", c] : [c]), [])} y volved a desplegar.</div></div>
      )}
      {!missing && serverReady && estado.testMode && <div className="banner"><FlaskConical /><div><b>Modo prueba de Resend.</b> Se envía desde onboarding@resend.dev, que solo llega a la cuenta dueña de Resend. Verificad el dominio aldiaproject.es en Resend y poned <code>NEWSLETTER_FROM</code>.</div></div>}

      {!missing && (
        <>
          <div className="grid-4" style={{ marginBottom: "1.25rem" }}>
            <div className="card kpi">
              <div className="kpi-label">Suscriptores <Users /></div>
              <div className="kpi-value">{fmt(active.length)}<span style={{ fontSize: "1rem", color: "var(--text-muted)", fontWeight: 500 }}> / {goal.target}</span></div>
              <div className="target" style={{ marginTop: 8 }}><div className="bar" style={{ display: "block", height: 6, borderRadius: 9, background: "var(--bg-surface)", overflow: "hidden", flex: 1 }}><i style={{ display: "block", height: "100%", width: `${Math.min(100, pct(active.length, goal.target))}%`, background: active.length >= goal.target ? "var(--ok)" : "var(--accent)" }} /></div></div>
              <div className="kpi-sub">Meta S{goal.week} ({shortDate(goal.until)}) · +{newThisWeek} esta semana</div>
            </div>
            <div className="card kpi"><div className="kpi-label">Sin confirmar <Mail /></div><div className="kpi-value">{pending.length}</div><div className="kpi-sub">Se apuntaron pero no han pulsado el enlace · {gone.length} bajas</div></div>
            <div className="card kpi"><div className="kpi-label">Ediciones enviadas <Send /></div><div className="kpi-value">{sent.length}</div><div className="kpi-sub">{last ? `Última: Nº ${last.number} el ${shortDate(last.sent_at!.slice(0, 10))} a ${last.recipients}` : "Aún ninguna"}</div></div>
            <div className="card kpi"><div className="kpi-label">Próxima edición <CalendarClock /></div><div className="kpi-value" style={{ color: nextDue < t ? "var(--bad)" : undefined }}>{shortDate(nextDue)}</div><div className="kpi-sub">Viernes · cadencia {cadence}</div></div>
          </div>

          <div className="flex justify-between items-center" style={{ marginBottom: "1rem", gap: 12, flexWrap: "wrap" }}>
            <div className="seg">
              {(["ediciones", "suscriptores", "captar"] as Tab[]).map((k) => (
                <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{k === "ediciones" ? `Ediciones (${eds.length})` : k === "suscriptores" ? `Suscriptores (${subs.length})` : "Captar"}</button>
              ))}
            </div>
            {bySource.length > 0 && <div className="text-xs text-secondary">De dónde vienen: {bySource.slice(0, 5).map(([k, v]) => `${k} ${v}`).join(" · ")}</div>}
          </div>

          {tab === "ediciones" && <Editions eds={eds} onOpen={setEditing} onNew={newEdition} />}
          {tab === "suscriptores" && <Subscribers subs={subs} people={people} auth={auth} reload={load} flash={flash} onAdd={() => setAdding(true)} />}
          {tab === "captar" && <Capture origins={estado && estado !== "sin-servidor" ? estado.origins || [] : []} />}
        </>
      )}

      {editing && <Editor initial={editing} active={active.length} auth={auth} serverReady={!!serverReady} onClose={() => setEditing(null)} onSaved={load} flash={flash} />}
      {adding && <AddSubscriber onClose={() => setAdding(false)} onDone={() => { setAdding(false); load(); }} auth={auth} flash={flash} />}
      {toast && <Portal><div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", background: "var(--ink)", color: "#fff", padding: "0.75rem 1.25rem", borderRadius: 12, fontSize: "0.875rem", zIndex: 1000, boxShadow: "var(--shadow-lg)", maxWidth: "90vw" }}>{toast}</div></Portal>}
    </div>
  );
}

// ===================== EDICIONES =====================
function Editions({ eds, onOpen, onNew }: { eds: Edition[]; onOpen: (e: Edition) => void; onNew: () => void }) {
  if (!eds.length) return (
    <div className="card" style={{ padding: "2.5rem", textAlign: "center" }}>
      <Mail style={{ width: 28, height: 28, color: "var(--text-muted)", margin: "0 auto 10px" }} />
      <h3 style={{ fontWeight: 600, marginBottom: 6 }}>Todavía no hay ninguna edición</h3>
      <p className="text-sm text-secondary" style={{ marginBottom: 16 }}>La primera puede salir el viernes de la S2 (20-nov), con lo mejor de las dos primeras semanas de contenido.</p>
      <button className="btn-primary" onClick={onNew}><Plus style={{ width: 16, height: 16 }} /> Crear la Nº 1</button>
    </div>
  );
  return (
    <div className="card table-container" style={{ padding: 0 }}>
      <table className="data-table">
        <thead><tr><th style={{ width: 60 }}>Nº</th><th>Asunto</th><th>Estado</th><th>Fecha</th><th style={{ textAlign: "right" }}>Destinatarios</th></tr></thead>
        <tbody>
          {eds.map((e) => (
            <tr key={e.id} onClick={() => onOpen(e)} style={{ cursor: "pointer" }}>
              <td><b>{e.number ?? "—"}</b></td>
              <td><div style={{ fontWeight: 600 }}>{e.subject || <span className="text-muted">Sin asunto</span>}</div>{e.preheader && <div className="text-xs text-secondary">{e.preheader}</div>}</td>
              <td><span className={STATUS_CHIP[e.status]?.cls}>{STATUS_CHIP[e.status]?.label}</span></td>
              <td className="text-sm">{e.sent_at ? shortDate(e.sent_at.slice(0, 10)) : e.planned_for ? `Para el ${shortDate(e.planned_for)}` : "—"}</td>
              <td style={{ textAlign: "right" }}>{e.status === "borrador" ? "—" : fmt(e.recipients || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ===================== EDITOR =====================
function Editor({ initial, active, auth, serverReady, onClose, onSaved, flash }: {
  initial: Edition; active: number; auth: Record<string, string>; serverReady: boolean; onClose: () => void; onSaved: () => void; flash: (m: string) => void;
}) {
  const [e, setE] = useState<Edition>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmSend, setConfirmSend] = useState(false);
  const locked = e.status !== "borrador";
  const set = (patch: Partial<Edition>) => setE((x) => ({ ...x, ...patch }));
  const setItem = (i: number, patch: Partial<EditionItem>) => set({ items: e.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const move = (i: number, d: -1 | 1) => { const items = [...e.items]; const j = i + d; if (j < 0 || j >= items.length) return; [items[i], items[j]] = [items[j], items[i]]; set({ items }); };
  const preview = useMemo(() => renderEmailHtml(e, { unsubscribeUrl: "#", name: "Laura" }), [e]);
  const issues = [
    !e.subject.trim() && "Falta el asunto",
    e.subject.length > 60 && "El asunto pasa de 60 caracteres (se corta en el móvil)",
    !e.preheader?.trim() && "Falta el texto de vista previa",
    e.items.some((i) => i.kind === "noticia" && (i.title || i.body) && !i.url?.trim() && !i.source?.trim()) && "Una noticia no tiene fuente",
    !e.items.some((i) => i.title.trim() || i.body.trim()) && "No hay ningún bloque con contenido",
  ].filter(Boolean) as string[];

  async function save(): Promise<Edition | null> {
    setBusy("save");
    const { id, created_at, ...row } = e as any;
    const payload = { ...row, updated_at: new Date().toISOString() };
    const { data, error } = id ? await supabase.from("newsletter_editions").update(payload).eq("id", id).select().single() : await supabase.from("newsletter_editions").insert(payload).select().single();
    setBusy(null);
    if (error) { flash(`No se ha podido guardar: ${error.message}`); return null; }
    setE(data as Edition); onSaved(); return data as Edition;
  }

  async function send(test: boolean) {
    const saved = locked ? e : await save(); if (!saved?.id) return;
    setBusy(test ? "test" : "send"); setConfirmSend(false);
    try {
      let total = 0;
      for (let round = 0; round < 50; round++) {
        const r = await fetch("/api/newsletter/send", { method: "POST", headers: auth, body: JSON.stringify({ edition_id: saved.id, test }) });
        const d = await r.json().catch(() => ({ ok: false, error: "El servidor no responde" }));
        if (test) { flash(d.ok ? `Prueba enviada a ${d.to}` : d.error); break; }
        total += d.sent || 0;
        if (d.error) { flash(`${total ? `Enviados ${total}. ` : ""}${d.error}`); break; }
        if (!d.remaining) { flash(`¡Enviada a ${d.total} suscriptores!`); break; }
      }
    } catch { flash("Sin conexión con el servidor de envíos"); }
    setBusy(null);
    if (!test) { const { data } = await supabase.from("newsletter_editions").select("*").eq("id", saved.id).single(); if (data) setE(data as Edition); onSaved(); }
  }

  async function remove() {
    if (!e.id) return onClose();
    const { error } = await supabase.from("newsletter_editions").delete().eq("id", e.id);
    if (error) flash(error.message); else { onSaved(); onClose(); }
  }

  return (
    <Portal>
      <div className="dialog-overlay" onClick={onClose}>
        <div className="dialog" style={{ maxWidth: 1240, width: "96vw", maxHeight: "94vh", display: "flex", flexDirection: "column" }} onClick={(ev) => ev.stopPropagation()}>
          <div className="dialog-head">
            <div><div className="eyebrow">{NEWSLETTER_NAME} · Nº {e.number ?? "—"} · <span className={STATUS_CHIP[e.status]?.cls} style={{ fontSize: 11 }}>{STATUS_CHIP[e.status]?.label}</span></div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em" }}>{e.subject || "Nueva edición"}</h3></div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar"><X /></button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 0, overflow: "hidden", flex: 1, minHeight: 0 }}>
            <div className="dialog-body" style={{ overflow: "auto", borderRight: "1px solid var(--border-color)" }}>
              <fieldset disabled={locked} style={{ border: 0, padding: 0, margin: 0 }}>
                <div className="flex gap-4">
                  <div className="form-group flex-1"><label>Asunto <span className="text-muted">({e.subject.length}/60)</span></label><input autoFocus value={e.subject} onChange={(x) => set({ subject: x.target.value })} placeholder="Lo que de verdad cambia esta semana" /></div>
                  <div className="form-group" style={{ width: 90 }}><label>Nº</label><input type="number" min={1} value={e.number ?? ""} onChange={(x) => set({ number: Number(x.target.value) || null })} /></div>
                  <div className="form-group" style={{ width: 160 }}><label>Para el</label><input type="date" value={e.planned_for || ""} onChange={(x) => set({ planned_for: x.target.value || null })} /></div>
                </div>
                <div className="form-group"><label>Vista previa en la bandeja</label><input value={e.preheader || ""} onChange={(x) => set({ preheader: x.target.value })} placeholder="La frase gris que sale junto al asunto" /></div>
                <div className="form-group"><label>Entradilla</label><textarea rows={3} value={e.intro || ""} onChange={(x) => set({ intro: x.target.value })} placeholder="Dos o tres frases: de qué va esta edición y por qué te importa." /></div>

                <div className="text-xs text-muted" style={{ margin: "0.25rem 0 0.75rem" }}>Formato: **negrita**, [texto](https://enlace), listas empezando la línea con «- ». Una línea en blanco separa párrafos.</div>

                {e.items.map((it, i) => (
                  <div key={i} className="card" style={{ padding: "0.875rem 1rem", marginBottom: "0.75rem", boxShadow: "none", border: "1px solid var(--border-color)" }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                      <select value={it.kind} onChange={(x) => setItem(i, { kind: x.target.value as ItemKind })} style={{ width: "auto", fontWeight: 600 }}>
                        {Object.entries(ITEM_KINDS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                      <span className="text-xs text-muted flex-1">{ITEM_KINDS[it.kind]?.hint}</span>
                      <button type="button" className="icon-btn" onClick={() => move(i, -1)} aria-label="Subir"><ArrowUp /></button>
                      <button type="button" className="icon-btn" onClick={() => move(i, 1)} aria-label="Bajar"><ArrowDown /></button>
                      <button type="button" className="icon-btn" onClick={() => set({ items: e.items.filter((_, j) => j !== i) })} aria-label="Quitar"><Trash2 /></button>
                    </div>
                    <div className="form-group"><input value={it.title} onChange={(x) => setItem(i, { title: x.target.value })} placeholder="Titular" /></div>
                    <div className="form-group"><textarea rows={4} value={it.body} onChange={(x) => setItem(i, { body: x.target.value })} placeholder="Qué es, por qué importa y qué puede hacer una pyme con ello." /></div>
                    <div className="flex gap-4">
                      <div className="form-group flex-1" style={{ marginBottom: 0 }}><input value={it.url || ""} onChange={(x) => setItem(i, { url: x.target.value })} placeholder="Enlace (https://…)" /></div>
                      {it.kind === "noticia" && <div className="form-group" style={{ width: 170, marginBottom: 0 }}><input value={it.source || ""} onChange={(x) => setItem(i, { source: x.target.value })} placeholder="Fuente (medio)" /></div>}
                    </div>
                  </div>
                ))}
                <button type="button" className="add-slot" style={{ width: "100%", marginBottom: "1rem" }} onClick={() => set({ items: [...e.items, { kind: "texto", title: "", body: "" }] })}>+ Añadir bloque</button>

                <div className="card" style={{ padding: "0.875rem 1rem", boxShadow: "none", border: "1px solid var(--border-color)" }}>
                  <div className="eyebrow" style={{ marginBottom: 8 }}>Llamada a la acción (una sola)</div>
                  <div className="form-group"><textarea rows={2} value={e.cta?.text || ""} onChange={(x) => set({ cta: { ...e.cta, text: x.target.value } })} placeholder="Texto" /></div>
                  <div className="flex gap-4">
                    <div className="form-group flex-1" style={{ marginBottom: 0 }}><input value={e.cta?.label || ""} onChange={(x) => set({ cta: { ...e.cta, label: x.target.value } })} placeholder="Botón" /></div>
                    <div className="form-group flex-1" style={{ marginBottom: 0 }}><input value={e.cta?.url || ""} onChange={(x) => set({ cta: { ...e.cta, url: x.target.value } })} placeholder="https://…" /></div>
                  </div>
                </div>
              </fieldset>
            </div>

            <div style={{ background: "#f4f4f5", display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div className="text-xs text-muted" style={{ padding: "0.5rem 1rem" }}>Vista previa (así llega; con el nombre si lo dejó)</div>
              <iframe title="Vista previa" srcDoc={preview} style={{ border: 0, flex: 1, width: "100%", background: "#f4f4f5" }} sandbox="" />
            </div>
          </div>

          <div className="dialog-foot" style={{ flexWrap: "wrap", gap: 10 }}>
            <div className="flex items-center gap-3" style={{ flexWrap: "wrap" }}>
              {e.status === "borrador" && <button type="button" className="btn-danger" onClick={remove}><Trash2 style={{ width: 15, height: 15 }} /> Borrar</button>}
              {issues.length > 0 && !locked && <span className="text-xs" style={{ color: "var(--warn)" }}>⚠ {issues.join(" · ")}</span>}
              {locked && e.status === "enviada" && <span className="text-sm text-secondary">Enviada el {e.sent_at && shortDate(e.sent_at.slice(0, 10))} a {fmt(e.recipients || 0)} suscriptores.</span>}
            </div>
            <div className="flex items-center gap-2" style={{ flexWrap: "wrap" }}>
              {!locked && <button type="button" className="btn-secondary" disabled={!!busy} onClick={save}>{busy === "save" ? "Guardando…" : "Guardar"}</button>}
              <button type="button" className="btn-secondary" disabled={!!busy || !serverReady || !e.subject.trim()} onClick={() => send(true)} title={serverReady ? "" : "Falta configurar el envío"}><FlaskConical style={{ width: 15, height: 15 }} /> {busy === "test" ? "Enviando…" : "Enviarme una prueba"}</button>
              {e.status !== "enviada" && (confirmSend
                ? <><span className="text-sm">¿Enviar a {fmt(active)} suscriptores? No se puede deshacer.</span><button type="button" className="btn-secondary" onClick={() => setConfirmSend(false)}>No</button><button type="button" className="btn-primary" onClick={() => send(false)}>Sí, enviar</button></>
                : <button type="button" className="btn-primary" disabled={!!busy || !serverReady || !active || issues.some((x) => x.startsWith("Falta el asunto") || x.startsWith("No hay"))} onClick={() => setConfirmSend(true)}><Send style={{ width: 15, height: 15 }} /> {busy === "send" ? "Enviando…" : e.status === "enviando" ? "Continuar envío" : `Enviar a ${fmt(active)}`}</button>)}
            </div>
          </div>
        </div>
      </div>
    </Portal>
  );
}

// ===================== SUSCRIPTORES =====================
function Subscribers({ subs, people, auth, reload, flash, onAdd }: { subs: Subscriber[]; people: Person[]; auth: Record<string, string>; reload: () => void; flash: (m: string) => void; onAdd: () => void }) {
  const [q, setQ] = useState("");
  const [st, setSt] = useState<"todos" | Subscriber["status"]>("todos");
  const emails = new Set(subs.map((s) => s.email.toLowerCase()));
  const invitable = people.filter((p) => p.email && !emails.has(p.email.toLowerCase()));
  const shown = subs.filter((s) => (st === "todos" || s.status === st) && (!q || `${s.email} ${s.name || ""} ${s.source || ""}`.toLowerCase().includes(q.toLowerCase())));

  async function invite(p: Person) {
    const r = await fetch("/api/newsletter/subscribe", { method: "POST", headers: auth, body: JSON.stringify({ email: p.email, name: p.name, source: "comunidad" }) });
    const d = await r.json().catch(() => ({}));
    flash(d.ok ? `Invitación enviada a ${p.email}: queda «sin confirmar» hasta que pulse el enlace` : d.error || "No se ha podido invitar"); reload();
  }
  async function unsubscribe(s: Subscriber) {
    const { error } = await supabase.from("newsletter_subscribers").update({ status: "baja", unsubscribed_at: new Date().toISOString() }).eq("id", s.id);
    if (error) flash(error.message); else reload();
  }
  async function erase(s: Subscriber) {
    const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", s.id);
    if (error) flash(error.message); else { flash(`${s.email} borrado del todo (derecho de supresión)`); reload(); }
  }
  function exportCsv() {
    const rows = [["email", "nombre", "origen", "estado", "alta", "confirmado"], ...subs.map((s) => [s.email, s.name || "", s.source || "", s.status, s.created_at.slice(0, 10), s.confirmed_at?.slice(0, 10) || ""])];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv" })); a.download = `suscriptores-${today()}.csv`; a.click();
  }

  return (
    <div className="grid-2-1" style={{ alignItems: "start" }}>
      <div className="card table-container" style={{ padding: 0 }}>
        <div className="flex items-center gap-3" style={{ padding: "0.875rem 1rem", borderBottom: "1px solid var(--border-color)", flexWrap: "wrap" }}>
          <div className="flex items-center gap-2 flex-1" style={{ minWidth: 180 }}><Search style={{ width: 15, height: 15, color: "var(--text-muted)" }} /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar email, nombre u origen" style={{ border: 0, outline: "none", background: "transparent", width: "100%" }} /></div>
          <select value={st} onChange={(e) => setSt(e.target.value as any)} style={{ width: "auto" }}><option value="todos">Todos</option><option value="activo">Activos</option><option value="pendiente">Sin confirmar</option><option value="baja">Bajas</option></select>
          <button className="btn-secondary" onClick={exportCsv}><Download style={{ width: 15, height: 15 }} /> CSV</button>
          <button className="btn-primary" onClick={onAdd}><Plus style={{ width: 15, height: 15 }} /> Añadir</button>
        </div>
        {!shown.length ? <div className="text-sm text-secondary" style={{ padding: "2rem", textAlign: "center" }}>{subs.length ? "Nadie con ese filtro." : "Aún no hay suscriptores. Comparte el enlace de la pestaña «Captar»."}</div> : (
          <table className="data-table">
            <thead><tr><th>Email</th><th>Origen</th><th>Estado</th><th>Alta</th><th /></tr></thead>
            <tbody>
              {shown.map((s) => (
                <tr key={s.id}>
                  <td><div style={{ fontWeight: 600 }}>{s.email}</div>{s.name && <div className="text-xs text-secondary">{s.name}</div>}</td>
                  <td className="text-sm">{s.source || "web"}</td>
                  <td><span className={STATUS_CHIP[s.status]?.cls}>{STATUS_CHIP[s.status]?.label}</span></td>
                  <td className="text-sm">{shortDate(s.created_at.slice(0, 10))}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {s.status !== "baja" && <button className="btn-ghost text-xs" onClick={() => unsubscribe(s)}>Dar de baja</button>}
                    <button className="icon-btn" onClick={() => erase(s)} aria-label="Borrar del todo" title="Borrar del todo (derecho de supresión)"><Trash2 /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" style={{ padding: "1.25rem" }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 4 }}><UserPlus style={{ width: 16, height: 16 }} /><b>Invitar desde Comunidad</b></div>
        <p className="text-xs text-secondary" style={{ marginBottom: 12 }}>Personas de «Leads y contactos» con email que aún no están. Les llega el correo para confirmar: sin su clic no reciben nada.</p>
        {!invitable.length ? <p className="text-sm text-muted">No hay nadie más con email en Comunidad.</p> : invitable.slice(0, 30).map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2" style={{ padding: "0.5rem 0", borderTop: "1px solid var(--border-color)" }}>
            <div style={{ minWidth: 0 }}><div className="text-sm" style={{ fontWeight: 600 }}>{p.name}</div><div className="text-xs text-secondary" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{p.email}{p.company ? ` · ${p.company}` : ""}</div></div>
            <button className="btn-secondary text-xs" onClick={() => invite(p)}>Invitar</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AddSubscriber({ onClose, onDone, auth, flash }: { onClose: () => void; onDone: () => void; auth: Record<string, string>; flash: (m: string) => void }) {
  const [f, setF] = useState({ email: "", name: "", source: "manual", consent: false });
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    const email = f.email.trim().toLowerCase();
    if (f.consent) {
      // ya dio su permiso (por escrito o en una reunión): entra activo y se guarda cómo
      const { error } = await supabase.from("newsletter_subscribers").insert({ email, name: f.name || null, source: f.source || "manual", status: "activo", consent_text: "Consentimiento dado en persona; lo registra el equipo de ALDIA desde el panel.", consent_at: new Date().toISOString(), confirmed_at: new Date().toISOString() });
      setBusy(false);
      if (error) { flash(/duplicate|unique/i.test(error.message) ? "Ese email ya está en la lista" : error.message); return; }
      flash(`${email} añadido como activo`); onDone();
    } else {
      const r = await fetch("/api/newsletter/subscribe", { method: "POST", headers: auth, body: JSON.stringify({ email, name: f.name, source: f.source || "manual" }) });
      const d = await r.json().catch(() => ({})); setBusy(false);
      if (!d.ok) { flash(d.error || "No se ha podido enviar la invitación"); return; }
      flash(`Invitación enviada a ${email}`); onDone();
    }
  }
  return (
    <Portal>
      <div className="dialog-overlay" onClick={onClose}>
        <form className="dialog" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
          <div className="dialog-head"><div><div className="eyebrow">Suscriptores</div><h3 style={{ fontSize: "1.25rem", fontWeight: 500 }}>Añadir a la newsletter</h3></div><button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar"><X /></button></div>
          <div className="dialog-body">
            <div className="form-group"><label>Email</label><input type="email" required autoFocus value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
            <div className="flex gap-4">
              <div className="form-group flex-1"><label>Nombre</label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div className="form-group flex-1"><label>Origen</label><input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })} placeholder="manual, diagnóstico, FACTURAS…" /></div>
            </div>
            <label className="flex items-start gap-2 text-sm" style={{ cursor: "pointer", fontWeight: 400 }}>
              <input type="checkbox" checked={f.consent} onChange={(e) => setF({ ...f, consent: e.target.checked })} style={{ width: 17, height: 17, marginTop: 2, appearance: "auto", accentColor: "var(--ink)", flex: "none" }} />
              <span>Nos ha dado su permiso expreso para enviársela (por escrito o en una reunión). <span className="text-secondary">Si no lo marcas, le llega un correo para confirmar.</span></span>
            </label>
          </div>
          <div className="dialog-foot"><span /><button type="submit" className="btn-primary" disabled={busy}>{busy ? "Un momento…" : f.consent ? "Añadir como activo" : "Enviar invitación"}</button></div>
        </form>
      </div>
    </Portal>
  );
}

// ===================== CAPTAR =====================
function Capture({ origins }: { origins: string[] }) {
  const [copied, setCopied] = useState("");
  const base = typeof window !== "undefined" ? window.location.origin : "https://aldiasmart.pages.dev";
  const copy = (k: string, v: string) => { navigator.clipboard.writeText(v).then(() => { setCopied(k); setTimeout(() => setCopied(""), 1800); }); };
  const links = [
    { k: "web", label: "Enlace general", v: `${base}/n` },
    { k: "bio", label: "Bio de TikTok / Instagram", v: `${base}/n?src=bio` },
    { k: "li", label: "LinkedIn", v: `${base}/n?src=linkedin` },
    { k: "kw", label: "Palabra clave (cambia FACTURAS)", v: `${base}/n?src=FACTURAS` },
  ];
  const embed = `<form action="${base}/api/newsletter/subscribe" method="post">
  <input type="email" name="email" required placeholder="tu@empresa.com">
  <input type="text" name="name" placeholder="Tu nombre (opcional)">
  <input type="hidden" name="source" value="web">
  <input type="text" name="website" tabindex="-1" autocomplete="off" style="position:absolute;left:-9999px">
  <label><input type="checkbox" required> Acepto recibir la newsletter ALDIA Intelligence. Puedo darme de baja en cualquier momento.</label>
  <button type="submit">Quiero recibirla</button>
</form>`;
  const Btn = ({ k, v }: { k: string; v: string }) => <button className="btn-secondary text-xs" onClick={() => copy(k, v)}>{copied === k ? <><Check style={{ width: 14, height: 14 }} /> Copiado</> : <><Copy style={{ width: 14, height: 14 }} /> Copiar</>}</button>;
  return (
    <div className="grid-2-1" style={{ alignItems: "start" }}>
      <div className="card" style={{ padding: "1.25rem" }}>
        <b>Enlaces de alta</b>
        <p className="text-xs text-secondary" style={{ margin: "4px 0 12px" }}>Con <code>?src=</code> sabremos de dónde viene cada suscriptor (sale en «De dónde vienen»). Para un reel con «Comenta PALABRA», mandad en el DM el enlace con su palabra.</p>
        {links.map((l) => (
          <div key={l.k} className="flex items-center justify-between gap-3" style={{ padding: "0.625rem 0", borderTop: "1px solid var(--border-color)" }}>
            <div style={{ minWidth: 0 }}><div className="text-sm" style={{ fontWeight: 600 }}>{l.label}</div><div className="text-xs text-secondary" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.v}</div></div>
            <div className="flex gap-2"><a className="btn-ghost text-xs" href={l.v} target="_blank" rel="noreferrer">Abrir</a><Btn k={l.k} v={l.v} /></div>
          </div>
        ))}
      </div>
      <div className="card" style={{ padding: "1.25rem" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}><b>Formulario para aldiaproject.es</b><Btn k="embed" v={embed} /></div>
        <p className="text-xs text-secondary" style={{ marginBottom: 10 }}>HTML sencillo que funciona sin JavaScript: al enviarlo lleva a la página de «Revisa tu correo». {origins.length ? `Webs permitidas: ${origins.join(", ")}.` : <>Si se envía con JavaScript desde otra web, añadid esa web a <code>NEWSLETTER_ORIGINS</code>.</>}</p>
        <pre style={{ fontSize: 11, lineHeight: 1.5, background: "var(--bg-secondary)", padding: 12, borderRadius: 10, overflow: "auto", whiteSpace: "pre-wrap" }}>{embed}</pre>
      </div>
    </div>
  );
}
