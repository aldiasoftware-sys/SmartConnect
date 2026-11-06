"use client";

import { useEffect, useState } from "react";
import { Plus, X, Trash2, Search, HardDrive, CheckCircle2, ArrowUpRight, Users, ChevronLeft, ChevronRight, Briefcase } from "lucide-react";
import { useSocial } from "@/lib/SocialContext";
import { ORIGINS, OWN_CHANNELS, PERSON_KINDS, Person, PersonKind, kindOf, SKOOL_AT, fmt, hoursWaiting, latestFollowers, pct, shortDate, today, weekStart } from "@/lib/social";
import { deleteRow, listRows, saveRow, tableMode } from "@/lib/store";
import Portal from "@/components/Portal";
import AccountIcon from "@/components/AccountIcon";

const blank = (): Person => ({ name: "", kind: "lead", stage: 2, origin: "LinkedIn", pending_reply: true, pending_since: new Date().toISOString() });

function waitLabel(h: number) { return h < 1 ? "hace un momento" : h < 24 ? `hace ${Math.floor(h)} h` : `hace ${Math.floor(h / 24)} d ${Math.floor(h % 24)} h`; }

export default function ComunidadPage() {
  const { snapshots } = useSocial();
  const [people, setPeople] = useState<Person[]>([]);
  const [local, setLocal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Person | null>(null);
  const [kind, setKind] = useState<"todos" | PersonKind>("todos");
  const [q, setQ] = useState("");

  async function load() {
    setLocal((await tableMode("community_people")) === "local");
    setPeople(await listRows<Person>("community_people", "created_at")); setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function save(p: Person) {
    const next = { ...p, pending_since: p.pending_reply ? p.pending_since || new Date().toISOString() : null };
    await saveRow<Person>("community_people", next); setEditing(null); load();
  }
  const replied = (p: Person) => save({ ...p, pending_reply: false, last_contact: today() });

  const pending = people.filter((p) => p.pending_reply).sort((a, b) => hoursWaiting(b) - hoursWaiting(a));
  const leads = people.filter((p) => p.kind === "lead").length;
  const contacts = people.filter((p) => p.kind === "contacto").length;
  const clients = people.filter((p) => p.kind === "cliente").length;
  // pasar de Lead a Contacto a Cliente (o volver atrás) sin abrir la ficha
  const move = (p: Person, dir: 1 | -1) => {
    const i = PERSON_KINDS.findIndex((k) => k.id === p.kind); const next = PERSON_KINDS[Math.min(2, Math.max(0, i + dir))].id;
    if (next !== p.kind) save({ ...p, kind: next, last_contact: dir > 0 ? today() : p.last_contact });
  };
  const ws = weekStart();
  const newThisWeek = people.filter((p) => (p.created_at || "").slice(0, 10) >= ws).length;
  const responders = people.length;   // cada persona apuntada ha interactuado con nosotros
  const shown = people.filter((p) => (kind === "todos" || p.kind === kind)
    && (!q || `${p.name} ${p.company || ""} ${p.keyword || ""} ${p.pain || ""}`.toLowerCase().includes(q.toLowerCase())))
    .sort((a, b) => Number(b.pending_reply) - Number(a.pending_reply) || (b.created_at || "").localeCompare(a.created_at || ""));

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <div className="eyebrow">Objetivo 1 · Comunidad</div>
          <h2 className="page-title">Comunidad</h2>
          <p className="page-subtitle">De seguidores a comunidad propia. La comunidad no es un objetivo aparte: es el canal comercial.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing(blank())}><Plus style={{ width: 17, height: 17 }} /> Nueva persona</button>
      </div>

      {local && <div className="banner"><HardDrive /><div><b>La comunidad se está guardando solo en este navegador.</b> Ejecuta <code>redes_setup.sql</code> en Supabase para compartirla; lo que haya aquí se sube solo.</div></div>}

      <div className="grid-3" style={{ marginBottom: "1.25rem" }}>
        <div className="card kpi"><div className="kpi-label">Leads <Users /></div><div className="kpi-value">{leads}</div><div className="kpi-sub">{newThisWeek} nuevos esta semana</div></div>
        <div className="card kpi"><div className="kpi-label">Contactos <CheckCircle2 /></div><div className="kpi-value">{contacts}</div><div className="kpi-sub">Ya hemos hablado; trato de tú a tú</div></div>
        <div className="card kpi"><div className="kpi-label">Clientes <Briefcase /></div><div className="kpi-value">{clients}</div><div className="kpi-sub">{people.length ? `${Math.round((clients / people.length) * 100)}% de la comunidad` : "Ya trabajan con nosotros"}</div></div>
      </div>

      <div className="grid-3" style={{ marginBottom: "1.25rem" }}>
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: 4 }}>Responder en 24 h</h3>
          <p className="section-sub" style={{ marginBottom: "0.875rem" }}>Al principio, la comunidad se construye conversación a conversación.</p>
          {pending.length === 0 ? <div className="empty" style={{ padding: "1.25rem" }}>Todo respondido.</div> : pending.slice(0, 6).map((p) => {
            const h = hoursWaiting(p);
            return (
              <div key={p.id} className="flex items-center justify-between" style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border-color)", gap: 8 }}>
                <div style={{ minWidth: 0 }}><b style={{ fontSize: "0.8125rem", cursor: "pointer" }} onClick={() => setEditing(p)}>{p.name}</b>
                  <div className="text-xs" style={{ color: h > 24 ? "var(--bad)" : "var(--text-muted)", fontWeight: h > 24 ? 700 : 500 }}>{p.origin} · {waitLabel(h)}</div></div>
                <button className="btn-secondary" style={{ padding: "0.35rem 0.7rem", fontSize: "0.75rem" }} onClick={() => replied(p)}>Respondido</button>
              </div>
            );
          })}
        </div>
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: 4 }}>Dónde vive</h3>
          <p className="section-sub" style={{ marginBottom: "0.875rem" }}>Ahora: canal de avisos. Con {SKOOL_AT}–50 personas que respondan, abrir Skool gratis por invitación.</p>
          <div className="flex justify-between items-end" style={{ marginBottom: 6 }}>
            <span className="text-sm font-semibold">Personas que responden</span><span className="font-bold">{responders}/{SKOOL_AT}</span>
          </div>
          <div style={{ height: 8, background: "var(--bg-surface)", borderRadius: 99, overflow: "hidden", marginBottom: "1rem" }}>
            <div style={{ width: `${Math.min(100, pct(responders, SKOOL_AT))}%`, height: "100%", background: responders >= SKOOL_AT ? "var(--ok)" : "var(--ink)" }} />
          </div>
          {responders >= SKOOL_AT && <p className="chip chip-ok" style={{ marginBottom: "0.75rem" }}>Ya toca abrir Skool</p>}
          {PERSON_KINDS.map((k) => (
            <div key={k.id} className="flex items-center justify-between text-sm" style={{ padding: "0.375rem 0" }}>
              <span className={`kind-chip k-${k.id}`}>{k.plural}</span><b>{people.filter((p) => p.kind === k.id).length}</b>
            </div>
          ))}
        </div>
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: 4 }}>De dónde viene</h3>
          <p className="section-sub" style={{ marginBottom: "0.875rem" }}>Orden esperado: LinkedIn, TikTok, web y boca a boca.</p>
          {ORIGINS.map((o) => { const n = people.filter((p) => p.origin === o).length; return (
            <div key={o} style={{ marginBottom: "0.625rem" }}>
              <div className="flex justify-between text-sm" style={{ marginBottom: 4 }}><span className="font-semibold">{o}</span><span className="text-muted font-bold">{n}</span></div>
              <div style={{ height: 6, background: "var(--bg-surface)", borderRadius: 99, overflow: "hidden" }}><div style={{ width: `${pct(n, people.length || 1)}%`, height: "100%", background: "var(--ink)" }} /></div>
            </div>
          ); })}
        </div>
      </div>

      <div className="table-container">
        <div className="flex justify-between items-center" style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-color)", gap: "1rem", flexWrap: "wrap" }}>
          <div className="seg">
            <button className={kind === "todos" ? "on" : ""} onClick={() => setKind("todos")}>Todos</button>
            {PERSON_KINDS.map((k) => <button key={k.id} className={kind === k.id ? "on" : ""} onClick={() => setKind(k.id)}>{k.plural}</button>)}
          </div>
          <div style={{ position: "relative", width: 280 }}>
            <Search style={{ position: "absolute", left: 12, top: 11, width: 16, height: 16, color: "var(--text-muted)" }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar nombre, empresa, palabra, dolor…" style={{ paddingLeft: 36 }} />
          </div>
        </div>
        <table className="data-table">
          <thead><tr><th>Persona</th><th>Tipo</th><th>Origen</th><th>Qué le duele</th><th>Último contacto</th><th /></tr></thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id} onClick={() => setEditing(p)} style={{ cursor: "pointer" }}>
                <td><b>{p.name}</b>{p.company && <div className="text-xs text-muted">{p.company}</div>}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <div className="kind-move">
                    <button disabled={p.kind === "lead"} onClick={() => move(p, -1)} aria-label="Volver atrás"><ChevronLeft /></button>
                    <span className={`kind-chip k-${p.kind}`}>{kindOf(p.kind).label}</span>
                    <button disabled={p.kind === "cliente"} onClick={() => move(p, 1)} aria-label="Pasar al siguiente"><ChevronRight /></button>
                  </div>
                </td>
                <td className="text-sm">{p.origin || "—"}{p.keyword && <span className="chip" style={{ marginLeft: 6, fontSize: 10 }}>{p.keyword}</span>}</td>
                <td className="text-sm text-secondary" style={{ maxWidth: 260, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.pain || "—"}</td>
                <td className="text-sm">{p.last_contact ? shortDate(p.last_contact) : "—"}</td>
                <td style={{ textAlign: "right" }}>{p.pending_reply && <span className="chip chip-bad">Sin responder</span>}</td>
              </tr>
            ))}
            {!loading && shown.length === 0 && <tr><td colSpan={6}><div className="empty">Nadie por aquí todavía. Cada comentario, like o repost puede ser un futuro cliente o alumno: apúntalo.</div></td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Portal>
          <div className="dialog-overlay" onClick={() => setEditing(null)}>
            <form className="dialog" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (editing.name.trim()) save(editing); }}>
              <div className="dialog-head">
                <div><div className="eyebrow">{kindOf(editing.kind).label}</div><h3 style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em" }}>{editing.id ? editing.name : "Nueva persona"}</h3></div>
                <button type="button" className="icon-btn" onClick={() => setEditing(null)} aria-label="Cerrar"><X /></button>
              </div>
              <div className="dialog-body">
                <div className="form-group"><label>Nombre</label><input autoFocus required value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                <div className="form-group"><label>Tipo</label>
                  <div className="kind-track">
                    {PERSON_KINDS.map((k, i) => (
                      <button type="button" key={k.id} className={`${editing.kind === k.id ? "on" : ""} ${PERSON_KINDS.findIndex((x) => x.id === editing.kind) > i ? "past" : ""}`}
                        onClick={() => setEditing({ ...editing, kind: k.id })}><span>0{i + 1}</span>{k.label}</button>
                    ))}
                  </div>
                  <p className="text-xs text-muted" style={{ marginTop: 8 }}>{kindOf(editing.kind).desc}</p>
                </div>
                <div className="flex gap-4">
                  <div className="form-group flex-1"><label>Origen</label>
                    <div className="pick">{ORIGINS.map((o) => <button type="button" key={o} className={editing.origin === o ? "on" : ""} onClick={() => setEditing({ ...editing, origin: o })}>{o}</button>)}</div></div>
                  <div className="form-group" style={{ width: 180 }}><label>Palabra clave</label><input value={editing.keyword || ""} onChange={(e) => setEditing({ ...editing, keyword: e.target.value.toUpperCase() })} /></div>
                </div>
                <div className="flex gap-4">
                  <div className="form-group flex-1"><label>Empresa</label><input value={editing.company || ""} onChange={(e) => setEditing({ ...editing, company: e.target.value })} /></div>
                  <div className="form-group flex-1"><label>Email</label><input type="email" value={editing.email || ""} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
                </div>
                <div className="form-group"><label>Qué le duele</label><input value={editing.pain || ""} onChange={(e) => setEditing({ ...editing, pain: e.target.value })} placeholder="El problema, con sus palabras" /></div>
                <div className="form-group" style={{ maxWidth: 240 }}><label>Último contacto</label><input type="date" value={editing.last_contact || ""} onChange={(e) => setEditing({ ...editing, last_contact: e.target.value || null })} /></div>
                <label className="flex items-center gap-2" style={{ cursor: "pointer", fontWeight: 500 }}>
                  <input type="checkbox" checked={editing.pending_reply} onChange={(e) => setEditing({ ...editing, pending_reply: e.target.checked, pending_since: e.target.checked ? new Date().toISOString() : null })} style={{ width: 17, height: 17, appearance: "auto", accentColor: "var(--ink)" }} />
                  Está esperando respuesta nuestra
                </label>
              </div>
              <div className="dialog-foot">
                {editing.id ? <button type="button" className="btn-danger" onClick={async () => { await deleteRow("community_people", editing.id!); setEditing(null); load(); }}><Trash2 style={{ width: 15, height: 15 }} /> Borrar</button> : <span />}
                <div className="flex gap-2">
                  {editing.id && editing.kind !== "cliente" && (() => { const nx = PERSON_KINDS[PERSON_KINDS.findIndex((k) => k.id === editing.kind) + 1];
                    return <button type="button" className="btn-secondary" onClick={() => save({ ...editing, kind: nx.id, last_contact: today() })}>Pasar a {nx.label.toLowerCase()} <ChevronRight style={{ width: 15, height: 15 }} /></button>; })()}
                  <button type="submit" className="btn-primary">Guardar</button>
                </div>
              </div>
            </form>
          </div>
        </Portal>
      )}
    </div>
  );
}
