"use client";

import { useEffect, useState } from "react";
import { Plus, X, Trash2, HardDrive, Target, Euro, Repeat, Trophy, Boxes } from "lucide-react";
import { DIAGNOSTICS_TO_VALIDATE, OFFER_STATUSES, OPEN_OFFER, Offer, SAAS_REPEAT, SAAS_STEPS, TIERS, euros, patterns, pct, shortDate, today } from "@/lib/social";
import { deleteRow, getSetting, listRows, saveRow, setSetting, tableMode } from "@/lib/store";
import Portal from "@/components/Portal";

const blank = (): Offer => ({ client: "", tier: "diagnostico", status: "reunion", amount: 0, monthly: 0 });
const REACHED_DIAGNOSTIC = ["diagnostico", "propuesta", "negociacion", "ganada"];
type Saas = { pattern: string; step: number };

export default function OfertasPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [local, setLocal] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [saas, setSaas] = useState<Saas>({ pattern: "", step: 0 });

  async function load() {
    setLocal((await tableMode("offers")) === "local");
    setOffers(await listRows<Offer>("offers", "created_at"));
    setSaas(await getSetting<Saas>("saas_candidate", { pattern: "", step: 0 }));
  }
  useEffect(() => { load(); }, []);

  async function save(o: Offer) { await saveRow<Offer>("offers", { ...o, amount: Number(o.amount) || 0, monthly: Number(o.monthly) || 0 }); setEditing(null); load(); }
  async function saveSaas(next: Saas) { setSaas(next); await setSetting("saas_candidate", next); }

  const diagnostics = offers.filter((o) => REACHED_DIAGNOSTIC.includes(o.status)).length;
  const open = offers.filter(OPEN_OFFER);
  const won = offers.filter((o) => o.status === "ganada");
  const lost = offers.filter((o) => o.status === "perdida");
  const pats = patterns(offers);
  const t = today();

  return (
    <div className="page-wrapper" style={{ maxWidth: 1600 }}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Objetivo 2 · Servicios</div>
          <h2 className="page-title">Ofertas</h2>
          <p className="page-subtitle">Propuestas y presupuestos. Cada escalón abre el siguiente; empezar siempre por el problema del cliente, nunca por la herramienta.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing(blank())}><Plus style={{ width: 17, height: 17 }} /> Nueva oferta</button>
      </div>

      {local && <div className="banner"><HardDrive /><div><b>Las ofertas se están guardando solo en este navegador.</b> Ejecuta <code>redes_setup.sql</code> en Supabase para compartirlas; lo que haya aquí se sube solo.</div></div>}

      <div className="grid-4" style={{ marginBottom: "1.25rem" }}>
        <div className="card kpi">
          <div className="kpi-label">Diagnósticos hechos <Target /></div>
          <div className="kpi-value">{diagnostics}<span style={{ fontSize: "1.125rem", color: "var(--text-muted)" }}>/{DIAGNOSTICS_TO_VALIDATE}</span></div>
          <div className="kpi-sub">{diagnostics >= DIAGNOSTICS_TO_VALIDATE ? "Toca revisar los precios" : "Con 10 se validan los precios"}</div>
          <div style={{ height: 6, background: "var(--bg-surface)", borderRadius: 99, marginTop: 12, overflow: "hidden" }}><div style={{ width: `${Math.min(100, pct(diagnostics, DIAGNOSTICS_TO_VALIDATE))}%`, height: "100%", background: "var(--ink)" }} /></div>
        </div>
        <div className="card kpi"><div className="kpi-label">En juego <Euro /></div><div className="kpi-value">{euros(open.reduce((s, o) => s + Number(o.amount || 0), 0))}</div><div className="kpi-sub">{open.length} abiertas · {euros(open.reduce((s, o) => s + Number(o.monthly || 0), 0))}/mes en mantenimiento</div></div>
        <div className="card kpi"><div className="kpi-label">Mantenimiento ganado <Repeat /></div><div className="kpi-value">{euros(won.reduce((s, o) => s + Number(o.monthly || 0), 0))}</div><div className="kpi-sub">al mes · {won.filter((o) => Number(o.monthly) > 0).length} clientes</div></div>
        <div className="card kpi"><div className="kpi-label">Tasa de cierre <Trophy /></div><div className="kpi-value">{won.length + lost.length ? `${pct(won.length, won.length + lost.length)}%` : "—"}</div><div className="kpi-sub">{won.length} ganadas · {lost.length} perdidas</div></div>
      </div>

      <div className="grid-3" style={{ marginBottom: "1.25rem" }}>
        {Object.entries(TIERS).map(([k, tier], i) => {
          const n = offers.filter((o) => o.tier === k);
          return (
            <div key={k} className={`card ${i === 0 ? "dark-card" : ""}`}>
              <div className="eyebrow">0{i + 1} · {tier.sub}</div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em", marginBottom: 6 }}>{tier.label}</h3>
              <p className="section-sub" style={{ marginBottom: "0.875rem" }}>{tier.price}</p>
              <div className="flex justify-between items-center" style={{ fontSize: "0.8125rem" }}>
                <span style={{ color: i === 0 ? "#9a9ea6" : "var(--text-secondary)" }}>Siguiente: {tier.next}</span>
                <b>{n.filter(OPEN_OFFER).length} abiertas · {n.filter((o) => o.status === "ganada").length} ganadas</b>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pipe" style={{ marginBottom: "1.5rem" }}>
        {OFFER_STATUSES.map((s) => {
          const col = offers.filter((o) => o.status === s.id);
          return (
            <div key={s.id} className="pipe-col">
              <div className="column-header" style={{ margin: "0.125rem 0.25rem 0.375rem" }}><span className="st-dot" style={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600 }}><i style={{ background: s.color }} />{s.label}</span><span className="count-badge">{col.length}</span></div>
              {col.map((o) => (
                <button key={o.id} className="post-card" style={{ borderLeftColor: s.color, padding: "0.75rem" }} onClick={() => setEditing(o)}>
                  <div className="pc-top"><span>{TIERS[o.tier]?.label}</span>{o.next_date && <span style={{ color: o.next_date < t && OPEN_OFFER(o) ? "var(--bad)" : undefined }}>{shortDate(o.next_date)}</span>}</div>
                  <div className="pc-title" style={{ fontSize: "0.9375rem" }}>{o.client}</div>
                  {o.problem && <div className="text-xs text-secondary" style={{ marginTop: 4, lineHeight: 1.4 }}>{o.problem}</div>}
                  <div className="flex justify-between items-center" style={{ marginTop: 8, gap: 6 }}>
                    <b className="text-sm">{Number(o.amount) ? euros(Number(o.amount)) : ""}{Number(o.monthly) ? `${Number(o.amount) ? " + " : ""}${euros(Number(o.monthly))}/mes` : ""}</b>
                    {o.pattern && <span className="chip" style={{ fontSize: 10, padding: "1px 7px" }}>{o.pattern}</span>}
                  </div>
                  {o.next_step && OPEN_OFFER(o) && <div className="text-xs text-muted" style={{ marginTop: 6 }}>→ {o.next_step}</div>}
                </button>
              ))}
              <button className="add-slot" onClick={() => setEditing({ ...blank(), status: s.id })}>+ Añadir</button>
            </div>
          );
        })}
      </div>

      <div className="grid-2-1" style={{ marginBottom: "1.25rem" }}>
        <div className="card">
          <div className="eyebrow">Objetivo 3 · SaaS</div>
          <h3 className="section-title flex items-center gap-2" style={{ marginBottom: 4 }}><Boxes style={{ width: 17, height: 17 }} /> Del servicio repetido al producto</h3>
          <p className="section-sub" style={{ marginBottom: "1rem" }}>Etiqueta el problema de cada oferta («patrón»). Cuando el mismo se repite en {SAAS_REPEAT} o más empresas, es candidato a SaaS.</p>
          {pats.length === 0 ? <div className="empty" style={{ padding: "1.25rem" }}>Aún no hay patrones: rellena «Patrón» al crear una oferta.</div> : pats.slice(0, 6).map((p) => (
            <div key={p.pattern} className="flex items-center gap-3" style={{ padding: "0.375rem 0" }}>
              <span className="text-sm font-semibold" style={{ width: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.pattern}</span>
              <div className="target" style={{ flex: 1 }}><div className="bar">{Array.from({ length: Math.max(SAAS_REPEAT, p.clients) }, (_, i) => <i key={i} className={i < p.clients ? "on" : ""} />)}</div></div>
              <span className={`chip ${p.clients >= SAAS_REPEAT ? "chip-ok" : ""}`} style={{ minWidth: 104, justifyContent: "center" }}>{p.clients >= SAAS_REPEAT ? "Candidato" : `${p.clients} de ${SAAS_REPEAT} empresas`}</span>
              <button className="btn-secondary" style={{ padding: "0.35rem 0.6rem", fontSize: "0.75rem" }} onClick={() => saveSaas({ pattern: p.pattern, step: Math.max(saas.pattern === p.pattern ? saas.step : 0, p.clients >= SAAS_REPEAT ? 1 : 0) })} disabled={saas.pattern === p.pattern}>{saas.pattern === p.pattern ? "Elegido" : "Elegir"}</button>
            </div>
          ))}
          {saas.pattern && (
            <div style={{ marginTop: "1.25rem" }}>
              <div className="flex justify-between items-center" style={{ marginBottom: "0.625rem" }}>
                <span className="text-sm">Candidato: <b>{saas.pattern}</b></span>
                <button className="btn-secondary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }} onClick={() => saveSaas({ pattern: "", step: 0 })}>Quitar</button>
              </div>
              <div className="steps">
                {SAAS_STEPS.map((s, i) => (
                  <button key={s.label} className={i < saas.step ? "done" : i === saas.step ? "cur" : ""} onClick={() => saveSaas({ ...saas, step: i < saas.step ? i : i + 1 })} title="Pulsa para marcar hasta aquí">
                    <small>0{i + 1}</small><b>{s.label}</b><small>{s.desc}</small>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-3">
          <div className="quote"><div className="eyebrow">Límite de foco</div><p>Un único candidato a la vez. Si no se valida, se queda como servicio productizado y sigue generando ingresos.</p></div>
          <div className="quote"><div className="eyebrow">Al instante</div><p>Responder a los clientes en el momento.</p></div>
          <div className="quote"><div className="eyebrow">Seguimiento</div><p>Contarles muy a menudo cómo va su desarrollo.</p></div>
          <div className="quote"><div className="eyebrow">Profesionalidad</div><p>Documentos, propuestas y presupuestos bien presentados.</p></div>
        </div>
      </div>

      {editing && (
        <Portal>
          <div className="dialog-overlay" onClick={() => setEditing(null)}>
            <form className="dialog" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (editing.client.trim()) save(editing); }}>
              <div className="dialog-head">
                <div><div className="eyebrow">{TIERS[editing.tier]?.label}</div><h3 style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em" }}>{editing.id ? editing.client : "Nueva oferta"}</h3></div>
                <button type="button" className="icon-btn" onClick={() => setEditing(null)} aria-label="Cerrar"><X /></button>
              </div>
              <div className="dialog-body">
                <div className="form-group"><label>Cliente</label><input autoFocus required value={editing.client} onChange={(e) => setEditing({ ...editing, client: e.target.value })} /></div>
                <div className="flex gap-4">
                  <div className="form-group flex-1"><label>Escalón</label>
                    <select value={editing.tier} onChange={(e) => setEditing({ ...editing, tier: e.target.value })}>{Object.entries(TIERS).map(([k, v]) => <option key={k} value={k}>{v.label} · {v.sub}</option>)}</select></div>
                  <div className="form-group flex-1"><label>Estado</label>
                    <select value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>{OFFER_STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>
                </div>
                <div className="form-group"><label>El problema del cliente</label><textarea rows={2} value={editing.problem || ""} onChange={(e) => setEditing({ ...editing, problem: e.target.value })} placeholder="Qué le cuesta tiempo o dinero, con sus palabras" /></div>
                <div className="flex gap-4">
                  <div className="form-group flex-1"><label>Patrón (para detectar SaaS)</label><input list="pats" value={editing.pattern || ""} onChange={(e) => setEditing({ ...editing, pattern: e.target.value })} placeholder="p. ej. Facturas a mano" />
                    <datalist id="pats">{pats.map((p) => <option key={p.pattern} value={p.pattern} />)}</datalist></div>
                  <div className="form-group" style={{ width: 130 }}><label>Pago único (€)</label><input type="number" min={0} value={editing.amount || ""} onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })} /></div>
                  <div className="form-group" style={{ width: 130 }}><label>€/mes</label><input type="number" min={0} value={editing.monthly || ""} onChange={(e) => setEditing({ ...editing, monthly: Number(e.target.value) })} placeholder="150–500" /></div>
                </div>
                <div className="flex gap-4">
                  <div className="form-group flex-1"><label>Siguiente paso</label><input value={editing.next_step || ""} onChange={(e) => setEditing({ ...editing, next_step: e.target.value })} placeholder={TIERS[editing.tier]?.next} /></div>
                  <div className="form-group" style={{ width: 180 }}><label>Fecha</label><input type="date" value={editing.next_date || ""} onChange={(e) => setEditing({ ...editing, next_date: e.target.value || null })} /></div>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}><label>Notas</label><textarea rows={3} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
              </div>
              <div className="dialog-foot">
                {editing.id ? <button type="button" className="btn-danger" onClick={async () => { await deleteRow("offers", editing.id!); setEditing(null); load(); }}><Trash2 style={{ width: 15, height: 15 }} /> Borrar</button> : <span />}
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </Portal>
      )}
    </div>
  );
}
