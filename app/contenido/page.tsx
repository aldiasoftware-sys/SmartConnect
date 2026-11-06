"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Wand2, HardDrive, AlertTriangle } from "lucide-react";
import { useSocial } from "@/lib/SocialContext";
import { DIAS, KINDS, PLATFORMS, Post, STATUSES, TARGETS, addDays, contentByWeek, fromISO, shortDate, statusOf, today, weekLabel, weekNumber, weekStart } from "@/lib/social";
import { loadWeekTemplate } from "@/lib/content";
import PostEditor from "@/components/PostEditor";
import { useScope } from "@/lib/ScopeContext";

const blank = (date: string | null, platform = "tiktok"): Post => ({ publish_date: date, platform, kind: platform === "tiktok" ? "noticia" : "post", owner: "Aldia", title: "", status: "idea" });

function Target({ label, done, planned, target }: { label: string; done: number; planned: number; target: number }) {
  const slots = Math.max(target, planned);
  return (
    <div className="target">
      <span style={{ width: 74, fontSize: "0.8125rem", fontWeight: 600 }}>{label}</span>
      <div className="bar">{Array.from({ length: slots }, (_, i) => <i key={i} className={i < done ? "on" : ""} style={i >= target ? { opacity: 0.5 } : undefined} />)}</div>
      <span style={{ fontSize: "0.8125rem", fontWeight: 600, minWidth: 92, textAlign: "right", color: done >= target ? "var(--ok)" : "var(--text-secondary)" }}>{done}/{target} publicados</span>
    </div>
  );
}

export default function ContenidoPage() {
  const { posts: allPosts, refresh, local, loading } = useSocial();
  const { me, isMine } = useScope();
  // en el calendario cada uno ve lo que le toca subir (lo suyo y lo de la cuenta conjunta sin dueño)
  const posts = allPosts.filter((p) => isMine(p.owner));
  const [week, setWeek] = useState(weekStart());
  const [editing, setEditing] = useState<Post | null>(null);
  const [busy, setBusy] = useState(false);
  const t = today();

  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const weekPosts = posts.filter((p) => p.publish_date && p.publish_date >= week && p.publish_date <= days[6]);
  const stats = contentByWeek(posts, [week])[0];
  const planned = (pl: string) => weekPosts.filter((p) => p.platform === pl).length;
  // regla: 1 publicación al día por red como máximo
  const crowded = days.flatMap((d) => ["tiktok", "linkedin"].filter((pl) => weekPosts.filter((p) => p.publish_date === d && p.platform === pl).length > 1).map((pl) => `${DIAS[days.indexOf(d)]} (${PLATFORMS[pl].label})`));

  async function template() {
    setBusy(true); await loadWeekTemplate(week, posts); await refresh(); setBusy(false);
  }

  const card = (p: Post) => {
    const st = statusOf(p.status); const failed = p.status !== "publicado" && !!p.publish_date && p.publish_date < t;
    return (
      <button key={p.id} className={`post-card ${failed ? "failed" : ""} ${p.status === "publicado" ? "done" : ""}`} style={{ borderLeftColor: PLATFORMS[p.platform]?.color }} onClick={() => setEditing(p)}>
        <div className="pc-top"><span>{PLATFORMS[p.platform]?.label} · {KINDS[p.kind || ""] || p.kind}</span>{p.owner && p.owner !== "Aldia" && <span>{p.owner}</span>}</div>
        <div className="pc-title">{p.title}</div>
        <div className="flex items-center justify-between" style={{ marginTop: 6, gap: 6 }}>
          <span className="st-dot"><i style={{ background: failed ? "var(--bad)" : st.color }} />{failed ? "Sin publicar" : st.label}</span>
          {p.keyword && <span className="chip" style={{ fontSize: 10, padding: "1px 7px" }}>{p.keyword}</span>}
        </div>
      </button>
    );
  };

  return (
    <div className="page-wrapper" style={{ maxWidth: 1600 }}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Rutina de contenido</div>
          <h2 className="page-title">Contenido</h2>
          <p className="page-subtitle">{me ? <>Lo que te toca subir a ti, <b>{me.name}</b>, y lo de la cuenta conjunta.</> : "Qué se publica y cuándo."} Grabamos en lote el fin de semana y publicamos cada día.</p>
        </div>
        <div className="flex gap-3 items-center">
          <button className="btn-secondary" onClick={template} disabled={busy || loading}><Wand2 style={{ width: 16, height: 16 }} /> Cargar semana tipo</button>
          <button className="btn-primary" onClick={() => setEditing(blank(t >= week && t <= days[6] ? t : week))}><Plus style={{ width: 17, height: 17 }} /> Nueva pieza</button>
        </div>
      </div>

      {local && <div className="banner"><HardDrive /><div><b>El contenido se está guardando solo en este navegador.</b> Ejecuta <code>redes_setup.sql</code> en Supabase para compartirlo; lo que haya aquí se sube solo.</div></div>}

      <div style={{ marginBottom: "1.25rem" }}>
        <div className="card">
          <div className="flex items-center justify-between" style={{ marginBottom: "1.25rem" }}>
            <div className="flex items-center gap-2">
              <button className="icon-btn" onClick={() => setWeek(addDays(week, -7))} aria-label="Semana anterior"><ChevronLeft /></button>
              <div style={{ minWidth: 190, textAlign: "center" }}><b>Semana {weekNumber(week)}</b> <span className="text-muted text-sm">· {weekLabel(week)}</span></div>
              <button className="icon-btn" onClick={() => setWeek(addDays(week, 7))} aria-label="Semana siguiente"><ChevronRight /></button>
              {week !== weekStart() && <button className="btn-secondary" style={{ padding: "0.45rem 0.8rem" }} onClick={() => setWeek(weekStart())}>Hoy</button>}
            </div>
            <div className="flex gap-2">
              {STATUSES.map((s) => { const n = weekPosts.filter((p) => p.status === s.id).length; return n ? <span key={s.id} className="chip"><i style={{ background: s.color }} />{s.label} {n}</span> : null; })}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <Target label="TikTok" done={stats.tiktok} planned={planned("tiktok")} target={TARGETS.tiktok} />
            <Target label="LinkedIn" done={stats.linkedin} planned={planned("linkedin")} target={TARGETS.linkedin} />
          </div>
          {(stats.failed > 0 || crowded.length > 0) && (
            <div className="flex gap-2" style={{ marginTop: "1rem", flexWrap: "wrap" }}>
              {stats.failed > 0 && <span className="chip chip-bad"><AlertTriangle style={{ width: 13, height: 13 }} /> {stats.failed} sin publicar a su día</span>}
              {crowded.length > 0 && <span className="chip chip-bad">Más de una publicación el {crowded.join(", ")}: máximo una al día por red</span>}
            </div>
          )}
        </div>
      </div>

      <div className="week-board" style={{ marginBottom: "1.5rem" }}>
        {days.map((d, i) => (
          <div key={d} className={`day-col ${d === t ? "today" : ""} ${i >= 5 ? "weekend" : ""}`}>
            <div className="day-head"><b>{DIAS[i]}</b><span>{fromISO(d).getDate()}</span></div>
            {i >= 5 && (
              <div className="day-off">
                <b>{i === 5 ? "Día de grabación" : "Planteamiento de la semana"}</b>
                <span>{i === 5 ? "Se graba en lote todo lo de la semana." : "Se decide qué se publica de lunes a viernes."}</span>
              </div>
            )}
            {weekPosts.filter((p) => p.publish_date === d).sort((a, b) => a.platform.localeCompare(b.platform)).map(card)}
            {i < 5 && <button className="add-slot" onClick={() => setEditing(blank(d, i === 4 ? "linkedin" : "tiktok"))}>+ Añadir</button>}
          </div>
        ))}
      </div>

      {editing && <PostEditor post={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}
