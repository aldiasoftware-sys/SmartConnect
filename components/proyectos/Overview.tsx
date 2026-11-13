"use client";

import { Activity, AlertTriangle, CheckCircle2, Hourglass, ShieldCheck, Flag, MessageCircleQuestion, ArrowRight } from "lucide-react";
import { fromISO, shortDate, today } from "@/lib/social";
import { Note, Project, Task, areaRange, daysLeft, expectedProgress, isActiveOn, isLate, progressOf, projectStats } from "@/lib/projects";
import { Bar, Ring } from "./ui";

const MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

type Props = { project: Project; tasks: Task[]; notes: Note[]; openTask: (t: Task) => void; goArea: (a: string) => void; goTab: (t: string) => void };

export default function Overview({ project, tasks, notes, openTask, goArea, goTab }: Props) {
  const t = today();
  const s = projectStats(tasks);
  const exp = expectedProgress(project.start_date, project.end_date);
  const left = daysLeft(project.end_date);
  const areas = project.meta?.areas || [];
  const color = project.color || "var(--brand)";
  const gap = exp == null ? 0 : s.progress - exp;

  const milestones = tasks.filter((x) => x.kind === "hito" && x.status !== "hecho" && x.start_date).sort((a, b) => a.start_date!.localeCompare(b.start_date!)).slice(0, 5);
  const now = tasks.filter((x) => x.kind === "tarea" && (isActiveOn(x) || isLate(x))).sort((a, b) => (a.end_date || "").localeCompare(b.end_date || "")).slice(0, 8);
  const waiting = tasks.filter((x) => x.waiting_on && x.status !== "hecho" && x.status !== "descartado");
  const byWho = waiting.reduce<Record<string, Task[]>>((m, x) => { (m[x.waiting_on!] ||= []).push(x); return m; }, {});
  const questions = notes.filter((n) => n.kind === "pregunta" && !n.resolved);
  const risks = notes.filter((n) => n.kind === "riesgo" && !n.resolved);

  return (
    <div className="animate-in">
      <div className="pj-hero">
        <Ring value={s.progress} size={104} stroke={9} color="#fff" track="rgba(255,255,255,0.14)" />
        <div style={{ minWidth: 0 }}>
          <h3>{s.done} de {s.total} tareas hechas</h3>
          <p>
            {exp == null ? "Sin fechas de proyecto." : gap >= 0
              ? <>Vamos <b style={{ color: "#fff" }}>{gap === 0 ? "al día" : `${gap} puntos por delante`}</b> del calendario (tocaría {exp}% a día de hoy).</>
              : <>Vamos <b style={{ color: "#fff" }}>{-gap} puntos por detrás</b> del calendario: a día de hoy tocaría un {exp}%.</>}
            {s.late > 0 && <> · <b style={{ color: "#ffb4b4" }}>{s.late} con retraso</b></>}
          </p>
          <Bar value={s.progress} color="#fff" expected={exp} />
        </div>
        <div className="pj-hero-dates">
          <b>{left == null ? "—" : left >= 0 ? `${left} días` : `${-left} días tarde`}</b>
          {left != null && left >= 0 ? "para la entrega" : ""}<br />
          {project.start_date && shortDate(project.start_date)} → {project.end_date && shortDate(project.end_date)}
        </div>
      </div>

      <div className="mx-stats">
        {[
          { l: "En curso", v: s.doing, sub: "en curso o en revisión", i: Activity, c: "" },
          { l: "Esperando", v: tasks.filter((x) => x.kind === "tarea" && x.status !== "hecho" && x.status !== "descartado" && (x.waiting_on || x.status === "esperando")).length, sub: Object.keys(byWho).join(" · ") || "no dependemos de nadie", i: Hourglass, c: "warn" },
          { l: "Retrasadas", v: s.late, sub: s.late ? "su fecha de fin ya pasó" : "nada fuera de plazo", i: AlertTriangle, c: s.late ? "bad" : "ok" },
          { l: "Hechas", v: s.done, sub: `de ${s.total} tareas`, i: CheckCircle2, c: "ok" },
        ].map((k) => (
          <div key={k.l} className="mx-stat">
            <div className="mx-stat-top"><span className="mx-stat-label">{k.l}</span><span className={`mx-ico ${k.c}`}><k.i /></span></div>
            <div className="mx-stat-value">{k.v}</div>
            <div className="mx-stat-sub">{k.sub}</div>
          </div>
        ))}
      </div>

      {areas.length > 0 && (
        <>
          <div className="flex justify-between items-center" style={{ margin: "0.5rem 0 0.875rem" }}>
            <h3 className="section-title">Áreas</h3>
            <button className="btn-ghost" onClick={() => goTab("cronograma")}>Ver cronograma <ArrowRight style={{ width: 15, height: 15 }} /></button>
          </div>
          <div className="pj-areas" style={{ marginBottom: "1.75rem" }}>
            {areas.map((a) => {
              const own = tasks.filter((x) => x.area === a.name);
              const real = own.filter((x) => x.kind === "tarea" && x.status !== "descartado");
              const p = progressOf(own);
              const r = areaRange(a, own);
              const e = expectedProgress(r.start, r.end);
              const late = own.filter((x) => isLate(x)).length;
              const state = !r.start ? "Sin fecha" : p >= 100 ? "Terminada" : t < r.start ? `Empieza el ${shortDate(r.start)}` : t > (r.end || t) ? "Fuera de plazo" : "En marcha";
              return (
                <button key={a.name} className="pj-area" onClick={() => goArea(a.name)}>
                  <div className="pj-area-top"><b><i style={{ background: a.color }} />{a.name}</b><span className="text-sm" style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{p}%</span></div>
                  <p>{a.goal}</p>
                  <Bar value={p} color={a.color} expected={e} thin />
                  <div className="pj-area-meta">
                    <span>{real.filter((x) => x.status === "hecho").length}/{real.length} tareas{late ? <b style={{ color: "var(--bad)", marginLeft: 6 }}>· {late} tarde</b> : null}</span>
                    <span>{r.start ? `${shortDate(r.start)} → ${shortDate(r.end!)}` : ""} · {state}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="grid-2-1" style={{ alignItems: "start" }}>
        <div className="flex flex-col gap-4">
          <div className="card">
            <h3 className="section-title" style={{ marginBottom: "0.25rem" }}>Ahora mismo</h3>
            <p className="section-sub" style={{ marginBottom: "0.5rem" }}>Lo que está en su ventana de fechas y lo que va tarde.</p>
            <div className="pj-side-list">
              {now.length === 0 && <div className="empty" style={{ padding: "1.5rem" }}>Nada en marcha hoy.</div>}
              {now.map((x) => {
                const a = areas.find((y) => y.name === x.area);
                return (
                  <div key={x.id} className="pj-side-item" onClick={() => openTask(x)}>
                    <span style={{ width: 8, height: 8, borderRadius: 99, background: a?.color || color, marginTop: 6, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <b>{x.title}</b>
                      <small>{x.area} · {x.owner} · hasta el {x.end_date && shortDate(x.end_date)}{x.waiting_on ? ` · esperando a ${x.waiting_on}` : ""}</small>
                    </div>
                    {isLate(x) ? <span className="chip chip-bad">Tarde</span> : <span className="text-xs text-muted" style={{ fontWeight: 600 }}>{x.progress}%</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {project.meta?.remarks?.length ? (
            <div className="card">
              <h3 className="section-title" style={{ marginBottom: "0.875rem" }}>Principios del proyecto</h3>
              <div className="pj-remarks">{project.meta.remarks.map((r) => <div key={r}><ShieldCheck />{r}</div>)}</div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <div className="card">
            <h3 className="section-title" style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: 8 }}><Flag style={{ width: 17, height: 17 }} /> Próximos hitos</h3>
            <div className="pj-side-list">
              {milestones.length === 0 && <p className="text-sm text-muted">Sin hitos pendientes.</p>}
              {milestones.map((m) => {
                const d = fromISO(m.start_date!);
                const dl = daysLeft(m.start_date);
                return (
                  <div key={m.id} className="pj-side-item" onClick={() => openTask(m)}>
                    <div className="pj-date-box"><b>{d.getDate()}</b><small>{MES[d.getMonth()]}</small></div>
                    <div><b>{m.title}</b><small style={{ color: dl != null && dl < 0 ? "var(--bad)" : undefined }}>{dl == null ? "" : dl === 0 ? "hoy" : dl > 0 ? `en ${dl} días` : `hace ${-dl} días`} · {m.area}</small></div>
                  </div>
                );
              })}
            </div>
          </div>

          {Object.keys(byWho).length > 0 && (
            <div className="card">
              <h3 className="section-title" style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: 8 }}><Hourglass style={{ width: 17, height: 17 }} /> Esperando a…</h3>
              <div className="pj-side-list">
                {Object.entries(byWho).map(([who, xs]) => (
                  <div key={who} style={{ padding: "0.6rem 0", borderBottom: "1px solid var(--border-color)" }}>
                    <div className="flex justify-between" style={{ marginBottom: 4 }}><b className="text-sm">{who}</b><span className="count-badge">{xs.length}</span></div>
                    {xs.map((x) => <div key={x.id} className="text-xs text-secondary" style={{ cursor: "pointer", padding: "2px 0" }} onClick={() => openTask(x)}>· {x.title}</div>)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(questions.length > 0 || risks.length > 0) && (
            <div className="card">
              <h3 className="section-title" style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: 8 }}><MessageCircleQuestion style={{ width: 17, height: 17 }} /> Por resolver</h3>
              <div className="pj-side-list">
                {[...questions, ...risks].slice(0, 7).map((n) => (
                  <div key={n.id} className="pj-side-item" onClick={() => goTab("notas")}>
                    <span className={`chip ${n.kind === "riesgo" ? "chip-bad" : ""}`} style={n.kind === "pregunta" ? { background: "var(--warn-soft)", color: "var(--warn)" } : undefined}>{n.kind === "riesgo" ? "Riesgo" : "Pregunta"}</span>
                    <b style={{ fontWeight: 500 }}>{n.title || n.body.slice(0, 80)}</b>
                  </div>
                ))}
              </div>
              {questions.length + risks.length > 7 && <button className="btn-ghost" style={{ marginTop: 8 }} onClick={() => goTab("notas")}>Ver las {questions.length + risks.length} <ArrowRight style={{ width: 14, height: 14 }} /></button>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
