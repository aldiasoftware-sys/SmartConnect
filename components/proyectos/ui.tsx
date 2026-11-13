"use client";

import { Check, Hourglass } from "lucide-react";
import { PROJECT_STATUSES, ProjectStatus, Task, taskStatus } from "@/lib/projects";

/** Anillo de progreso. */
export function Ring({ value, size = 64, stroke = 6, color = "var(--brand)", track = "var(--bg-surface)", label }: { value: number; size?: number; stroke?: number; color?: string; track?: string; label?: string }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  return (
    <div className="pj-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.max(0, Math.min(100, value)) / 100)} style={{ transition: "stroke-dashoffset 0.6s cubic-bezier(0.2,0.7,0.2,1)" }} />
      </svg>
      <b style={{ fontSize: size > 90 ? "1.5rem" : undefined }}>{label ?? `${value}%`}</b>
    </div>
  );
}

/** Barra de progreso; `expected` pinta una marca con lo que tocaría a fecha de hoy. */
export function Bar({ value, color = "var(--brand)", expected, thin }: { value: number; color?: string; expected?: number | null; thin?: boolean }) {
  return (
    <div className={`pj-bar ${thin ? "thin" : ""}`} title={expected != null ? `Hecho ${value}% · tocaría ${expected}% a día de hoy` : `${value}%`}>
      <span style={{ width: `${value}%`, background: color }} />
      {expected != null && expected > 0 && expected < 100 && <em style={{ left: `${expected}%` }} />}
    </div>
  );
}

export function ProjectPill({ status }: { status: ProjectStatus }) {
  const s = PROJECT_STATUSES[status] || PROJECT_STATUSES.planificado;
  return <span className="pj-pill" style={{ background: s.soft, color: s.color }}><i />{s.label}</span>;
}

export function TaskPill({ status }: { status: string }) {
  const s = taskStatus(status);
  return <span className="pj-pill" style={{ background: s.soft, color: s.color }}><i />{s.label}</span>;
}

/** Círculo de estado: clic = hecha / pendiente. Un hito se pinta como rombo. */
export function TaskCheck({ task, color, onToggle }: { task: Task; color?: string; onToggle: () => void }) {
  if (task.kind === "hito") {
    return (
      <button type="button" className="pj-check" style={{ border: "none", background: "none" }} onClick={(e) => { e.stopPropagation(); onToggle(); }} title="Hito: clic para marcarlo cumplido">
        <span className="pj-diamond" style={{ background: task.status === "hecho" ? "var(--ok)" : color || "var(--ink)" }} />
      </button>
    );
  }
  const done = task.status === "hecho";
  const wait = task.status === "esperando";
  const half = !done && (task.status === "en_curso" || task.status === "revision" || task.progress > 0);
  return (
    <button type="button" className={`pj-check ${done ? "on" : half ? "half" : wait ? "wait" : ""}`}
      style={half ? ({ "--pj-p": `${Math.max(10, task.progress)}%` } as React.CSSProperties) : undefined}
      onClick={(e) => { e.stopPropagation(); onToggle(); }} title={done ? "Marcar como pendiente" : "Marcar como hecha"}>
      {done ? <Check /> : wait ? <Hourglass style={{ color: "var(--warn)", width: 11, height: 11 }} /> : null}
    </button>
  );
}
