"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, X, Trash2, Crosshair, CalendarRange, AlertTriangle, CheckCircle2, Activity, HardDrive } from "lucide-react";
import Portal from "@/components/Portal";
import { GanttItem, addDays, daysBetween, fromISO, shortDate, toISO, weekNumber, weekStart } from "@/lib/social";
import { deleteRow, listRows, saveRow, tableMode } from "@/lib/store";

const CATS: Record<string, { color: string; soft: string }> = {
  Contenido: { color: "#fe2c55", soft: "#ffe3e9" },
  Clientes: { color: "#0a66c2", soft: "#dcebfa" },
  Ventas: { color: "#12a26b", soft: "#dcf4e8" },
  Producto: { color: "#e8590c", soft: "#ffe6d6" },
  Interno: { color: "#6c5ce7", soft: "#e9e6fc" },
};
const OWNERS = ["Guille", "Millán", "Ambos"];
const ROW = 52;
const today = () => toISO(new Date());
const blank = (): GanttItem => ({ title: "", owner: "Ambos", category: "Contenido", start_date: today(), end_date: addDays(today(), 6), progress: 0, notes: "" });

type Drag = { id: string; kind: "move" | "end"; x0: number; start: string; end: string; moved: boolean };

export default function PlanificacionPage() {
  const [items, setItems] = useState<GanttItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState(false);
  const [zoom, setZoom] = useState<"dias" | "semanas">("dias");
  const [owner, setOwner] = useState("Todos");
  const [editing, setEditing] = useState<GanttItem | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [preview, setPreview] = useState<{ id: string; start: string; end: string } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  async function load() {
    setLocal((await tableMode("gantt_items")) === "local");
    setItems(await listRows<GanttItem>("gantt_items", "start_date"));
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const dayW = zoom === "dias" ? 36 : 14;
  const shown = items.filter((i) => owner === "Todos" || i.owner === owner || (owner !== "Ambos" && i.owner === "Ambos"))
    .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.end_date.localeCompare(b.end_date));

  const { start, days } = useMemo(() => {
    const t = today();
    const minS = [addDays(t, -7), ...items.map((i) => i.start_date)].sort()[0];
    const maxE = [addDays(t, 49), ...items.map((i) => i.end_date)].sort().reverse()[0];
    const s = weekStart(fromISO(minS));
    const e = addDays(weekStart(fromISO(maxE)), 13);
    return { start: s, days: daysBetween(s, e) + 1 };
  }, [items]);

  const xOf = (d: string) => daysBetween(start, d) * dayW;
  const t = today();

  const scrollToToday = () => { if (scroller.current) scroller.current.scrollTo({ left: Math.max(0, xOf(t) - 3 * dayW * (zoom === "dias" ? 2 : 4)), behavior: "smooth" }); };
  useEffect(() => { if (!loading) scrollToToday(); }, [loading, zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  // arrastrar una barra mueve sus fechas; el borde derecho cambia el final; un clic sin mover abre la tarea
  function startDrag(e: React.PointerEvent, it: GanttItem, kind: Drag["kind"]) {
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX; let next = { start: it.start_date, end: it.end_date }; let moved = false;
    setDrag({ id: it.id!, kind, x0, start: it.start_date, end: it.end_date, moved: false });
    const move = (ev: PointerEvent) => {
      const dd = Math.round((ev.clientX - x0) / dayW);
      if (dd !== 0) moved = true;
      if (kind === "move") next = { start: addDays(it.start_date, dd), end: addDays(it.end_date, dd) };
      else { const e2 = addDays(it.end_date, dd); next = { start: it.start_date, end: e2 < it.start_date ? it.start_date : e2 }; }
      setPreview({ id: it.id!, ...next });
    };
    const up = async () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      setDrag(null); setPreview(null);
      if (!moved) { setEditing(it); return; }
      if (next.start === it.start_date && next.end === it.end_date) return;
      const saved = { ...it, start_date: next.start, end_date: next.end };
      setItems((cur) => cur.map((i) => (i.id === it.id ? saved : i)));
      await saveRow<GanttItem>("gantt_items", saved);
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || !editing.title.trim()) return;
    const it = { ...editing, end_date: editing.end_date < editing.start_date ? editing.start_date : editing.end_date };
    await saveRow<GanttItem>("gantt_items", it); setEditing(null); load();
  }
  async function remove() { if (editing?.id) { await deleteRow("gantt_items", editing.id); setEditing(null); load(); } }

  const active = items.filter((i) => i.start_date <= t && i.end_date >= t && i.progress < 100).length;
  const late = items.filter((i) => i.end_date < t && i.progress < 100).length;
  const weekEnd = addDays(weekStart(), 6);
  const dueWeek = items.filter((i) => i.end_date >= weekStart() && i.end_date <= weekEnd && i.progress < 100).length;
  const avg = items.length ? Math.round(items.reduce((s, i) => s + i.progress, 0) / items.length) : 0;

  const weeks = Array.from({ length: Math.ceil(days / 7) }, (_, k) => addDays(start, k * 7));

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Planificación</h2>
          <p className="page-subtitle">Diagrama de Gantt del equipo: arrastra una barra para moverla y su borde derecho para alargarla.</p>
        </div>
        <button className="btn-primary" onClick={() => setEditing(blank())}><Plus style={{ width: 18, height: 18 }} /> Nueva tarea</button>
      </div>

      {local && (
        <div className="banner"><HardDrive /><div><b>El Gantt se está guardando solo en este navegador.</b> Ejecuta <code>redes_setup.sql</code> en Supabase para compartirlo; lo que haya aquí se sube solo.</div></div>
      )}

      <div className="grid-4" style={{ marginBottom: "1.25rem" }}>
        {[
          { l: "En curso hoy", v: active, i: Activity, c: undefined },
          { l: "Terminan esta semana", v: dueWeek, i: CalendarRange, c: undefined },
          { l: "Retrasadas", v: late, i: AlertTriangle, c: late ? "var(--bad)" : undefined },
          { l: "Progreso medio", v: `${avg}%`, i: CheckCircle2, c: undefined },
        ].map((k) => (
          <div key={k.l} className="card kpi">
            <div className="kpi-label">{k.l} <k.i /></div>
            <div className="kpi-value" style={{ color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center" style={{ marginBottom: "0.875rem", gap: "1rem", flexWrap: "wrap" }}>
        <div className="seg">
          {["Todos", ...OWNERS].map((o) => <button key={o} className={owner === o ? "on" : ""} onClick={() => setOwner(o)}>{o}</button>)}
        </div>
        <div className="flex gap-2 items-center">
          <div className="flex gap-2" style={{ marginRight: 8, flexWrap: "wrap" }}>
            {Object.entries(CATS).map(([k, c]) => <span key={k} className="chip"><i style={{ background: c.color }} />{k}</span>)}
          </div>
          <button className="btn-secondary" onClick={scrollToToday} style={{ padding: "0.5rem 0.875rem" }}><Crosshair style={{ width: 15, height: 15 }} /> Hoy</button>
          <div className="seg">
            <button className={zoom === "dias" ? "on" : ""} onClick={() => setZoom("dias")}>Días</button>
            <button className={zoom === "semanas" ? "on" : ""} onClick={() => setZoom("semanas")}>Semanas</button>
          </div>
        </div>
      </div>

      <div className="gantt">
        <div className="gantt-side">
          <div className="gantt-side-head">Tarea</div>
          {shown.map((i) => {
            const c = CATS[i.category || "Interno"] || CATS.Interno;
            const isLate = i.end_date < t && i.progress < 100;
            return (
              <div key={i.id} className="gantt-row-label" onClick={() => setEditing(i)}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: c.color, flexShrink: 0 }} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <b>{i.title}</b>
                  <small>{i.owner} · {shortDate(i.start_date)} → {shortDate(i.end_date)}</small>
                </div>
                <span style={{ fontSize: "0.6875rem", fontWeight: 700, color: isLate ? "var(--bad)" : i.progress === 100 ? "var(--ok)" : "var(--text-muted)" }}>{isLate ? "Tarde" : `${i.progress}%`}</span>
              </div>
            );
          })}
          {!loading && shown.length === 0 && <div className="empty" style={{ height: ROW * 3 }}>Sin tareas todavía.</div>}
          <div style={{ padding: "0.75rem" }}><button className="btn-ghost" onClick={() => setEditing(blank())}><Plus style={{ width: 15, height: 15 }} /> Añadir tarea</button></div>
        </div>

        <div className="gantt-scroll" ref={scroller}>
          <div className="gantt-canvas" style={{ width: days * dayW, minHeight: "100%" }}>
            <div className="gantt-scale">
              {weeks.map((w) => (
                <div key={w} className="gantt-week" style={{ left: xOf(w), width: 7 * dayW }}>S{weekNumber(w)} · {shortDate(w)}</div>
              ))}
              {zoom === "dias" && Array.from({ length: days }, (_, k) => {
                const d = addDays(start, k);
                return <div key={d} className={`gantt-day ${d === t ? "today" : ""}`} style={{ left: k * dayW, width: dayW }}><span>{fromISO(d).getDate()}</span></div>;
              })}
            </div>
            <div style={{ position: "relative" }}>
              {Array.from({ length: days }, (_, k) => {
                const wd = (fromISO(addDays(start, k)).getDay() + 6) % 7;
                return wd >= 5 ? <div key={k} className="gantt-col-weekend" style={{ left: k * dayW, width: dayW }} /> : wd === 0 ? <div key={k} className="gantt-col-line" style={{ left: k * dayW }} /> : null;
              })}
              <div className="gantt-today" style={{ left: xOf(t) + dayW / 2 - 1 }} />
              {shown.map((i) => {
                const c = CATS[i.category || "Interno"] || CATS.Interno;
                const p = preview && preview.id === i.id ? preview : { start: i.start_date, end: i.end_date };
                const left = xOf(p.start), width = (daysBetween(p.start, p.end) + 1) * dayW;
                const isLate = i.end_date < t && i.progress < 100;
                return (
                  <div key={i.id} className="gantt-track">
                    <div className="gantt-bar" style={{ left: left + 2, width: Math.max(width - 4, 10), outline: isLate ? "2px solid var(--bad)" : "none", outlineOffset: 1, touchAction: "none" }}
                      title={`${i.title} · ${shortDate(p.start)} → ${shortDate(p.end)} · ${i.progress}%`}
                      onPointerDown={(e) => startDrag(e, i, "move")}>
                      <span className="bg" style={{ background: c.soft }} />
                      <span className="fill" style={{ width: `${i.progress}%`, background: c.color, opacity: 0.32 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", cursor: drag ? "grabbing" : "grab" }}>{width > 70 ? i.title : ""}</span>
                      <span onPointerDown={(e) => startDrag(e, i, "end")}
                        style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 10, cursor: "ew-resize", borderRight: `3px solid ${c.color}` }} />
                    </div>
                    {width <= 70 && <span style={{ position: "absolute", left: left + width + 6, top: 17, fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{i.title}</span>}
                  </div>
                );
              })}
              {!loading && shown.length === 0 && <div style={{ height: ROW * 3 }} />}
              <div style={{ height: 63 }} />
            </div>
          </div>
        </div>
      </div>

      {editing && (
        <Portal>
        <div className="dialog-overlay" onClick={() => setEditing(null)}>
          <form className="dialog" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
            <div className="dialog-head">
              <div>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{editing.id ? "Editar tarea" : "Nueva tarea"}</h3>
                <p className="section-sub">Aparece como una barra en el Gantt.</p>
              </div>
              <button type="button" className="icon-btn" onClick={() => setEditing(null)} aria-label="Cerrar"><X /></button>
            </div>
            <div className="dialog-body">
              <div className="form-group"><label>Título</label>
                <input autoFocus required value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })} placeholder="p. ej. Serie de 4 vídeos para TikTok" /></div>
              <div className="flex gap-4">
                <div className="form-group flex-1"><label>Responsable</label>
                  <select value={editing.owner || "Ambos"} onChange={(e) => setEditing({ ...editing, owner: e.target.value })}>{OWNERS.map((o) => <option key={o}>{o}</option>)}</select></div>
                <div className="form-group flex-1"><label>Categoría</label>
                  <select value={editing.category || "Interno"} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>{Object.keys(CATS).map((o) => <option key={o}>{o}</option>)}</select></div>
              </div>
              <div className="flex gap-4">
                <div className="form-group flex-1"><label>Empieza</label>
                  <input type="date" required value={editing.start_date} onChange={(e) => setEditing({ ...editing, start_date: e.target.value })} /></div>
                <div className="form-group flex-1"><label>Termina</label>
                  <input type="date" required value={editing.end_date} onChange={(e) => setEditing({ ...editing, end_date: e.target.value })} /></div>
              </div>
              <div className="form-group"><label className="flex justify-between">Progreso <span className="text-muted">{editing.progress}%</span></label>
                <input type="range" min={0} max={100} step={5} value={editing.progress} onChange={(e) => setEditing({ ...editing, progress: Number(e.target.value) })} /></div>
              <div className="form-group" style={{ marginBottom: 0 }}><label>Notas</label>
                <textarea rows={3} value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
            </div>
            <div className="dialog-foot">
              {editing.id ? <button type="button" className="btn-danger" onClick={remove}><Trash2 style={{ width: 15, height: 15 }} /> Borrar</button> : <span />}
              <button type="submit" className="btn-primary">Guardar</button>
            </div>
          </form>
        </div>
        </Portal>
      )}
    </div>
  );
}
