"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, X, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import {
  DndContext,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  defaultDropAnimationSideEffects,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Task {
  id: string;
  title: string;
  date: string;
  user: string;
  fullDesc?: string;
}

type ColId = "todo" | "inprogress" | "done";

interface Columns {
  todo: Task[];
  inprogress: Task[];
  done: Task[];
}

const COL_LABELS: Record<ColId, string> = {
  todo: "Backlog",
  inprogress: "En Curso",
  done: "Hecho",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function findColumn(id: string, cols: Columns): ColId | null {
  if (id in cols) return id as ColId;
  for (const key of Object.keys(cols) as ColId[]) {
    if (cols[key].some((t) => t.id === id)) return key;
  }
  return null;
}

// ─── Droppable column shell ───────────────────────────────────────────────────

function DroppableColumn({ id, children }: { id: ColId; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className="task-list" style={{ minHeight: "60vh", height: "100%", paddingBottom: "4rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      {children}
    </div>
  );
}

// ─── Sortable card ────────────────────────────────────────────────────────────

function SortableTask({
  task,
  colId,
  onInfo,
  footer,
}: {
  task: Task;
  colId: ColId;
  onInfo: () => void;
  footer?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.2 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="task-card"
      {...attributes}
      {...listeners}
      onClick={(e) => { e.stopPropagation(); onInfo(); }}
    >
      <span className={`status-badge ${colId}`} style={{ marginBottom: "0.75rem" }}>
        {colId === "todo" ? "Pendiente" : colId === "inprogress" ? "En Curso" : "Hecho"}
      </span>
      <h3 className="task-title" style={{ paddingBottom: "0.25rem", marginBottom: 0 }}>{task.title}</h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
          Plazo: <span style={{ color: "var(--text-secondary)", marginLeft: "4px" }}>{task.date}</span>
        </span>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
          Asignado a: <span style={{ color: "var(--text-primary)", marginLeft: "4px" }}>{task.user}</span>
        </span>
        {footer && <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem", marginTop: "0.25rem" }}>{footer}</div>}
      </div>
    </div>
  );
}

// ─── Countdown wrapper ───────────────────────────────────────────────────────

function CountdownTask({
  task,
  onInfo,
  onExpire,
}: {
  task: Task;
  onInfo: () => void;
  onExpire: (id: string) => void;
}) {
  const TOTAL = 30;
  const [secs, setSecs] = useState(TOTAL);
  const [fading, setFading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let currentSecs = TOTAL;
    const stored = localStorage.getItem(`task_done_${task.id}`);
    
    if (stored) {
      const elapsed = Math.floor((Date.now() - parseInt(stored, 10)) / 1000);
      currentSecs = Math.max(0, TOTAL - elapsed);
    } else {
      localStorage.setItem(`task_done_${task.id}`, Date.now().toString());
    }
    
    setSecs(currentSecs);
    setReady(true);

    if (currentSecs <= 0) {
      setFading(true);
      const timer = setTimeout(() => {
        onExpire(task.id);
        localStorage.removeItem(`task_done_${task.id}`);
      }, 500);
      return () => clearTimeout(timer);
    }

    const interval = setInterval(() => {
      setSecs((s) => {
        if (s <= 1) {
          clearInterval(interval);
          setFading(true);
          setTimeout(() => {
            onExpire(task.id);
            localStorage.removeItem(`task_done_${task.id}`);
          }, 500);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [task.id, onExpire]);

  const radius = 10;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (secs / TOTAL) * circumference;
  const color = secs <= 5 ? "#ef4444" : secs <= 15 ? "#f59e0b" : "#10b981";

  const countdown = (
    <div className="flex items-center" style={{ gap: "8px", marginTop: "0.625rem" }}>
      <svg width="26" height="26" style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
        <circle cx="13" cy="13" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="2.5" />
        <circle
          cx="13" cy="13" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 1s linear, stroke 0.4s ease" }}
        />
      </svg>
      <span style={{ fontSize: "11px", fontWeight: 700, color }}>
        Se archiva en {secs}s
      </span>
    </div>
  );

  return (
    <div style={{ opacity: (!ready || fading) ? 0 : 1, transition: "opacity 0.5s ease" }}>
      <SortableTask task={task} colId="done" onInfo={onInfo} footer={countdown} />
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────────────────────

export function KanbanBoard() {
  const { user } = useAuth();
  const [cols, setCols] = useState<Columns>({ todo: [], inprogress: [], done: [] });
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [addingTo, setAddingTo] = useState<ColId | null>(null);
  const [globalModal, setGlobalModal] = useState(false);
  const [members, setMembers] = useState<string[]>(["Usuario"]);
  const [form, setForm] = useState({ title: "", user: "Usuario", date: "", fullDesc: "" });

  const fetchTasks = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tasks')
      .select('*');
      
    const { data: teamData } = await supabase.from('team_members').select('full_name');
    if (teamData && teamData.length > 0) {
      const names = teamData.map(m => m.full_name);
      setMembers(names);
      setForm(f => ({ ...f, user: names[0] }));
    }

    if (error) console.error("Error fetching tasks:", error);
    else {
      const newCols: Columns = { todo: [], inprogress: [], done: [] };
      data.forEach((t: any) => {
        const task: Task = {
          id: t.id,
          title: t.title,
          fullDesc: t.full_description,
          date: t.due_date,
          user: t.assigned_to
        };
        if (t.status in newCols) newCols[t.status as ColId].push(task);
      });
      setCols(newCols);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      fetchTasks();
    } else {
      setCols({ todo: [], inprogress: [], done: [] });
      setLoading(false);
    }
    const open = () => setGlobalModal(true);
    window.addEventListener("open-new-task", open);
    return () => window.removeEventListener("open-new-task", open);
  }, [user]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleExpire = useCallback(async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    setCols((prev) => ({ ...prev, done: prev.done.filter((t) => t.id !== id) }));
  }, []);

  const onDragStart = ({ active }: DragStartEvent) => setActiveId(active.id as string);

  const onDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const fromCol = findColumn(active.id as string, cols);
    const toCol = findColumn(over.id as string, cols);
    if (!fromCol || !toCol || fromCol === toCol) return;

    setCols((prev) => {
      const src = [...prev[fromCol]];
      const dst = [...prev[toCol]];
      const movingIdx = src.findIndex((t) => t.id === active.id);
      if (movingIdx === -1) return prev;
      const [moving] = src.splice(movingIdx, 1);
      const overIdx = dst.findIndex((t) => t.id === over.id);
      overIdx >= 0 ? dst.splice(overIdx, 0, moving) : dst.push(moving);
      return { ...prev, [fromCol]: src, [toCol]: dst };
    });
  };

  const onDragEnd = async ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over) return;
    
    // cols state already reflects the latest column due to onDragOver
    const finalCol = findColumn(active.id as string, cols);
    const overCol = findColumn(over.id as string, cols);
    
    // Reorder within the same column if applicable
    if (finalCol && overCol && finalCol === overCol) {
      const items = cols[finalCol];
      const oldIdx = items.findIndex((t) => t.id === active.id);
      const newIdx = items.findIndex((t) => t.id === over.id);
      
      // Prevent dnd-kit arrayMove logic collapse if dropped on a column shell (-1 index)
      if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
        setCols((prev) => ({ ...prev, [finalCol]: arrayMove(prev[finalCol], oldIdx, newIdx) }));
      }
    }

    // Always commit the final state to the database natively 
    if (finalCol) {
      const { error } = await supabase.from('tasks').update({ status: finalCol }).eq('id', active.id);
      if (error) console.error("Error syncing status to DB:", error);
    }
  };

  const handleCreate = async (colId: ColId) => {
    if (!form.title.trim()) return;
    const { error } = await supabase.from('tasks').insert({
      title: form.title,
      full_description: form.fullDesc,
      due_date: form.date,
      assigned_to: form.user,
      status: colId
    });

    if (error) {
      console.error("Error creating task:", error);
      alert("No se pudo crear: " + error.message);
    } else {
      fetchTasks();
    }

    setForm({ title: "", user: members[0] || "Usuario", date: "", fullDesc: "" });
    setGlobalModal(false);
    setAddingTo(null);
  };

  const closeModal = () => { setGlobalModal(false); setAddingTo(null); };

  const activeTask = activeId ? Object.values(cols).flat().find((t) => t.id === activeId) ?? null : null;

  return (
    <div style={{ position: 'relative' }}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="kanban-grid">
          {(Object.keys(COL_LABELS) as ColId[]).map((colId) => (
            <div key={colId} className="kanban-column">
              <div className="column-header" style={{ marginBottom: "1rem" }}>
                {COL_LABELS[colId]}
                <span className="count-badge">{cols[colId].length}</span>
              </div>

              <SortableContext id={colId} items={cols[colId].map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <DroppableColumn id={colId}>
                  {cols[colId].map((task) =>
                    colId === "done" ? (
                      <CountdownTask
                        key={task.id}
                        task={task}
                        onInfo={() => setSelectedTask(task)}
                        onExpire={() => handleExpire(task.id)}
                      />
                    ) : (
                      <SortableTask
                        key={task.id}
                        task={task}
                        colId={colId}
                        onInfo={() => setSelectedTask(task)}
                      />
                    )
                  )}
                </DroppableColumn>
              </SortableContext>

              <button className="btn-ghost" style={{ marginTop: "1rem" }} onClick={() => setAddingTo(colId)}>
                <Plus style={{ width: "14px" }} />
                Nueva Tarea
              </button>
            </div>
          ))}
        </div>
      </DndContext>

      {/* Modals same as before (title, user, date, desc, fullDesc) */}
      {(globalModal || addingTo) && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content drawer-in" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center" style={{ marginBottom: "2rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Nueva Tarea</h3>
              <X style={{ cursor: "pointer", width: "20px", color: "var(--text-muted)" }} onClick={closeModal} />
            </div>
            <div className="form-group"><label>Título</label><input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ej: Integración Vapi.ai" /></div>
            <div className="flex gap-4">
              <div className="form-group flex-1">
                <label>Persona Asignada</label>
                <select value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })}>
                  {members.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group flex-1"><label>Fecha límite</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
            </div>
            <div className="form-group"><label>Detalles</label><textarea rows={3} value={form.fullDesc} onChange={(e) => setForm({ ...form, fullDesc: e.target.value })} placeholder="Objetivos y contexto..." /></div>
            <button className="btn-primary" style={{ width: "100%" }} onClick={() => handleCreate(addingTo ?? "todo")}>Crear Tarea</button>
          </div>
        </div>
      )}

      {selectedTask && (
        <div className="modal-overlay" onClick={() => setSelectedTask(null)}>
          <div className="modal-content animate-in" style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start" style={{ marginBottom: "1.5rem" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>{selectedTask.title}</h3>
              <X style={{ cursor: "pointer", width: "20px", color: "var(--text-muted)" }} onClick={() => setSelectedTask(null)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <div><p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Asignado a</p><p style={{ fontWeight: 600 }}>{selectedTask.user}</p></div>
              <div><p style={{ fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: "0.25rem" }}>Fecha límite</p><p style={{ fontWeight: 600 }}>{selectedTask.date}</p></div>
            </div>
            <div style={{ padding: "1.25rem", background: "var(--bg-secondary)", borderRadius: "10px", border: "1px solid var(--border-color)", fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {selectedTask.fullDesc}
            </div>
          </div>
        </div>
      )}

      <DragOverlay dropAnimation={{ sideEffects: defaultDropAnimationSideEffects({ styles: { active: { opacity: "0.4" } } }) }}>
        {activeTask ? (
          <div className="task-card" style={{ opacity: 1, cursor: "grabbing", boxShadow: "0 12px 24px rgba(0,0,0,0.1)", border: "1px solid #000" }}>
            <h3 className="task-title" style={{ paddingBottom: "0.25rem", marginBottom: 0 }}>{activeTask.title}</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
                Plazo: <span style={{ color: "var(--text-secondary)", marginLeft: "4px" }}>{activeTask.date}</span>
              </span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", display: "block" }}>
                Asignado a: <span style={{ color: "var(--text-primary)", marginLeft: "4px" }}>{activeTask.user}</span>
              </span>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </div>
  );
}
