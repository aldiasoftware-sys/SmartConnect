"use client";

import { useState } from "react";
import { X, Trash2, Plus, GripVertical } from "lucide-react";
import Portal from "@/components/Portal";
import { AREA_PALETTE, Area, OWNERS, PROJECT_STATUSES, Project, ProjectStatus } from "@/lib/projects";

type Props = { project: Project; onSave: (p: Project, renamed: Record<string, string>) => Promise<void>; onDelete?: () => Promise<void>; onClose: () => void };

/** Datos del proyecto, sus áreas (con color, objetivo y fechas) y sus principios. */
export default function ProjectDialog({ project, onSave, onDelete, onClose }: Props) {
  const [p, setP] = useState<Project>(project);
  const [areas, setAreas] = useState<(Area & { _old?: string })[]>((project.meta?.areas || []).map((a) => ({ ...a, _old: a.name })));
  const [remarks, setRemarks] = useState((project.meta?.remarks || []).join("\n"));
  const [busy, setBusy] = useState(false);
  const set = (x: Partial<Project>) => setP((c) => ({ ...c, ...x }));
  const setArea = (i: number, x: Partial<Area>) => setAreas((c) => c.map((a, k) => (k === i ? { ...a, ...x } : a)));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!p.name.trim()) return;
    setBusy(true);
    const renamed: Record<string, string> = {};
    const clean = areas.filter((a) => a.name.trim()).map(({ _old, ...a }) => {
      if (_old && _old !== a.name.trim()) renamed[_old] = a.name.trim();
      return { ...a, name: a.name.trim(), start: a.start || undefined, end: a.end || undefined, goal: a.goal?.trim() || undefined };
    });
    await onSave({ ...p, meta: { ...(p.meta || {}), areas: clean, remarks: remarks.split("\n").map((r) => r.trim()).filter(Boolean) } }, renamed);
    setBusy(false);
  }

  return (
    <Portal>
      <div className="dialog-overlay" onClick={onClose}>
        <form className="dialog" style={{ maxWidth: 760 }} onClick={(e) => e.stopPropagation()} onSubmit={submit}>
          <div className="dialog-head">
            <div>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em" }}>{p.id ? "Editar proyecto" : "Nuevo proyecto"}</h3>
              <p className="section-sub">Las áreas agrupan las tareas y salen como bloques en el cronograma.</p>
            </div>
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar"><X /></button>
          </div>
          <div className="dialog-body">
            <div className="flex gap-4" style={{ flexWrap: "wrap" }}>
              <div className="form-group flex-1" style={{ minWidth: 260 }}><label>Nombre</label>
                <input autoFocus required value={p.name} onChange={(e) => set({ name: e.target.value })} placeholder="p. ej. Renovación app F&T" /></div>
              <div className="form-group" style={{ width: 200 }}><label>Cliente</label>
                <input value={p.client || ""} onChange={(e) => set({ client: e.target.value })} placeholder="ALDIA, Fun & Tickets…" /></div>
            </div>
            <div className="form-group"><label>Resumen</label>
              <textarea rows={2} value={p.summary || ""} onChange={(e) => set({ summary: e.target.value })} placeholder="Qué se entrega y para qué, en una o dos frases." /></div>
            <div className="flex gap-4" style={{ flexWrap: "wrap" }}>
              <div className="form-group" style={{ width: 160 }}><label>Estado</label>
                <select value={p.status} onChange={(e) => set({ status: e.target.value as ProjectStatus })}>
                  {Object.entries(PROJECT_STATUSES).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
                </select></div>
              <div className="form-group" style={{ width: 140 }}><label>Responsable</label>
                <select value={p.owner || "Ambos"} onChange={(e) => set({ owner: e.target.value })}>{OWNERS.map((o) => <option key={o}>{o}</option>)}</select></div>
              <div className="form-group flex-1"><label>Empieza</label><input type="date" value={p.start_date || ""} onChange={(e) => set({ start_date: e.target.value || null })} /></div>
              <div className="form-group flex-1"><label>Entrega</label><input type="date" value={p.end_date || ""} onChange={(e) => set({ end_date: e.target.value || null })} /></div>
              <div className="form-group" style={{ width: 70 }}><label>Color</label>
                <input type="color" value={p.color || "#1e3a8a"} onChange={(e) => set({ color: e.target.value })} style={{ height: 42, padding: 4 }} /></div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-color)", margin: "0.5rem 0 1rem", paddingTop: "1rem" }}>
              <div className="flex justify-between items-center" style={{ marginBottom: "0.75rem" }}>
                <b style={{ fontSize: "0.875rem" }}>Áreas</b>
                <button type="button" className="btn-ghost" onClick={() => setAreas((c) => [...c, { name: "", color: AREA_PALETTE[c.length % AREA_PALETTE.length] }])}><Plus style={{ width: 15, height: 15 }} /> Añadir área</button>
              </div>
              {areas.length === 0 && <p className="text-sm text-muted" style={{ marginBottom: "0.75rem" }}>Sin áreas: las tareas irán todas juntas.</p>}
              {areas.map((a, i) => (
                <div key={i} style={{ display: "grid", gridTemplateColumns: "18px 36px minmax(0,1fr) 132px 132px 32px", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <GripVertical style={{ width: 14, color: "var(--text-muted)", cursor: "pointer" }} onClick={() => i > 0 && setAreas((c) => { const n = [...c]; [n[i - 1], n[i]] = [n[i], n[i - 1]]; return n; })} aria-label="Subir" />
                  <input type="color" value={a.color} onChange={(e) => setArea(i, { color: e.target.value })} style={{ height: 36, padding: 3 }} />
                  <div>
                    <input value={a.name} onChange={(e) => setArea(i, { name: e.target.value })} placeholder="Nombre del área" style={{ marginBottom: 4 }} />
                    <input value={a.goal || ""} onChange={(e) => setArea(i, { goal: e.target.value })} placeholder="Objetivo del área (opcional)" style={{ fontSize: "0.75rem", padding: "0.4rem 0.6rem" }} />
                  </div>
                  <input type="date" value={a.start || ""} onChange={(e) => setArea(i, { start: e.target.value })} title="Inicio del área" />
                  <input type="date" value={a.end || ""} onChange={(e) => setArea(i, { end: e.target.value })} title="Fin del área" />
                  <button type="button" className="icon-btn" onClick={() => setAreas((c) => c.filter((_, k) => k !== i))} aria-label="Quitar área"><X /></button>
                </div>
              ))}
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}><label>Principios del proyecto <span className="text-muted" style={{ fontWeight: 400 }}>(uno por línea)</span></label>
              <textarea rows={4} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Reglas que no se negocian: legal, alcance, estilo…" /></div>
          </div>
          <div className="dialog-foot">
            {onDelete ? <button type="button" className="btn-danger" onClick={async () => { if (confirm("¿Borrar el proyecto con TODAS sus tareas y notas?")) await onDelete(); }}><Trash2 style={{ width: 15, height: 15 }} /> Borrar proyecto</button> : <span />}
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Guardando…" : "Guardar"}</button>
          </div>
        </form>
      </div>
    </Portal>
  );
}
