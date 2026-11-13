"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, HardDrive, ArrowLeft, LayoutDashboard, ListChecks, GanttChart, StickyNote, ShieldCheck, Settings2, FolderKanban, AlertTriangle, Flag, Activity } from "lucide-react";
import { addDays, daysBetween, fromISO, shortDate, today } from "@/lib/social";
import { deleteRow, listRows, saveRow, tableMode } from "@/lib/store";
import { useScope } from "@/lib/ScopeContext";
import {
  Matrix, Note, Project, Task, TaskStatus, blankProject, blankTask, daysLeft, expectedProgress, isLate, projectStats,
} from "@/lib/projects";
import { Bar, ProjectPill, Ring } from "@/components/proyectos/ui";
import Overview from "@/components/proyectos/Overview";
import TasksView from "@/components/proyectos/TasksView";
import Timeline from "@/components/proyectos/Timeline";
import NotesView from "@/components/proyectos/NotesView";
import MatrixView from "@/components/proyectos/MatrixView";
import TaskDialog from "@/components/proyectos/TaskDialog";
import ProjectDialog from "@/components/proyectos/ProjectDialog";

type Tab = "resumen" | "tareas" | "cronograma" | "notas" | "roles";

function readUrl() {
  if (typeof window === "undefined") return { p: "", t: "resumen" as Tab };
  const sp = new URLSearchParams(window.location.search);
  return { p: sp.get("p") || "", t: (sp.get("t") as Tab) || "resumen" };
}

export default function ProyectosPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [local, setLocal] = useState(false);
  const [sel, setSel] = useState("");
  const [tab, setTab] = useState<Tab>("resumen");
  const [area, setArea] = useState("Todas");
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const { me } = useScope();
  const author = me?.name || "Equipo";

  const load = useCallback(async () => {
    setLocal((await tableMode("projects")) === "local");
    const [p, t, n] = await Promise.all([
      listRows<Project>("projects", "sort"), listRows<Task>("project_tasks", "sort"), listRows<Note>("project_notes", "created_at"),
    ]);
    setProjects(p); setTasks(t); setNotes(n); setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  // la URL guarda el proyecto y la pestaña (?p=…&t=…) para poder compartir el enlace y usar «atrás»
  useEffect(() => {
    const sync = () => { const u = readUrl(); setSel(u.p); setTab(u.t); };
    sync(); window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  const go = (p: string, t: Tab = "resumen") => {
    setSel(p); setTab(t); if (t !== "tareas") setArea("Todas");
    window.history.pushState(null, "", p ? `/proyectos?p=${p}${t !== "resumen" ? `&t=${t}` : ""}` : "/proyectos");
    window.scrollTo({ top: 0 });
  };

  const project = projects.find((p) => p.id === sel) || null;
  const pTasks = useMemo(() => tasks.filter((t) => t.project_id === sel), [tasks, sel]);
  const pNotes = useMemo(() => notes.filter((n) => n.project_id === sel), [notes, sel]);

  // ---------- guardar (optimista: se ve al momento y se guarda detrás)
  async function saveTask(t: Task) {
    const row = { ...t, done_at: t.status === "hecho" ? t.done_at || new Date().toISOString() : null };
    if (t.id) setTasks((c) => c.map((x) => (x.id === t.id ? row : x)));
    try {
      const saved = await saveRow<Task>("project_tasks", { ...row, sort: row.sort ?? tasks.length + 1 });
      setTasks((c) => (t.id ? c.map((x) => (x.id === saved.id ? saved : x)) : [...c, saved]));
    } catch (e) { alert(`No se pudo guardar la tarea: ${(e as Error).message}`); load(); }
  }
  async function removeTask(id: string) { setTasks((c) => c.filter((x) => x.id !== id)); await deleteRow("project_tasks", id); }
  async function saveNote(n: Note) {
    if (n.id) setNotes((c) => c.map((x) => (x.id === n.id ? n : x)));
    try {
      const saved = await saveRow<Note>("project_notes", { ...n, author: n.author || author });
      setNotes((c) => (n.id ? c.map((x) => (x.id === saved.id ? saved : x)) : [...c, saved]));
    } catch (e) { alert(`No se pudo guardar la nota: ${(e as Error).message}`); load(); }
  }
  async function removeNote(id: string) { setNotes((c) => c.filter((x) => x.id !== id)); await deleteRow("project_notes", id); }
  async function saveProject(p: Project, renamed: Record<string, string> = {}) {
    const saved = await saveRow<Project>("projects", { ...p, updated_at: new Date().toISOString(), sort: p.sort ?? projects.length + 1 });
    // si se renombra un área, sus tareas la siguen
    for (const [from, to] of Object.entries(renamed)) {
      for (const t of tasks.filter((x) => x.project_id === saved.id && x.area === from)) await saveRow<Task>("project_tasks", { ...t, area: to });
    }
    setEditingProject(null);
    await load();
    if (!p.id && saved.id) go(saved.id);
  }
  async function removeProject(p: Project) {
    for (const n of notes.filter((x) => x.project_id === p.id)) await deleteRow("project_notes", n.id!);
    for (const t of tasks.filter((x) => x.project_id === p.id)) await deleteRow("project_tasks", t.id!);
    await deleteRow("projects", p.id!);
    setEditingProject(null); go(""); load();
  }
  const saveMatrix = async (m: Matrix) => { if (project) { const saved = await saveRow<Project>("projects", { ...project, meta: { ...(project.meta || {}), matrix: m } }); setProjects((c) => c.map((x) => (x.id === saved.id ? saved : x))); } };

  const newTask = (a?: string, status?: TaskStatus) => project && setEditingTask({ ...blankTask(project.id!, a), ...(status ? { status } : {}) });

  const dialogs = (
    <>
      {editingTask && (
        <TaskDialog task={editingTask} areas={(projects.find((p) => p.id === editingTask.project_id)?.meta?.areas) || []} notes={notes}
          onClose={() => setEditingTask(null)}
          onSave={async (t) => { await saveTask(t); setEditingTask(null); }}
          onDelete={editingTask.id ? async () => { await removeTask(editingTask.id!); setEditingTask(null); } : undefined}
          onAddNote={saveNote} />
      )}
      {editingProject && (
        <ProjectDialog project={editingProject} onClose={() => setEditingProject(null)} onSave={saveProject}
          onDelete={editingProject.id ? () => removeProject(editingProject) : undefined} />
      )}
    </>
  );

  const banner = local && (
    <div className="banner"><HardDrive /><div><b>Los proyectos se están guardando solo en este navegador.</b> Ejecuta <code>proyectos_setup.sql</code> en Supabase para compartirlos (y cargar el plan de F&T); lo que haya aquí se sube solo.</div></div>
  );

  // =============================================== FICHA DE UN PROYECTO
  if (sel && project) {
    const s = projectStats(pTasks);
    const openQ = pNotes.filter((n) => (n.kind === "pregunta" || n.kind === "riesgo") && !n.resolved).length;
    const TABS: { id: Tab; label: string; icon: typeof LayoutDashboard; count?: number }[] = [
      { id: "resumen", label: "Resumen", icon: LayoutDashboard },
      { id: "tareas", label: "Tareas", icon: ListChecks, count: s.total - s.done },
      { id: "cronograma", label: "Cronograma", icon: GanttChart },
      { id: "notas", label: "Notas", icon: StickyNote, count: openQ || undefined },
      ...(project.meta?.matrix ? [{ id: "roles" as Tab, label: "Roles", icon: ShieldCheck }] : []),
    ];
    return (
      <div className="page-wrapper" style={{ maxWidth: 1600 }}>
        <button className="pj-back" onClick={() => go("")}><ArrowLeft /> Todos los proyectos</button>
        <div className="page-header" style={{ marginBottom: "1.25rem" }}>
          <div>
            <div className="eyebrow" style={{ color: project.color || undefined }}>{project.client || "Proyecto"}</div>
            <h2 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>{project.name} <ProjectPill status={project.status} /></h2>
            {project.summary && <p className="page-subtitle" style={{ maxWidth: 820 }}>{project.summary}</p>}
          </div>
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setEditingProject(project)}><Settings2 style={{ width: 16, height: 16 }} /> Editar</button>
            <button className="btn-primary" onClick={() => newTask(area !== "Todas" ? area : undefined)}><Plus style={{ width: 16, height: 16 }} /> Tarea</button>
          </div>
        </div>
        {banner}
        <div className="pj-tabs">
          {TABS.map((x) => <button key={x.id} className={tab === x.id ? "on" : ""} onClick={() => go(project.id!, x.id)}><x.icon />{x.label}{x.count ? <small>{x.count}</small> : null}</button>)}
        </div>

        {tab === "resumen" && <Overview project={project} tasks={pTasks} notes={pNotes} openTask={setEditingTask} goTab={(t) => go(project.id!, t as Tab)} goArea={(a) => { go(project.id!, "tareas"); setArea(a); }} />}
        {tab === "tareas" && <TasksView tasks={pTasks} areas={project.meta?.areas || []} area={area} setArea={setArea} openTask={setEditingTask} newTask={newTask} quickSave={saveTask} />}
        {tab === "cronograma" && <Timeline tasks={pTasks} areas={project.meta?.areas || []} openTask={setEditingTask} quickSave={saveTask} />}
        {tab === "notas" && <NotesView projectId={project.id!} notes={pNotes} tasks={pTasks} author={author} save={saveNote} remove={removeNote} openTask={setEditingTask} />}
        {tab === "roles" && project.meta?.matrix && <MatrixView key={project.id} matrix={project.meta.matrix} onChange={saveMatrix} />}
        {dialogs}
      </div>
    );
  }

  // =============================================== PORTADA: TODOS LOS PROYECTOS
  const t = today();
  const live = projects.filter((p) => p.status !== "terminado");
  const openTasks = tasks.filter((x) => x.kind === "tarea" && x.status !== "hecho" && x.status !== "descartado" && live.some((p) => p.id === x.project_id));
  const late = openTasks.filter((x) => isLate(x)).length;
  const upcoming = tasks.filter((x) => x.kind === "hito" && x.status !== "hecho" && x.start_date && x.start_date >= t && x.start_date <= addDays(t, 30))
    .sort((a, b) => a.start_date!.localeCompare(b.start_date!));
  const thisWeek = openTasks.filter((x) => x.start_date && x.start_date <= addDays(t, 6) && (x.end_date || x.start_date) >= t).length;

  // eje común para el cronograma de todos los proyectos
  const dated = projects.filter((p) => p.start_date && p.end_date);
  const minD = [addDays(t, -14), ...dated.map((p) => p.start_date!)].sort()[0];
  const maxD = [addDays(t, 60), ...dated.map((p) => p.end_date!)].sort().reverse()[0];
  const span = Math.max(1, daysBetween(minD, maxD));
  const pc = (d: string) => (daysBetween(minD, d) / span) * 100;
  const months: string[] = [];
  for (let d = fromISO(minD); d <= fromISO(maxD); d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
    if (iso >= minD) months.push(iso);
  }

  return (
    <div className="page-wrapper" style={{ maxWidth: 1600 }}>
      <div className="mx-head">
        <div>
          <div className="eyebrow">Equipo</div>
          <h2>Proyectos <span className="mx-count">{projects.length}</span></h2>
          <p>Cada proyecto con sus áreas, tareas, hitos, cronograma y notas. Sustituye a Planificación.</p>
        </div>
        <div className="mx-head-actions">
          <button className="btn-primary" onClick={() => setEditingProject(blankProject())}><Plus style={{ width: 17, height: 17 }} /> Nuevo proyecto</button>
        </div>
      </div>
      {banner}

      <div className="mx-stats">
        {[
          { l: "Activos", v: live.length, sub: `${projects.length - live.length} terminados`, i: FolderKanban, c: "", hero: true },
          { l: "Tareas abiertas", v: openTasks.length, sub: `${thisWeek} tocan esta semana`, i: Activity, c: "" },
          { l: "Con retraso", v: late, sub: late ? "su fecha de fin ya pasó" : "todo en plazo", i: AlertTriangle, c: late ? "bad" : "ok" },
          { l: "Hitos en 30 días", v: upcoming.length, sub: upcoming[0] ? `${shortDate(upcoming[0].start_date!)} · ${upcoming[0].title}` : "ninguno cerca", i: Flag, c: "warn" },
        ].map((k) => (
          <div key={k.l} className={`mx-stat ${k.hero ? "hero" : ""}`}>
            <div className="mx-stat-top"><span className="mx-stat-label">{k.l}</span><span className={`mx-ico ${k.c}`}><k.i /></span></div>
            <div className="mx-stat-value">{k.v}</div>
            <div className="mx-stat-sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {loading ? <div className="empty">Cargando…</div> : projects.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "3rem 1.5rem" }}>
          <FolderKanban style={{ width: 36, height: 36, color: "var(--text-muted)", margin: "0 auto 0.75rem" }} />
          <h3 className="section-title">Aún no hay proyectos</h3>
          <p className="section-sub" style={{ margin: "0.4rem auto 1.25rem", maxWidth: 460 }}>Ejecuta <code>proyectos_setup.sql</code> en Supabase para cargar el plan de renovación de F&T y lo que había en Planificación, o crea uno nuevo.</p>
          <button className="btn-primary" onClick={() => setEditingProject(blankProject())}><Plus style={{ width: 16, height: 16 }} /> Nuevo proyecto</button>
        </div>
      ) : (
        <>
          <div className="pj-grid" style={{ marginBottom: "1.75rem" }}>
            {projects.map((p) => {
              const own = tasks.filter((x) => x.project_id === p.id);
              const st = projectStats(own);
              const exp = expectedProgress(p.start_date, p.end_date);
              const left = daysLeft(p.end_date);
              const next = own.filter((x) => x.kind === "hito" && x.status !== "hecho" && x.start_date).sort((a, b) => a.start_date!.localeCompare(b.start_date!))[0];
              const areas = p.meta?.areas || [];
              return (
                <button key={p.id} className="pj-card" onClick={() => go(p.id!)} style={{ "--pj-color": p.color || "var(--brand)" } as React.CSSProperties}>
                  <div className="flex justify-between items-start" style={{ gap: "1rem" }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="pj-client">{p.client || "Proyecto"}</div>
                      <h3 style={{ marginTop: 4 }}>{p.name}</h3>
                    </div>
                    <Ring value={st.progress} size={58} stroke={6} color={p.color || "var(--brand)"} />
                  </div>
                  {p.summary && <p style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.summary}</p>}
                  <div>
                    <Bar value={st.progress} color={p.color || "var(--brand)"} expected={exp} />
                    <div className="flex justify-between text-xs text-muted" style={{ marginTop: 6 }}>
                      <span>{st.done}/{st.total} tareas{st.late ? <b style={{ color: "var(--bad)" }}> · {st.late} tarde</b> : null}</span>
                      <span>{exp != null ? `tocaría ${exp}%` : ""}</span>
                    </div>
                  </div>
                  {areas.length > 0 && (
                    <div className="flex" style={{ gap: 3 }}>
                      {areas.map((a) => {
                        const at = own.filter((x) => x.area === a.name && x.kind === "tarea" && x.status !== "descartado");
                        const done = at.length ? at.filter((x) => x.status === "hecho").length / at.length : 0;
                        return <span key={a.name} title={`${a.name} · ${Math.round(done * 100)}%`} style={{ flex: Math.max(1, at.length), height: 6, borderRadius: 99, background: `linear-gradient(90deg, ${a.color} ${done * 100}%, ${a.color}33 ${done * 100}%)` }} />;
                      })}
                    </div>
                  )}
                  <div className="pj-card-foot">
                    <ProjectPill status={p.status} />
                    <span style={{ textAlign: "right" }}>
                      {next ? <>Próximo hito: <b style={{ color: "var(--ink)" }}>{shortDate(next.start_date!)}</b> · </> : null}
                      {left == null ? "Sin fecha" : left >= 0 ? `entrega en ${left} d` : `${-left} d tarde`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {dated.length > 0 && (
            <div className="card">
              <div className="flex justify-between items-center" style={{ marginBottom: "1rem" }}>
                <h3 className="section-title">Cronograma de todos los proyectos</h3>
                <span className="text-xs text-muted">La línea roja es hoy · las marcas, los hitos</span>
              </div>
              <div className="pj-tl-row" style={{ cursor: "default", marginBottom: 4 }}>
                <span />
                <div style={{ position: "relative", height: 16 }}>
                  {months.map((m) => <span key={m} className="text-xs text-muted" style={{ position: "absolute", left: `${pc(m)}%`, textTransform: "capitalize", whiteSpace: "nowrap" }}>{fromISO(m).toLocaleDateString("es-ES", { month: "short" })}</span>)}
                </div>
              </div>
              <div className="pj-timeline-mini">
                {dated.map((p) => {
                  const st = projectStats(tasks.filter((x) => x.project_id === p.id));
                  const ms = tasks.filter((x) => x.project_id === p.id && x.kind === "hito" && x.start_date);
                  return (
                    <div key={p.id} className="pj-tl-row" onClick={() => go(p.id!, "cronograma")}>
                      <b>{p.name}</b>
                      <div className="pj-tl-track">
                        <span style={{ left: `${pc(p.start_date!)}%`, width: `${Math.max(1, pc(p.end_date!) - pc(p.start_date!))}%`, background: p.color || "var(--brand)", opacity: 0.85 }}>
                          <i style={{ width: `${st.progress}%` }} />
                        </span>
                        {ms.map((m) => <em key={m.id} title={`${m.title} · ${shortDate(m.start_date!)}`} style={{ position: "absolute", top: 6, left: `calc(${pc(m.start_date!)}% - 5px)`, width: 10, height: 10, transform: "rotate(45deg)", background: m.status === "hecho" ? "var(--ok)" : "#fff", border: `2px solid ${p.color || "var(--brand)"}`, borderRadius: 2, zIndex: 1 }} />)}
                        <div className="pj-tl-today" style={{ left: `${pc(t)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
      {dialogs}
    </div>
  );
}
