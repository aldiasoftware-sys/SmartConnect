"use client";

import { useState } from "react";
import { ChevronRight, Plus, Search, List, Columns, Hourglass } from "lucide-react";
import { shortDate } from "@/lib/social";
import { Area, PRIORITIES, TASK_STATUSES, Task, TaskStatus, isLate, progressOf, taskStatus } from "@/lib/projects";
import { Bar, TaskCheck } from "./ui";

type Props = {
  tasks: Task[]; areas: Area[]; area: string; setArea: (a: string) => void;
  openTask: (t: Task) => void; newTask: (area?: string, status?: TaskStatus) => void;
  quickSave: (t: Task) => Promise<void>;
};

const FILTERS = [
  { id: "abiertas", label: "Abiertas" }, { id: "todas", label: "Todas" }, { id: "tarde", label: "Tarde" },
  { id: "esperando", label: "Esperando" }, { id: "hechas", label: "Hechas" },
];
const BOARD: TaskStatus[] = ["pendiente", "en_curso", "esperando", "revision", "hecho"];

export default function TasksView({ tasks, areas, area, setArea, openTask, newTask, quickSave }: Props) {
  const [view, setView] = useState<"lista" | "tablero">("lista");
  const [filter, setFilter] = useState("abiertas");
  const [q, setQ] = useState("");
  const [owner, setOwner] = useState("Todos");
  const [closed, setClosed] = useState<Record<string, boolean>>({});
  const [over, setOver] = useState<string | null>(null);

  const ql = q.trim().toLowerCase();
  const shown = tasks.filter((t) => {
    if (area !== "Todas" && (t.area || "Sin área") !== area) return false;
    if (owner !== "Todos" && t.owner !== owner && !(t.owner === "Ambos" && owner !== "Ambos")) return false;
    if (ql && !`${t.title} ${t.detail || ""} ${t.waiting_on || ""}`.toLowerCase().includes(ql)) return false;
    if (view === "tablero") return t.kind === "tarea" && t.status !== "descartado";
    if (filter === "abiertas") return t.status !== "hecho" && t.status !== "descartado";
    if (filter === "tarde") return isLate(t);
    if (filter === "esperando") return (t.status === "esperando" || !!t.waiting_on) && t.status !== "hecho";
    if (filter === "hechas") return t.status === "hecho";
    return true;
  });

  const toggle = (t: Task) => quickSave(t.status === "hecho"
    ? { ...t, status: t.progress > 0 && t.progress < 100 ? "en_curso" : "pendiente", progress: t.progress === 100 ? 0 : t.progress }
    : { ...t, status: "hecho", progress: 100 });

  const groups = [...areas.map((a) => a.name), ...(tasks.some((t) => !t.area || !areas.find((a) => a.name === t.area)) ? ["Sin área"] : [])]
    .filter((g) => area === "Todas" || g === area);
  const colorOf = (name?: string | null) => areas.find((a) => a.name === name)?.color || "var(--text-muted)";
  const inGroup = (g: string, t: Task) => (g === "Sin área" ? !t.area || !areas.find((a) => a.name === t.area) : t.area === g);

  return (
    <div className="animate-in">
      <div className="mx-toolbar">
        <div className="mx-search" style={{ maxWidth: 340 }}>
          <Search style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "var(--text-muted)" }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar tareas…" style={{ paddingLeft: 36, width: "100%" }} />
        </div>
        <select value={area} onChange={(e) => setArea(e.target.value)} style={{ width: "auto", minWidth: 180 }}>
          <option value="Todas">Todas las áreas</option>
          {areas.map((a) => <option key={a.name}>{a.name}</option>)}
        </select>
        <select value={owner} onChange={(e) => setOwner(e.target.value)} style={{ width: "auto" }}>
          {["Todos", "Guille", "Millán", "Ambos"].map((o) => <option key={o} value={o}>{o === "Todos" ? "Todos los responsables" : o}</option>)}
        </select>
        {view === "lista" && <div className="seg">{FILTERS.map((f) => <button key={f.id} className={filter === f.id ? "on" : ""} onClick={() => setFilter(f.id)}>{f.label}</button>)}</div>}
        <div style={{ flex: 1 }} />
        <div className="seg">
          <button className={view === "lista" ? "on" : ""} onClick={() => setView("lista")} title="Lista"><List style={{ width: 15, height: 15, verticalAlign: -3 }} /> Lista</button>
          <button className={view === "tablero" ? "on" : ""} onClick={() => setView("tablero")} title="Tablero"><Columns style={{ width: 15, height: 15, verticalAlign: -3 }} /> Tablero</button>
        </div>
        <button className="btn-primary" onClick={() => newTask(area !== "Todas" ? area : undefined)}><Plus style={{ width: 16, height: 16 }} /> Tarea</button>
      </div>

      {view === "lista" ? (
        <>
          {groups.map((g) => {
            const all = tasks.filter((t) => inGroup(g, t));
            const rows = shown.filter((t) => inGroup(g, t));
            if (!rows.length && (ql || filter !== "abiertas")) return null;
            const p = progressOf(all);
            const open = !closed[g];
            const real = all.filter((t) => t.kind === "tarea" && t.status !== "descartado");
            return (
              <div key={g} className="pj-group">
                <div className="pj-group-head" onClick={() => setClosed((c) => ({ ...c, [g]: open }))}>
                  <ChevronRight className={`chev ${open ? "open" : ""}`} />
                  <h4><i style={{ background: colorOf(g) }} />{g}</h4>
                  <span className="text-xs text-muted">{real.filter((t) => t.status === "hecho").length}/{real.length}</span>
                  <div style={{ flex: 1, maxWidth: 220, marginLeft: "auto" }}><Bar value={p} color={colorOf(g)} thin /></div>
                  <span className="text-xs" style={{ fontWeight: 600, width: 36, textAlign: "right" }}>{p}%</span>
                </div>
                {open && rows.map((t) => {
                  const st = taskStatus(t.status);
                  const late = isLate(t);
                  return (
                    <div key={t.id} className={`pj-task ${t.status === "hecho" ? "done" : ""}`} onClick={() => openTask(t)}>
                      <TaskCheck task={t} color={colorOf(t.area)} onToggle={() => toggle(t)} />
                      <div style={{ minWidth: 0 }}>
                        <div className="pj-task-title">
                          {t.kind === "hito" && <b style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginRight: 6, letterSpacing: "0.06em" }}>HITO</b>}
                          {t.title}
                          {t.waiting_on && t.status !== "hecho" && <span className="pj-wait"><Hourglass style={{ width: 10, height: 10 }} />{t.waiting_on}</span>}
                        </div>
                        {t.detail && <div className="pj-task-sub">{t.detail}</div>}
                      </div>
                      <div className="hide-sm"><span className="pj-pill" style={{ background: st.soft, color: st.color }}><i />{st.label}</span></div>
                      <div className="pj-task-cell hide-md" style={{ color: late ? "var(--bad)" : undefined, fontWeight: late ? 600 : undefined }}>
                        {t.start_date ? (t.kind === "hito" || t.start_date === t.end_date ? shortDate(t.start_date) : `${shortDate(t.start_date)} → ${shortDate(t.end_date || t.start_date)}`) : "Sin fecha"}
                      </div>
                      <div className="pj-task-cell hide-md"><span className="pj-prio" style={{ background: PRIORITIES[t.priority]?.color }} />{t.owner}</div>
                      <div className="pj-task-cell" style={{ textAlign: "right", fontWeight: 600, color: late ? "var(--bad)" : t.status === "hecho" ? "var(--ok)" : "var(--text-secondary)" }}>
                        {t.kind === "hito" ? "" : late ? "Tarde" : `${t.status === "hecho" ? 100 : t.progress}%`}
                      </div>
                    </div>
                  );
                })}
                {open && rows.length === 0 && <div className="pj-task" style={{ cursor: "default", color: "var(--text-muted)", gridTemplateColumns: "1fr" }}>Nada abierto aquí.</div>}
                {open && g !== "Sin área" && (
                  <div style={{ borderTop: "1px solid var(--border-color)", padding: "0.5rem 1rem" }}>
                    <button className="btn-ghost" onClick={() => newTask(g)}><Plus style={{ width: 14, height: 14 }} /> Añadir a {g}</button>
                  </div>
                )}
              </div>
            );
          })}
          {groups.length === 0 && <div className="empty">Sin tareas.</div>}
        </>
      ) : (
        <div className="pj-board">
          {BOARD.map((sid) => {
            const s = TASK_STATUSES.find((x) => x.id === sid)!;
            const col = shown.filter((t) => t.status === sid);
            return (
              <div key={sid} className={`pj-col ${over === sid ? "over" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setOver(sid); }} onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  e.preventDefault(); setOver(null);
                  const t = tasks.find((x) => x.id === e.dataTransfer.getData("text/plain"));
                  if (t && t.status !== sid) quickSave({ ...t, status: sid, progress: sid === "hecho" ? 100 : t.progress === 100 ? 80 : t.progress });
                }}>
                <div className="pj-col-head"><span><i style={{ background: s.color }} />{s.label}</span><span className="count-badge">{col.length}</span></div>
                {col.map((t) => (
                  <div key={t.id} className="pj-kcard" draggable onDragStart={(e) => e.dataTransfer.setData("text/plain", t.id!)} onClick={() => openTask(t)}
                    style={{ "--pj-color": colorOf(t.area) } as React.CSSProperties}>
                    <b>{t.title}</b>
                    {t.waiting_on && t.status !== "hecho" && <span className="pj-wait" style={{ marginLeft: 0, marginTop: 6 }}><Hourglass style={{ width: 10, height: 10 }} />{t.waiting_on}</span>}
                    <small>
                      <span style={{ color: isLate(t) ? "var(--bad)" : undefined }}>{t.end_date ? shortDate(t.end_date) : "Sin fecha"}</span>
                      <span><span className="pj-prio" style={{ background: PRIORITIES[t.priority]?.color }} />{t.owner}</span>
                    </small>
                    {t.progress > 0 && t.status !== "hecho" && <div style={{ marginTop: 8 }}><Bar value={t.progress} color={colorOf(t.area)} thin /></div>}
                  </div>
                ))}
                <button className="add-slot" onClick={() => newTask(area !== "Todas" ? area : undefined, sid)}>+ Añadir</button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
