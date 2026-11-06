"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  RefreshCw, Plus, MoreHorizontal, X, Edit2, Trash2, Search,
  TrendingUp, Wallet, Users, Hourglass, PieChart,
} from "lucide-react";
import { useSales } from "@/lib/SalesContext";
import type { SaleRecord } from "@/lib/SalesContext";
import Portal from "@/components/Portal";

type Status = SaleRecord["status"];
type Filter = "todos" | Status;

const STATUS: Record<Status, { label: string; plural: string; tone: "ok" | "info" | "bad"; color: string }> = {
  pagado: { label: "Cobrado", plural: "Cobrados", tone: "ok", color: "var(--ok)" },
  proceso: { label: "En Proceso", plural: "En proceso", tone: "info", color: "var(--accent)" },
  cancelado: { label: "Cancelado", plural: "Cancelados", tone: "bad", color: "var(--bad)" },
};
const ORDER: Status[] = ["pagado", "proceso", "cancelado"];

/** Euros al estilo español: «3.000 €», «1.250,50 €». */
function eur(value: number): string {
  const n = Number.isFinite(value) ? value : 0;
  const [int, dec] = (Math.round(Math.abs(n) * 100) / 100).toFixed(2).split(".");
  const intS = int.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${n < 0 ? "−" : ""}${intS}${dec !== "00" ? "," + dec : ""} €`;
}
const num = (v: string | number | null | undefined) => Number(v || 0) || 0;
const initials = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "?";
const pct = (part: number, total: number) => (total > 0 ? (part / total) * 100 : 0);

export default function SalesPage() {
  const { sales, addSale, updateSale, deleteSale, refresh, loading } = useSales();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ client: string; status: "pagado" | "proceso" | "cancelado"; setup: string; monthly: string }>({ client: "", status: "proceso", setup: "", monthly: "" });
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú «⋯» al hacer clic fuera o con Escape
  useEffect(() => {
    if (!dropdownOpen) return;
    const click = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setDropdownOpen(null); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setDropdownOpen(null); };
    document.addEventListener("mousedown", click); document.addEventListener("keydown", key);
    return () => { document.removeEventListener("mousedown", click); document.removeEventListener("keydown", key); };
  }, [dropdownOpen]);

  // Escape cierra el diálogo
  useEffect(() => {
    if (!isModalOpen) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [isModalOpen]);

  const handleSave = () => {
    if (!form.client) return;

    if (editingId !== null) {
      updateSale(editingId, { ...form, status: form.status as any });
    } else {
      addSale({ ...form, status: form.status as any });
    }

    closeModal();
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ client: "", status: "proceso", setup: "", monthly: "" });
    setIsModalOpen(true);
  };

  const openEdit = (sale: SaleRecord) => {
    setEditingId(sale.id);
    setForm({
      client: sale.client,
      status: sale.status,
      setup: sale.setup,
      monthly: sale.monthly
    });
    setIsModalOpen(true);
    setDropdownOpen(null);
  };

  const closeModal = () => {
    setEditingId(null);
    setForm({ client: "", status: "proceso", setup: "", monthly: "" });
    setIsModalOpen(false);
  };

  const handleDelete = (id: string): boolean => {
    const ok = confirm("¿Estás seguro de que quieres eliminar este cliente?");
    if (ok) deleteSale(id);
    setDropdownOpen(null);
    return ok;
  };

  const paid = sales.filter((s) => s.status === "pagado");
  const totalMRR = paid.reduce((sum, s) => sum + num(s.monthly), 0);
  const totalSetup = paid.reduce((sum, s) => sum + num(s.setup), 0);
  const inProgress = sales.filter((s) => s.status === "proceso");
  const pipelineMRR = inProgress.reduce((sum, s) => sum + num(s.monthly), 0);
  const pipelineSetup = inProgress.reduce((sum, s) => sum + num(s.setup), 0);

  const counts = useMemo(() => {
    const c: Record<Status, number> = { pagado: 0, proceso: 0, cancelado: 0 };
    sales.forEach((s) => { if (c[s.status] !== undefined) c[s.status]++; });
    return c;
  }, [sales]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sales.filter((s) =>
      (filter === "todos" || s.status === filter) &&
      (!q || s.client.toLowerCase().includes(q))
    );
  }, [sales, filter, query]);

  const visibleSetup = visible.reduce((sum, s) => sum + num(s.setup), 0);
  const visibleMRR = visible.reduce((sum, s) => sum + num(s.monthly), 0);

  const firstLoad = loading && sales.length === 0;
  const collected = totalSetup + totalMRR;

  return (
    <div className="page-wrapper">
      {/* Cabecera */}
      <div className="mx-head">
        <div>
          <div className="eyebrow">Ingresos y facturación</div>
          <h2>Sales <span className="mx-count">{sales.length} {sales.length === 1 ? "cliente" : "clientes"}</span></h2>
          <p>Control de ingresos y facturación de clientes AI.</p>
        </div>
        <div className="mx-head-actions">
          <button className="btn-secondary sl-refresh" onClick={() => refresh()} disabled={loading} aria-label="Actualizar">
            <RefreshCw className={loading ? "sl-spin" : ""} style={{ width: 16, height: 16 }} />
            <span className="sl-hide-sm">Actualizar</span>
          </button>
          <button className="btn-primary" onClick={openNew}>
            <Plus style={{ width: 18, height: 18 }} />
            Nuevo Cliente
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mx-stats">
        <div className="mx-stat hero">
          <div className="mx-stat-top">
            <span className="mx-stat-label">MRR activo</span>
            <span className="mx-ico"><TrendingUp /></span>
          </div>
          {firstLoad ? <div className="mx-skeleton sl-sk-val sl-sk-dark" /> : <div className="mx-stat-value">{eur(totalMRR)}</div>}
          <div className="mx-stat-sub">al mes · {eur(totalMRR * 12)} al año</div>
        </div>
        <div className="mx-stat">
          <div className="mx-stat-top">
            <span className="mx-stat-label">Setup cobrado</span>
            <span className="mx-ico ok"><Wallet /></span>
          </div>
          {firstLoad ? <div className="mx-skeleton sl-sk-val" /> : <div className="mx-stat-value">{eur(totalSetup)}</div>}
          <div className="mx-stat-sub">total cobrado</div>
        </div>
        <div className="mx-stat">
          <div className="mx-stat-top">
            <span className="mx-stat-label">Clientes activos</span>
            <span className="mx-ico ink"><Users /></span>
          </div>
          {firstLoad ? <div className="mx-skeleton sl-sk-val" /> : <div className="mx-stat-value">{counts.pagado}</div>}
          <div className="mx-stat-sub">de {sales.length} {sales.length === 1 ? "cliente" : "clientes"}</div>
        </div>
        <div className="mx-stat">
          <div className="mx-stat-top">
            <span className="mx-stat-label">En proceso</span>
            <span className="mx-ico warn"><Hourglass /></span>
          </div>
          {firstLoad ? <div className="mx-skeleton sl-sk-val" /> : <div className="mx-stat-value">{eur(pipelineMRR)}</div>}
          <div className="mx-stat-sub">
            MRR por cerrar · {counts.proceso} {counts.proceso === 1 ? "cliente" : "clientes"}
            {pipelineSetup > 0 && <> · {eur(pipelineSetup)} de setup</>}
          </div>
        </div>
      </div>

      {/* Reparto */}
      {sales.length > 0 && (
        <div className="sl-breakdown">
          <div className="sl-bd-block">
            <div className="sl-bd-head">
              <span className="sl-bd-title"><PieChart /> Clientes por estado</span>
              <span className="mx-meta">{sales.length} en total</span>
            </div>
            <div className="sl-bar" role="img" aria-label={ORDER.map((k) => `${STATUS[k].plural}: ${counts[k]}`).join(", ")}>
              {ORDER.map((k) => counts[k] > 0 && (
                <span key={k} style={{ width: `${pct(counts[k], sales.length)}%`, background: STATUS[k].color }} />
              ))}
            </div>
            <div className="sl-legend">
              {ORDER.map((k) => (
                <span key={k}><i style={{ background: STATUS[k].color }} />{STATUS[k].plural} <b>{counts[k]}</b></span>
              ))}
            </div>
          </div>
          <div className="sl-bd-block">
            <div className="sl-bd-head">
              <span className="sl-bd-title"><Wallet /> Cobrado: setup vs MRR mensual</span>
              <span className="mx-meta">{eur(collected)}</span>
            </div>
            <div className="sl-bar" role="img" aria-label={`Setup ${eur(totalSetup)}, MRR ${eur(totalMRR)}`}>
              {collected > 0 ? (
                <>
                  {totalSetup > 0 && <span style={{ width: `${pct(totalSetup, collected)}%`, background: "var(--ok)" }} />}
                  {totalMRR > 0 && <span style={{ width: `${pct(totalMRR, collected)}%`, background: "var(--navy-2)" }} />}
                </>
              ) : null}
            </div>
            <div className="sl-legend">
              <span><i style={{ background: "var(--ok)" }} />Setup <b>{eur(totalSetup)}</b> <em>{Math.round(pct(totalSetup, collected))}%</em></span>
              <span><i style={{ background: "var(--navy-2)" }} />MRR <b>{eur(totalMRR)}</b> <em>{Math.round(pct(totalMRR, collected))}%</em></span>
            </div>
          </div>
        </div>
      )}

      {/* Barra de filtros */}
      {sales.length > 0 && (
        <div className="mx-toolbar">
          <div className="mx-search">
            <Search />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar cliente…" aria-label="Buscar cliente" />
          </div>
          <div className="mx-pills sl-pills" role="tablist" aria-label="Filtrar por estado">
            <button role="tab" aria-selected={filter === "todos"} className={filter === "todos" ? "on" : ""} onClick={() => setFilter("todos")}>
              Todos <b>{sales.length}</b>
            </button>
            {ORDER.map((k) => (
              <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
                <i className="sl-dot" style={{ background: STATUS[k].color }} />{STATUS[k].plural} <b>{counts[k]}</b>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lista de clientes */}
      {firstLoad ? (
        <div className="mx-list">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="mx-row">
              <div className="mx-skeleton" style={{ width: 40, height: 40, borderRadius: 13 }} />
              <div className="mx-grow"><div className="mx-skeleton" style={{ height: 14, width: "40%" }} /></div>
              <div className="mx-skeleton" style={{ height: 14, width: 90 }} />
            </div>
          ))}
        </div>
      ) : sales.length === 0 ? (
        <div className="mx-empty">
          <span className="mx-ico"><TrendingUp /></span>
          <h3>Aún no hay clientes</h3>
          <p>Añade tu primer cliente con su setup y su cuota mensual para empezar a ver el MRR y lo cobrado.</p>
          <button className="btn-primary" onClick={openNew}><Plus style={{ width: 18, height: 18 }} /> Nuevo Cliente</button>
        </div>
      ) : (
        <div className="mx-list sl-list">
          <div className="sl-grid sl-thead">
            <span>Cliente</span>
            <span>Estado</span>
            <span className="sl-num">Setup</span>
            <span className="sl-num">MRR</span>
            <span />
          </div>

          {visible.length === 0 ? (
            <div className="sl-noresults">
              <Search style={{ width: 18, height: 18 }} />
              <span>Ningún cliente coincide con este filtro.</span>
              <button className="btn-secondary" onClick={() => { setFilter("todos"); setQuery(""); }}>Ver todos</button>
            </div>
          ) : visible.map((s) => {
            const st = STATUS[s.status] || STATUS.proceso;
            return (
              <div key={s.id} className={`mx-row sl-grid sl-row ${s.status === "cancelado" ? "is-off" : ""}`}>
                <div className="sl-client" onClick={() => openEdit(s)} role="button" tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter") openEdit(s); }}>
                  <span className="mx-avatar">{initials(s.client)}</span>
                  <div className="mx-grow">
                    <div className="mx-title mx-trunc">{s.client}</div>
                    <div className="sl-show-sm sl-mobile-pill"><span className={`mx-pill ${st.tone}`}><i />{st.label}</span></div>
                  </div>
                </div>
                <div className="sl-status">
                  <span className={`mx-pill ${st.tone}`}><i />{st.label}</span>
                </div>
                <div className="sl-num sl-amount">
                  <small className="sl-show-sm">Setup</small>
                  {eur(num(s.setup))}
                </div>
                <div className="sl-num sl-amount sl-mrr">
                  <small className="sl-show-sm">MRR</small>
                  {eur(num(s.monthly))}<span className="sl-per">/mes</span>
                </div>
                <div className="sl-menu" ref={dropdownOpen === s.id ? menuRef : undefined}>
                  <button className="mx-act" aria-label="Más opciones" aria-haspopup="menu" aria-expanded={dropdownOpen === s.id}
                    onClick={() => setDropdownOpen(dropdownOpen === s.id ? null : s.id)}>
                    <MoreHorizontal />
                  </button>
                  {dropdownOpen === s.id && (
                    <div className="card-menu-pop" role="menu">
                      <button role="menuitem" onClick={() => openEdit(s)}><Edit2 /> Editar</button>
                      <button role="menuitem" className="danger" onClick={() => handleDelete(s.id)}><Trash2 /> Eliminar</button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {visible.length > 0 && (
            <div className="sl-grid sl-tfoot">
              <span>{visible.length} {visible.length === 1 ? "cliente" : "clientes"}{filter !== "todos" || query ? " (filtrado)" : ""}</span>
              <span />
              <span className="sl-num">{eur(visibleSetup)}</span>
              <span className="sl-num">{eur(visibleMRR)}<span className="sl-per">/mes</span></span>
              <span />
            </div>
          )}
        </div>
      )}

      {/* Diálogo crear / editar */}
      {isModalOpen && (
        <Portal>
          <div className="dialog-overlay" onClick={closeModal}>
            <form className="dialog" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
              <div className="dialog-head">
                <div>
                  <div className="eyebrow">Sales</div>
                  <h3 style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em" }}>{editingId ? "Editar Cliente" : "Nuevo Cliente"}</h3>
                </div>
                <button type="button" className="icon-btn" onClick={closeModal} aria-label="Cerrar"><X /></button>
              </div>
              <div className="dialog-body">
                <div className="form-group">
                  <label>Nombre del Cliente</label>
                  <input autoFocus value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} placeholder="Ej: Acme Corp" />
                </div>
                <div className="form-group">
                  <label>Estado del Pago</label>
                  <div className="seg" style={{ flexWrap: "wrap" }}>
                    {ORDER.map((k) => (
                      <button type="button" key={k} className={form.status === k ? "on" : ""} onClick={() => setForm({ ...form, status: k })}>
                        <i style={{ width: 7, height: 7, borderRadius: 9, background: STATUS[k].color, display: "inline-block", marginRight: 6, verticalAlign: 1 }} />
                        {STATUS[k].label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="form-group flex-1">
                    <label>Setup (€)</label>
                    <input type="number" min="0" step="any" inputMode="decimal" value={form.setup} onChange={(e) => setForm({ ...form, setup: e.target.value })} placeholder="0" />
                  </div>
                  <div className="form-group flex-1">
                    <label>MRR Mensual (€)</label>
                    <input type="number" min="0" step="any" inputMode="decimal" value={form.monthly} onChange={(e) => setForm({ ...form, monthly: e.target.value })} placeholder="0" />
                  </div>
                </div>
                <div className="sl-preview">
                  <span>Setup <b>{eur(num(form.setup))}</b></span>
                  <span>MRR <b>{eur(num(form.monthly))}</b>/mes</span>
                  <span>Año <b>{eur(num(form.monthly) * 12)}</b></span>
                </div>
              </div>
              <div className="dialog-foot">
                {editingId ? (
                  <button type="button" className="btn-danger" onClick={() => { if (handleDelete(editingId)) closeModal(); }}>
                    <Trash2 style={{ width: 15, height: 15 }} /> Eliminar
                  </button>
                ) : <span />}
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={!form.client.trim()}>
                    {editingId ? "Actualizar Cliente" : "Guardar Cliente"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </Portal>
      )}

      <style jsx>{`
        .sl-refresh :global(.sl-spin) { animation: slSpin 0.9s linear infinite; }
        @keyframes slSpin { to { transform: rotate(360deg); } }
        .sl-refresh { display: inline-flex; align-items: center; gap: 8px; }

        .sl-sk-val { height: 34px; width: 60%; border-radius: 10px; }
        .sl-sk-dark { opacity: 0.18; }

        /* Reparto */
        .sl-breakdown {
          display: grid; grid-template-columns: 1fr 1fr; gap: 1.75rem;
          background: #fff; border: 1px solid var(--border-color); border-radius: 20px;
          box-shadow: var(--shadow-sm); padding: 1.125rem 1.25rem 1.25rem; margin-bottom: 1.5rem;
        }
        .sl-bd-head { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.75rem; }
        .sl-bd-title { display: inline-flex; align-items: center; gap: 8px; font-size: 0.8125rem; font-weight: 600; color: var(--ink); }
        .sl-bd-title :global(svg) { width: 15px; height: 15px; color: var(--text-muted); }
        .sl-bar { display: flex; gap: 3px; height: 10px; border-radius: 99px; overflow: hidden; background: var(--bg-surface); }
        .sl-bar span { height: 100%; border-radius: 99px; transition: width 0.5s cubic-bezier(0.2, 0.7, 0.2, 1); min-width: 6px; }
        .sl-legend { display: flex; flex-wrap: wrap; gap: 0.4rem 1.1rem; margin-top: 0.75rem; font-size: 0.8125rem; color: var(--text-secondary); }
        .sl-legend span { display: inline-flex; align-items: center; gap: 7px; }
        .sl-legend i { width: 8px; height: 8px; border-radius: 99px; display: inline-block; }
        .sl-legend b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }
        .sl-legend em { font-style: normal; color: var(--text-muted); font-variant-numeric: tabular-nums; }

        .sl-dot { width: 7px; height: 7px; border-radius: 99px; display: inline-block; }
        .sl-pills { overflow-x: auto; max-width: 100%; scrollbar-width: none; }
        .sl-pills::-webkit-scrollbar { display: none; }

        /* Lista */
        .sl-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 140px 130px 150px 36px;
          align-items: center; gap: 1rem;
        }
        .sl-thead, .sl-tfoot {
          padding: 0.7rem 1.25rem; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--text-muted);
        }
        .sl-thead { background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); }
        .sl-tfoot {
          border-top: 1px solid var(--border-color); background: var(--bg-secondary);
          font-size: 0.8125rem; letter-spacing: 0; text-transform: none; color: var(--text-secondary);
        }
        .sl-tfoot .sl-num { color: var(--ink); font-weight: 600; }
        .sl-list { overflow: visible; }
        .sl-thead { border-radius: 20px 20px 0 0; }
        .sl-tfoot { border-radius: 0 0 20px 20px; }
        .sl-mobile-pill { margin-top: 4px; }
        .sl-num { text-align: right; font-variant-numeric: tabular-nums; }
        .sl-row { display: grid; }
        .sl-client { display: flex; align-items: center; gap: 0.875rem; min-width: 0; cursor: pointer; outline: none; border-radius: 12px; }
        .sl-client:focus-visible { box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.18); }
        .sl-client:hover .mx-title { color: var(--accent); }
        .sl-amount { font-size: 0.9375rem; font-weight: 500; color: var(--text-secondary); white-space: nowrap; }
        .sl-mrr { color: var(--ink); font-weight: 600; }
        .sl-per { font-size: 0.75rem; font-weight: 500; color: var(--text-muted); margin-left: 2px; }
        .sl-amount small { display: none; }
        .sl-menu { position: relative; display: flex; justify-content: flex-end; }
        .sl-row.is-off .mx-avatar { background: var(--bg-surface); color: var(--text-muted); }
        .sl-row.is-off .sl-amount, .sl-row.is-off .mx-title { color: var(--text-muted); }
        .sl-show-sm { display: none; }

        .sl-noresults {
          display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 0.75rem;
          padding: 2.5rem 1.25rem; color: var(--text-secondary); font-size: 0.9rem;
        }

        .sl-preview {
          display: flex; flex-wrap: wrap; gap: 0.5rem 1.25rem; padding: 0.75rem 1rem; border-radius: 12px;
          background: var(--bg-secondary); font-size: 0.8125rem; color: var(--text-secondary);
        }
        .sl-preview b { color: var(--ink); font-weight: 600; font-variant-numeric: tabular-nums; }

        @media (max-width: 1100px) {
          .sl-grid { grid-template-columns: minmax(0, 1fr) 120px 110px 130px 36px; gap: 0.75rem; }
        }
        @media (max-width: 860px) {
          .sl-breakdown { grid-template-columns: 1fr; gap: 1.25rem; }
        }
        @media (max-width: 720px) {
          .sl-hide-sm { display: none; }
          .sl-thead, .sl-status { display: none; }
          .sl-show-sm { display: block; }
          .sl-grid {
            grid-template-columns: minmax(0, 1fr) auto auto;
            grid-template-areas: "client client menu" "setup mrr mrr";
            gap: 0.6rem 1rem;
          }
          .sl-client { grid-area: client; }
          .sl-menu { grid-area: menu; }
          .sl-row .sl-amount:not(.sl-mrr) { grid-area: setup; text-align: left; }
          .sl-row .sl-mrr { grid-area: mrr; }
          .sl-amount small { display: block; font-size: 0.6875rem; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); margin-bottom: 2px; }
          .sl-row .sl-amount { padding-left: calc(40px + 0.875rem); }
          .sl-row .sl-mrr { padding-left: 0; }
          .sl-tfoot { grid-template-columns: 1fr auto auto; grid-template-areas: none; padding: 0.75rem 1rem; }
          .sl-tfoot > span:nth-child(2), .sl-tfoot > span:nth-child(5) { display: none; }
          .mx-stats { grid-template-columns: 1fr 1fr; gap: 0.75rem; }
          .mx-stat.hero { grid-column: 1 / -1; }
          .mx-stat-value { font-size: 1.625rem; }
        }
        @media (max-width: 440px) {
          .mx-stats { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
