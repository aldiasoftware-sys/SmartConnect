// Proyectos: sustituye a «Planificación». Un proyecto tiene áreas (bloques con su ventana de fechas),
// tareas e hitos dentro de cada área, y una bitácora de notas (decisiones, preguntas, riesgos, reuniones…).
import { addDays, daysBetween, today } from "./social";

export type ProjectStatus = "idea" | "planificado" | "en_curso" | "pausa" | "terminado";
export type TaskStatus = "pendiente" | "en_curso" | "revision" | "esperando" | "hecho" | "descartado";
export type Priority = "alta" | "media" | "baja";
export type NoteKind = "nota" | "decision" | "pregunta" | "riesgo" | "reunion" | "analisis";

export type Area = { name: string; color: string; goal?: string; start?: string; end?: string };
export type MatrixRow = { name: string; desc?: string; cells: string[] };
export type Matrix = { title: string; intro?: string; cols: string[]; rows: MatrixRow[]; foot?: string };
export type ProjectMeta = { areas?: Area[]; remarks?: string[]; matrix?: Matrix; source?: string; people?: string[] };

export type Project = {
  id?: string; name: string; client?: string | null; summary?: string | null; status: ProjectStatus;
  color?: string | null; owner?: string | null; start_date?: string | null; end_date?: string | null;
  sort?: number | null; meta?: ProjectMeta | null; created_at?: string; updated_at?: string;
};
export type Task = {
  id?: string; project_id: string; area?: string | null; kind: "tarea" | "hito"; title: string; detail?: string | null;
  status: TaskStatus; priority: Priority; owner?: string | null; waiting_on?: string | null;
  start_date?: string | null; end_date?: string | null; progress: number; sort?: number | null;
  done_at?: string | null; created_at?: string;
};
export type Note = {
  id?: string; project_id: string; task_id?: string | null; kind: NoteKind; title?: string | null; body: string;
  author?: string | null; resolved?: boolean | null; pinned?: boolean | null; created_at?: string;
};

export const PROJECT_STATUSES: Record<ProjectStatus, { label: string; color: string; soft: string }> = {
  idea: { label: "Idea", color: "#8b95aa", soft: "#ecf0f6" },
  planificado: { label: "Planificado", color: "#6c5ce7", soft: "#e9e6fc" },
  en_curso: { label: "En curso", color: "#1e3a8a", soft: "#e8eefb" },
  pausa: { label: "En pausa", color: "#e8590c", soft: "#fff1e8" },
  terminado: { label: "Terminado", color: "#12a26b", soft: "#e7f7ef" },
};

export const TASK_STATUSES: { id: TaskStatus; label: string; color: string; soft: string }[] = [
  { id: "pendiente", label: "Pendiente", color: "#8b95aa", soft: "#ecf0f6" },
  { id: "en_curso", label: "En curso", color: "#1e3a8a", soft: "#e8eefb" },
  { id: "revision", label: "En revisión", color: "#6c5ce7", soft: "#e9e6fc" },
  { id: "esperando", label: "Esperando", color: "#e8590c", soft: "#fff1e8" },
  { id: "hecho", label: "Hecho", color: "#12a26b", soft: "#e7f7ef" },
  { id: "descartado", label: "Descartado", color: "#b4bccb", soft: "#f4f6fa" },
];
export const taskStatus = (id?: string) => TASK_STATUSES.find((s) => s.id === id) || TASK_STATUSES[0];

export const PRIORITIES: Record<Priority, { label: string; color: string }> = {
  alta: { label: "Alta", color: "#e5484d" },
  media: { label: "Media", color: "#e8590c" },
  baja: { label: "Baja", color: "#8b95aa" },
};

export const NOTE_KINDS: Record<NoteKind, { label: string; color: string; soft: string }> = {
  nota: { label: "Nota", color: "#55607a", soft: "#ecf0f6" },
  decision: { label: "Decisión", color: "#12a26b", soft: "#e7f7ef" },
  pregunta: { label: "Pregunta abierta", color: "#e8590c", soft: "#fff1e8" },
  riesgo: { label: "Riesgo", color: "#e5484d", soft: "#fdecec" },
  reunion: { label: "Reunión", color: "#1e3a8a", soft: "#e8eefb" },
  analisis: { label: "Análisis", color: "#6c5ce7", soft: "#e9e6fc" },
};

export const AREA_PALETTE = ["#1e3a8a", "#12a26b", "#e8590c", "#6c5ce7", "#0a66c2", "#d6336c", "#0b7285", "#a16207", "#55607a"];
export const OWNERS = ["Guille", "Millán", "Ambos"];

const isOpen = (t: Task) => t.status !== "hecho" && t.status !== "descartado";
/** Una tarea hecha cuenta 100; las descartadas no cuentan. */
const effective = (t: Task) => (t.status === "hecho" ? 100 : Math.max(0, Math.min(100, Number(t.progress) || 0)));

export function progressOf(tasks: Task[]) {
  const live = tasks.filter((t) => t.status !== "descartado" && t.kind === "tarea");
  if (!live.length) return 0;
  return Math.round(live.reduce((s, t) => s + effective(t), 0) / live.length);
}

export const isLate = (t: Task, d = today()) => isOpen(t) && !!t.end_date && t.end_date < d;
export const isActiveOn = (t: Task, d = today()) => isOpen(t) && !!t.start_date && !!t.end_date && t.start_date <= d && t.end_date >= d;

export function projectStats(tasks: Task[], d = today()) {
  const real = tasks.filter((t) => t.kind === "tarea" && t.status !== "descartado");
  return {
    total: real.length,
    done: real.filter((t) => t.status === "hecho").length,
    doing: real.filter((t) => t.status === "en_curso" || t.status === "revision").length,
    waiting: real.filter((t) => t.status === "esperando").length,
    late: real.filter((t) => isLate(t, d)).length,
    progress: progressOf(tasks),
  };
}

/** Fechas de un área: las suyas o, si no tiene, las de sus tareas. */
export function areaRange(area: Area, tasks: Task[]) {
  const own = tasks.filter((t) => t.area === area.name);
  const starts = [area.start, ...own.map((t) => t.start_date)].filter(Boolean) as string[];
  const ends = [area.end, ...own.map((t) => t.end_date)].filter(Boolean) as string[];
  return { start: starts.sort()[0] || null, end: ends.sort().reverse()[0] || null };
}

/** Lo esperado a fecha de hoy según el calendario (para comparar con el progreso real). */
export function expectedProgress(start?: string | null, end?: string | null, d = today()) {
  if (!start || !end) return null;
  if (d <= start) return 0;
  if (d >= end) return 100;
  return Math.round((daysBetween(start, d) / Math.max(1, daysBetween(start, end))) * 100);
}

export const daysLeft = (end?: string | null, d = today()) => (end ? daysBetween(d, end) : null);

export const blankTask = (project_id: string, area?: string): Task => ({
  project_id, area: area || null, kind: "tarea", title: "", detail: "", status: "pendiente", priority: "media",
  owner: "Ambos", waiting_on: "", start_date: today(), end_date: addDays(today(), 6), progress: 0,
});
export const blankProject = (): Project => ({
  name: "", client: "", summary: "", status: "planificado", color: "#1e3a8a", owner: "Ambos",
  start_date: today(), end_date: addDays(today(), 30), meta: { areas: [] },
});

export const projectUrl = (id?: string, tab?: string) => `/proyectos?p=${id || ""}${tab ? `&t=${tab}` : ""}`;

/** Fecha y hora cortas de una nota (13 nov · 18:40). */
export function stamp(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getDate()} ${["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][d.getMonth()]} · ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
