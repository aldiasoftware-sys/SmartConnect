"use client";

import { useEffect, useState } from "react";
import { Plus, X, Trash2, HardDrive, Target, Euro, Repeat, Trophy } from "lucide-react";
import { OFFER_STATUSES, OPEN_OFFER, Offer, TIERS, euros, patterns, pct, shortDate, today } from "@/lib/social";
import { deleteRow, listRows, saveRow, tableMode } from "@/lib/store";
import Portal from "@/components/Portal";

const blank = (): Offer => ({ client: "", tier: "diagnostico", status: "reunion", amount: 0, monthly: 0 });
const REACHED_DIAGNOSTIC = ["diagnostico", "propuesta", "negociacion", "ganada"];

export default function OfertasPage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [local, setLocal] = useState(false);
  const [editing, setEditing] = useState<Offer | null>(null);

  async function load() {
    setLocal((await tableMode("offers")) === "local");
    setOffers(await listRows<Offer>("offers", "created_at"));
  }
  useEffect(() => { load(); }, []);

  async function save(o: Offer) { await saveRow<Offer>("offers", { ...o, amount: Number(o.amount) || 0, monthly: Number(o.monthly) || 0 }); setEditing(null); load(); }

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
        <div className="card kpi"><div className="kpi-label">Diagnósticos hechos <Target /></div><div className="kpi-value">{diagnostics}</div></div>
        <div className="card kpi"><div className="kpi-label">En juego <Euro /></div><div className="kpi-value">{euros(open.reduce((s, o) => s + Number(o.amount || 0), 0))}</div><div className="kpi-sub">{open.length} abiertas · {euros(open.reduce((s, o) => s + Number(o.monthly || 0), 0))}/mes en mantenimiento</div></div>
        <div className="card kpi"><div className="kpi-label">Mantenimiento ganado <Repeat /></div><div className="kpi-value">{euros(won.reduce((s, o) => s + Number(o.monthly || 0), 0))}</div><div className="kpi-sub">al mes · {won.filter((o) => Number(o.monthly) > 0).length} clientes</div></div>
        <div className="card kpi"><div className="kpi-label">Tasa de cierre <Trophy /></div><div className="kpi-value">{won.length + lost.length ? `${pct(won.length, won.length + lost.length)}%` : "—"}</div><div className="kpi-sub">{won.length} ganadas · {lost.length} perdidas</div></div>
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
