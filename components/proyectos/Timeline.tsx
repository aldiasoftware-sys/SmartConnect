"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Crosshair } from "lucide-react";
import { addDays, daysBetween, fromISO, shortDate, today, weekNumber, weekStart } from "@/lib/social";
import { Area, Task, areaRange, isLate, progressOf } from "@/lib/projects";

type Props = { tasks: Task[]; areas: Area[]; openTask: (t: Task) => void; quickSave: (t: Task) => Promise<void> };
type Row = { type: "area"; area: Area; items: Task[] } | { type: "task"; task: Task; color: string; soft: string };

const soften = (hex: string) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ecf0f6";
  const n = parseInt(m[1], 16), mix = (c: number) => Math.round(c + (255 - c) * 0.84);
  return `rgb(${mix(n >> 16)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
};

export default function Timeline({ tasks, areas, openTask, quickSave }: Props) {
  const [zoom, setZoom] = useState<"dias" | "semanas">("semanas");
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [hideDone, setHideDone] = useState(false);
  const [preview, setPreview] = useState<{ id: string; start: string; end: string } | null>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const t = today();
  const dayW = zoom === "dias" ? 34 : 13;

  const dated = tasks.filter((x) => x.start_date && (!hideDone || x.status !== "hecho") && x.status !== "descartado");
  const allAreas: Area[] = [...areas, ...(dated.some((x) => !areas.find((a) => a.name === x.area)) ? [{ name: "Sin área", color: "#8b95aa" }] : [])];

  const rows: Row[] = [];
  for (const a of allAreas) {
    const items = dated.filter((x) => (a.name === "Sin área" ? !areas.find((y) => y.name === x.area) : x.area === a.name))
      .sort((p, q) => p.start_date!.localeCompare(q.start_date!) || (p.kind === "hito" ? 1 : -1));
    if (!items.length && !a.start) continue;
    rows.push({ type: "area", area: a, items });
    if (!closed[a.name]) for (const x of items.filter((i) => i.kind === "tarea")) rows.push({ type: "task", task: x, color: a.color, soft: soften(a.color) });
  }

  const { start, days } = useMemo(() => {
    const ds = [...tasks.flatMap((x) => [x.start_date, x.end_date]), ...areas.flatMap((a) => [a.start, a.end])].filter(Boolean) as string[];
    const min = [addDays(t, -14), ...ds].sort()[0];
    const max = [addDays(t, 42), ...ds].sort().reverse()[0];
    const s = weekStart(fromISO(min));
    return { start: s, days: daysBetween(s, addDays(weekStart(fromISO(max)), 13)) + 1 };
  }, [tasks, areas, t]);
  const xOf = (d: string) => daysBetween(start, d) * dayW;
  const weeks = Array.from({ length: Math.ceil(days / 7) }, (_, k) => addDays(start, k * 7));

  const scrollToToday = () => scroller.current?.scrollTo({ left: Math.max(0, xOf(t) - 6 * dayW * (zoom === "dias" ? 1 : 3)), behavior: "smooth" });
  useEffect(() => { scrollToToday(); }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  function drag(e: React.PointerEvent, it: Task, kind: "move" | "end") {
    e.preventDefault(); e.stopPropagation();
    const x0 = e.clientX; let next = { start: it.start_date!, end: it.end_date || it.start_date! }; let moved = false;
    const move = (ev: PointerEvent) => {
      const dd = Math.round((ev.clientX - x0) / dayW);
      if (dd !== 0) moved = true;
      if (kind === "move") next = { start: addDays(it.start_date!, dd), end: addDays(it.end_date || it.start_date!, dd) };
      else { const e2 = addDays(it.end_date || it.start_date!, dd); next = { start: it.start_date!, end: e2 < it.start_date! ? it.start_date! : e2 }; }
      setPreview({ id: it.id!, ...next });
    };
    const up = async () => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up);
      setPreview(null);
      if (!moved) { openTask(it); return; }
      if (next.start !== it.start_date || next.end !== it.end_date) await quickSave({ ...it, start_date: next.start, end_date: next.end });
    };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }

  return (
    <div className="animate-in">
      <div className="mx-toolbar">
        <div className="flex gap-2" style={{ flexWrap: "wrap" }}>
          {areas.map((a) => <span key={a.name} className="chip"><i style={{ background: a.color }} />{a.name}</span>)}
        </div>
        <div style={{ flex: 1 }} />
        <label className="text-sm flex items-center gap-2" style={{ cursor: "pointer" }}><input type="checkbox" checked={hideDone} onChange={(e) => setHideDone(e.target.checked)} /> Ocultar hechas</label>
        <button className="btn-secondary" onClick={() => setClosed(Object.fromEntries(allAreas.map((a) => [a.name, !Object.values(closed).some(Boolean)])))} style={{ padding: "0.5rem 0.875rem" }}>
          {Object.values(closed).some(Boolean) ? "Desplegar todo" : "Plegar todo"}</button>
        <button className="btn-secondary" onClick={scrollToToday} style={{ padding: "0.5rem 0.875rem" }}><Crosshair style={{ width: 15, height: 15 }} /> Hoy</button>
        <div className="seg">
          <button className={zoom === "dias" ? "on" : ""} onClick={() => setZoom("dias")}>Días</button>
          <button className={zoom === "semanas" ? "on" : ""} onClick={() => setZoom("semanas")}>Semanas</button>
        </div>
      </div>

      <div className="gantt">
        <div className="gantt-side">
          <div className="gantt-side-head">Área y tarea</div>
          {rows.map((r) => r.type === "area" ? (
            <div key={`a-${r.area.name}`} className="pj-gantt-area" onClick={() => setClosed((c) => ({ ...c, [r.area.name]: !c[r.area.name] }))}>
              <ChevronRight className={closed[r.area.name] ? "" : "open"} />
              <span style={{ width: 9, height: 9, borderRadius: 3, background: r.area.color, flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{r.area.name}</span>
              <span style={{ fontVariantNumeric: "tabular-nums" }}>{progressOf(r.items)}%</span>
            </div>
          ) : (
            <div key={r.task.id} className="gantt-row-label" onClick={() => openTask(r.task)}>
              <div style={{ minWidth: 0, flex: 1, paddingLeft: 18 }}>
                <b style={{ textDecoration: r.task.status === "hecho" ? "line-through" : undefined, color: r.task.status === "hecho" ? "var(--text-muted)" : undefined }}>{r.task.title}</b>
                <small>{r.task.owner} · {shortDate(r.task.start_date!)} → {shortDate(r.task.end_date || r.task.start_date!)}{r.task.waiting_on ? ` · espera a ${r.task.waiting_on}` : ""}</small>
              </div>
              <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: isLate(r.task) ? "var(--bad)" : r.task.status === "hecho" ? "var(--ok)" : "var(--text-muted)" }}>
                {isLate(r.task) ? "Tarde" : `${r.task.status === "hecho" ? 100 : r.task.progress}%`}</span>
            </div>
          ))}
          {rows.length === 0 && <div className="empty" style={{ height: 156 }}>Ninguna tarea tiene fechas.</div>}
        </div>

        <div className="gantt-scroll" ref={scroller}>
          <div className="gantt-canvas" style={{ width: days * dayW, minHeight: "100%" }}>
            <div className="gantt-scale">
              {weeks.map((w) => <div key={w} className="gantt-week" style={{ left: xOf(w), width: 7 * dayW }}>{zoom === "dias" ? `S${weekNumber(w)} · ${shortDate(w)}` : shortDate(w)}</div>)}
              {zoom === "dias" ? Array.from({ length: days }, (_, k) => {
                const d = addDays(start, k);
                return <div key={d} className={`gantt-day ${d === t ? "today" : ""}`} style={{ left: k * dayW, width: dayW }}><span>{fromISO(d).getDate()}</span></div>;
              }) : weeks.filter((w) => fromISO(w).getDate() <= 7).map((w) => (
                <div key={`m-${w}`} className="gantt-day" style={{ left: xOf(w), width: 7 * dayW * 4, justifyContent: "flex-start", paddingLeft: 8, fontWeight: 600, textTransform: "capitalize" }}>
                  {fromISO(w).toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</div>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              {Array.from({ length: days }, (_, k) => {
                const wd = (fromISO(addDays(start, k)).getDay() + 6) % 7;
                return wd >= 5 && zoom === "dias" ? <div key={k} className="gantt-col-weekend" style={{ left: k * dayW, width: dayW }} /> : wd === 0 ? <div key={k} className="gantt-col-line" style={{ left: k * dayW }} /> : null;
              })}
              <div className="gantt-today" style={{ left: xOf(t) + dayW / 2 - 1 }} />
              {rows.map((r) => {
                if (r.type === "area") {
                  const rg = areaRange(r.area, r.items);
                  return (
                    <div key={`a-${r.area.name}`} className="pj-gantt-areatrack">
                      {rg.start && rg.end && <div className="pj-gantt-span" title={`${r.area.name} · ${shortDate(rg.start)} → ${shortDate(rg.end)}`}
                        style={{ left: xOf(rg.start), width: (daysBetween(rg.start, rg.end) + 1) * dayW, background: soften(r.area.color), boxShadow: `inset 0 0 0 1px ${r.area.color}33` }}>
                        <span style={{ position: "absolute", inset: "0 auto 0 0", width: `${progressOf(r.items)}%`, background: r.area.color, borderRadius: 99, opacity: 0.85 }} />
                      </div>}
                      {r.items.filter((i) => i.kind === "hito").map((m) => (
                        <div key={m.id} className="pj-gantt-ms" onClick={() => openTask(m)} title={`${m.title} · ${shortDate(m.start_date!)}`}
                          style={{ left: xOf(m.start_date!) + dayW / 2 - 8, top: 12, background: m.status === "hecho" ? "var(--ok)" : r.area.color }} />
                      ))}
                    </div>
                  );
                }
                const it = r.task;
                const p = preview && preview.id === it.id ? preview : { start: it.start_date!, end: it.end_date || it.start_date! };
                const left = xOf(p.start), width = (daysBetween(p.start, p.end) + 1) * dayW;
                const late = isLate(it);
                const prog = it.status === "hecho" ? 100 : it.progress;
                return (
                  <div key={it.id} className="gantt-track">
                    <div className="gantt-bar" onPointerDown={(e) => drag(e, it, "move")} title={`${it.title} · ${shortDate(p.start)} → ${shortDate(p.end)} · ${prog}%`}
                      style={{ left: left + 2, width: Math.max(width - 4, 10), outline: late ? "2px solid var(--bad)" : "none", outlineOffset: 1, touchAction: "none", opacity: it.status === "hecho" ? 0.6 : 1 }}>
                      <span className="bg" style={{ background: r.soft }} />
                      <span className="fill" style={{ width: `${prog}%`, background: r.color, opacity: 0.35 }} />
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", cursor: "grab" }}>{width > 90 ? it.title : ""}</span>
                      <span onPointerDown={(e) => drag(e, it, "end")} style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 9, cursor: "ew-resize", borderRight: `3px solid ${r.color}` }} />
                    </div>
                    {width <= 90 && <span style={{ position: "absolute", left: left + width + 6, top: 17, fontSize: "0.75rem", fontWeight: 600, whiteSpace: "nowrap", color: "var(--text-secondary)" }}>{it.title}</span>}
                  </div>
                );
              })}
              <div style={{ height: 40 }} />
            </div>
          </div>
        </div>
      </div>
      <p className="text-xs text-muted" style={{ marginTop: "0.75rem" }}>Arrastra una barra para moverla y su borde derecho para alargarla. Los rombos son hitos; la línea roja es hoy.</p>
    </div>
  );
}
