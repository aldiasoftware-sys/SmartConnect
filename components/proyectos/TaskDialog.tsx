"use client";

import { useState } from "react";
import { X, Trash2, Diamond, ListTodo, MessageSquarePlus } from "lucide-react";
import Portal from "@/components/Portal";
import { Area, NOTE_KINDS, Note, OWNERS, PRIORITIES, Priority, TASK_STATUSES, Task, TaskStatus, stamp } from "@/lib/projects";

type Props = {
  task: Task; areas: Area[]; notes: Note[];
  onSave: (t: Task) => Promise<void>; onDelete?: () => Promise<void>; onClose: () => void;
  onAddNote: (n: Note) => Promise<void>;
};

export default function TaskDialog({ task, areas, notes, onSave, onDelete, onClose, onAddNote }: Props) {
  const [t, setT] = useState<Task>(task);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const set = (p: Partial<Task>) => setT((c) => ({ ...c, ...p }));
  const isMs = t.kind === "hito";
  const mine = notes.filter((n) => n.task_id && n.task_id === task.id);

  function setStatus(s: TaskStatus) {
    set({ status: s, progress: s === "hecho" ? 100 : s === "pendiente" && t.progress === 100 ? 0 : t.progress });
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!t.title.trim()) return;
    setBusy(true);
    const end = isMs ? t.start_date : t.end_date && t.start_date && t.end_date < t.start_date ? t.start_date : t.end_date;
    await onSave({ ...t, end_date: end || null, start_date: t.start_date || null, waiting_on: t.waiting_on?.trim() || null });
    setBusy(false);
  }

  return (
    <Portal>
      <div className="dialog-overlay" onClick={onClose}>
        <form className="dialog" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
          <div className="dialog-head">
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em" }}>{task.id ? (isMs ? "Editar hito" : "Editar tarea") : isMs ? "Nuevo hito" : "Nueva tarea"}</h3>
              <p className="section-sub">{isMs ? "Un hito es una fecha clave: sale como rombo en el cronograma." : "Sale en la lista, en el tablero y como barra en el cronograma."}</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar"><X /></button>
          </div>
          <div className="dialog-body">
            <div className="seg" style={{ marginBottom: "1rem" }}>
              <button type="button" className={!isMs ? "on" : ""} onClick={() => set({ kind: "tarea" })}><ListTodo style={{ width: 14, height: 14, marginRight: 4, verticalAlign: -2 }} />Tarea</button>
              <button type="button" className={isMs ? "on" : ""} onClick={() => set({ kind: "hito" })}><Diamond style={{ width: 14, height: 14, marginRight: 4, verticalAlign: -2 }} />Hito</button>
            </div>
            <div className="form-group"><label>Título</label>
              <input autoFocus required value={t.title} onChange={(e) => set({ title: e.target.value })} placeholder="p. ej. Exportar el cuadrante a Excel" /></div>
            <div className="form-group"><label>Detalle</label>
              <textarea rows={3} value={t.detail || ""} onChange={(e) => set({ detail: e.target.value })} placeholder="Qué hay que hacer, dónde está en el código, criterios para darla por hecha…" /></div>
            <div className="flex gap-4" style={{ flexWrap: "wrap" }}>
              <div className="form-group flex-1" style={{ minWidth: 200 }}><label>Área</label>
                <select value={t.area || ""} onChange={(e) => set({ area: e.target.value || null })}>
                  <option value="">Sin área</option>
                  {areas.map((a) => <option key={a.name} value={a.name}>{a.name}</option>)}
                </select></div>
              <div className="form-group" style={{ width: 150 }}><label>Responsable</label>
                <select value={t.owner || "Ambos"} onChange={(e) => set({ owner: e.target.value })}>{OWNERS.map((o) => <option key={o}>{o}</option>)}</select></div>
            </div>
            <div className="form-group"><label>Estado</label>
              <div className="pj-kinds">
                {TASK_STATUSES.map((s) => (
                  <button type="button" key={s.id} className={t.status === s.id ? "on" : ""} onClick={() => setStatus(s.id)}
                    style={t.status === s.id ? { background: s.soft, color: s.color } : undefined}>{s.label}</button>
                ))}
              </div></div>
            <div className="flex gap-4" style={{ flexWrap: "wrap" }}>
              <div className="form-group flex-1"><label>{isMs ? "Fecha" : "Empieza"}</label>
                <input type="date" value={t.start_date || ""} onChange={(e) => set({ start_date: e.target.value || null })} /></div>
              {!isMs && <div className="form-group flex-1"><label>Termina</label>
                <input type="date" value={t.end_date || ""} onChange={(e) => set({ end_date: e.target.value || null })} /></div>}
              <div className="form-group" style={{ width: 130 }}><label>Prioridad</label>
                <select value={t.priority} onChange={(e) => set({ priority: e.target.value as Priority })}>
                  {Object.entries(PRIORITIES).map(([k, p]) => <option key={k} value={k}>{p.label}</option>)}
                </select></div>
            </div>
            {!isMs && (
              <div className="form-group"><label className="flex justify-between">Progreso <span className="text-muted">{t.status === "hecho" ? 100 : t.progress}%</span></label>
                <input type="range" min={0} max={100} step={5} value={t.status === "hecho" ? 100 : t.progress}
                  onChange={(e) => { const v = Number(e.target.value); set({ progress: v, status: v === 100 ? "hecho" : v > 0 && t.status === "pendiente" ? "en_curso" : t.status === "hecho" ? "en_curso" : t.status }); }} /></div>
            )}
            <div className="form-group"><label>Esperando a</label>
              <input value={t.waiting_on || ""} onChange={(e) => set({ waiting_on: e.target.value })} placeholder="p. ej. Manu, asesoría… (vacío si no depende de nadie)" /></div>

            {task.id && (
              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem", marginTop: "0.5rem" }}>
                <label style={{ fontSize: "0.8125rem", fontWeight: 600, display: "block", marginBottom: "0.5rem" }}>Notas de la tarea</label>
                {mine.map((n) => (
                  <div key={n.id} style={{ fontSize: "0.8125rem", padding: "0.5rem 0.75rem", background: "var(--bg-secondary)", borderRadius: 10, marginBottom: 6 }}>
                    <div className="text-xs text-muted" style={{ marginBottom: 2 }}>{NOTE_KINDS[n.kind]?.label} · {n.author} · {stamp(n.created_at)}</div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{n.body}</div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Añadir una nota a esta tarea…" style={{ flex: 1 }}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (note.trim()) { onAddNote({ project_id: t.project_id, task_id: task.id, kind: "nota", body: note.trim() }); setNote(""); } } }} />
                  <button type="button" className="btn-secondary" disabled={!note.trim()} onClick={() => { onAddNote({ project_id: t.project_id, task_id: task.id, kind: "nota", body: note.trim() }); setNote(""); }}>
                    <MessageSquarePlus style={{ width: 15, height: 15 }} /></button>
                </div>
              </div>
            )}
          </div>
          <div className="dialog-foot">
            {onDelete ? <button type="button" className="btn-danger" onClick={async () => { if (confirm("¿Borrar esta tarea?")) await onDelete(); }}><Trash2 style={{ width: 15, height: 15 }} /> Borrar</button> : <span />}
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
