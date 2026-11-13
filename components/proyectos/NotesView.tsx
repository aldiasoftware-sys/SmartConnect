"use client";

import { useState } from "react";
import { Pin, PinOff, Check, RotateCcw, Trash2, Pencil, Link2 } from "lucide-react";
import { NOTE_KINDS, Note, NoteKind, Task, stamp } from "@/lib/projects";

type Props = {
  projectId: string; notes: Note[]; tasks: Task[]; author: string;
  save: (n: Note) => Promise<void>; remove: (id: string) => Promise<void>; openTask: (t: Task) => void;
};

export default function NotesView({ projectId, notes, tasks, author, save, remove, openTask }: Props) {
  const [kind, setKind] = useState<NoteKind>("nota");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [filter, setFilter] = useState<"todas" | NoteKind>("todas");
  const [showResolved, setShowResolved] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);

  const counts = Object.fromEntries(Object.keys(NOTE_KINDS).map((k) => [k, notes.filter((n) => n.kind === k && !n.resolved).length]));
  const shown = notes
    .filter((n) => (filter === "todas" || n.kind === filter) && (showResolved || !n.resolved))
    .sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (b.created_at || "").localeCompare(a.created_at || ""));

  async function add() {
    if (!body.trim()) return;
    await save({ project_id: projectId, kind, title: title.trim() || null, body: body.trim(), author });
    setTitle(""); setBody("");
  }

  return (
    <div className="pj-notes animate-in">
      <div>
        <div className="pj-compose">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título (opcional)"
            style={{ border: "none", padding: "0 0 0.4rem", fontWeight: 600, fontSize: "0.9375rem", background: "transparent", outline: "none", width: "100%", boxShadow: "none" }} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Apunta una decisión, una pregunta para Manu, un riesgo, lo que salió en una reunión…"
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) add(); }} />
          <div className="pj-compose-foot">
            <div className="pj-kinds">
              {(Object.keys(NOTE_KINDS) as NoteKind[]).map((k) => (
                <button key={k} className={kind === k ? "on" : ""} onClick={() => setKind(k)} style={kind === k ? { background: NOTE_KINDS[k].soft, color: NOTE_KINDS[k].color } : undefined}>{NOTE_KINDS[k].label}</button>
              ))}
            </div>
            <button className="btn-primary" onClick={add} disabled={!body.trim()} style={{ padding: "0.5rem 1rem" }}>Guardar nota</button>
          </div>
        </div>

        {shown.length === 0 && <div className="empty">No hay notas {filter !== "todas" ? `de tipo «${NOTE_KINDS[filter].label}»` : ""}.</div>}
        {shown.map((n) => {
          const k = NOTE_KINDS[n.kind] || NOTE_KINDS.nota;
          const task = n.task_id ? tasks.find((x) => x.id === n.task_id) : null;
          if (editing?.id === n.id) {
            return (
              <div key={n.id} className="pj-note">
                <span className="pj-note-dot" style={{ background: k.color }} />
                <div className="pj-note-card">
                  <input value={editing!.title || ""} onChange={(e) => setEditing({ ...editing!, title: e.target.value })} placeholder="Título" style={{ marginBottom: 6 }} />
                  <textarea rows={6} value={editing!.body} onChange={(e) => setEditing({ ...editing!, body: e.target.value })} />
                  <div className="flex justify-between items-center" style={{ marginTop: 8, gap: 8, flexWrap: "wrap" }}>
                    <select value={editing!.kind} onChange={(e) => setEditing({ ...editing!, kind: e.target.value as NoteKind })} style={{ width: "auto" }}>
                      {(Object.keys(NOTE_KINDS) as NoteKind[]).map((x) => <option key={x} value={x}>{NOTE_KINDS[x].label}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <button className="btn-secondary" onClick={() => setEditing(null)}>Cancelar</button>
                      <button className="btn-primary" onClick={async () => { await save({ ...editing!, title: editing!.title?.trim() || null }); setEditing(null); }}>Guardar</button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }
          return (
            <div key={n.id} className="pj-note">
              <span className="pj-note-dot" style={{ background: k.color }} />
              <div className={`pj-note-card ${n.resolved ? "resolved" : ""}`}>
                <div className="pj-note-head">
                  <div>
                    <span className="pj-pill" style={{ background: k.soft, color: k.color }}><i />{k.label}</span>
                    {n.pinned && <Pin style={{ width: 13, height: 13, color: "var(--brand)" }} />}
                    {n.resolved && <span className="chip chip-ok">Resuelta</span>}
                    <span className="text-xs text-muted">{n.author ? `${n.author} · ` : ""}{stamp(n.created_at)}</span>
                  </div>
                  <div className="pj-note-acts">
                    {(n.kind === "pregunta" || n.kind === "riesgo") && (
                      <button onClick={() => save({ ...n, resolved: !n.resolved })} title={n.resolved ? "Reabrir" : "Marcar resuelta"}>{n.resolved ? <RotateCcw /> : <Check />}</button>
                    )}
                    <button onClick={() => save({ ...n, pinned: !n.pinned })} title={n.pinned ? "Desfijar" : "Fijar arriba"}>{n.pinned ? <PinOff /> : <Pin />}</button>
                    <button onClick={() => setEditing(n)} title="Editar"><Pencil /></button>
                    <button onClick={() => { if (confirm("¿Borrar esta nota?")) remove(n.id!); }} title="Borrar"><Trash2 /></button>
                  </div>
                </div>
                {n.title && <h5>{n.title}</h5>}
                <div className="pj-note-body">{n.body}</div>
                {task && <button className="pj-link" style={{ marginTop: 6 }} onClick={() => openTask(task)}><Link2 /> {task.title}</button>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="card" style={{ position: "sticky", top: "1rem" }}>
        <h3 className="section-title" style={{ marginBottom: "0.75rem" }}>Filtrar</h3>
        <div className="flex flex-col gap-2">
          {(["todas", ...Object.keys(NOTE_KINDS)] as ("todas" | NoteKind)[]).map((k) => {
            const meta = k === "todas" ? null : NOTE_KINDS[k];
            const c = k === "todas" ? notes.filter((n) => !n.resolved).length : counts[k];
            return (
              <button key={k} onClick={() => setFilter(k)} className="flex justify-between items-center"
                style={{ background: filter === k ? "var(--bg-secondary)" : "transparent", border: "none", borderRadius: 10, padding: "0.5rem 0.75rem", cursor: "pointer", font: "inherit", fontSize: "0.8125rem", fontWeight: filter === k ? 600 : 500, color: "var(--ink)" }}>
                <span className="flex items-center gap-2"><i style={{ width: 8, height: 8, borderRadius: 99, background: meta?.color || "var(--ink)", display: "inline-block" }} />{meta?.label || "Todas"}</span>
                <span className="count-badge">{c}</span>
              </button>
            );
          })}
        </div>
        <label className="text-sm flex items-center gap-2" style={{ marginTop: "1rem", cursor: "pointer" }}>
          <input type="checkbox" className="pj-chk" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} /> Ver también las resueltas
        </label>
      </div>
    </div>
  );
}
