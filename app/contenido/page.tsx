"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Wand2, HardDrive, AlertTriangle } from "lucide-react";
import { useSocial } from "@/lib/SocialContext";
import { DIAS, KINDS, PLATFORMS, Post, STATUSES, TARGETS, addDays, contentByWeek, fromISO, shortDate, statusOf, today, weekLabel, weekNumber, weekStart } from "@/lib/social";
import { loadWeekTemplate } from "@/lib/content";
import PostEditor from "@/components/PostEditor";
import AccountsWeek from "@/components/AccountsWeek";
import { useScope } from "@/lib/ScopeContext";
import { TEAM, TeamMember, isShared, ownedBy } from "@/lib/team";

const blank = (date: string | null, platform = "tiktok", owner = "Aldia"): Post => ({ publish_date: date, platform, kind: platform === "tiktok" ? "noticia" : "post", owner, title: "", status: "idea" });

export default function ContenidoPage() {
  const { posts: allPosts, snapshots, openCheckin, refresh, local, loading } = useSocial();
  const { me, scope } = useScope();
  // Un calendario por persona y los dos los ven los dos (con «Solo yo» arriba, solo el tuyo). El tuyo va primero.
  // Lo de Archivos › Alejandro cae solo en el de Millán y lo de Archivos › Guille en el de Guille (lib/contentSync.ts);
  // lo de la cuenta conjunta (sin dueño) sale en los dos.
  const people: TeamMember[] = me ? [me, ...TEAM.filter((m) => m.id !== me.id)] : TEAM;
  const shown = scope === "yo" && me ? [me] : people;
  const posts = allPosts;
  const of = (m: TeamMember) => (list: Post[]) => list.filter((p) => ownedBy(p.owner, m) || isShared(p.owner));
  const [week, setWeek] = useState(weekStart());
  const [editing, setEditing] = useState<Post | null>(null);
  const [busy, setBusy] = useState(false);
  const t = today();

  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const weekPosts = posts.filter((p) => p.publish_date && p.publish_date >= week && p.publish_date <= days[6]);
  // regla: 1 publicación al día por red y persona como máximo
  const crowded = people.flatMap((m) => days.flatMap((d) => ["tiktok", "instagram", "linkedin"].filter((pl) => of(m)(weekPosts).filter((p) => p.publish_date === d && p.platform === pl && !(isShared(p.owner) && p.archivo)).length > 1).map((pl) => `${DIAS[days.indexOf(d)]} de ${m.name} (${PLATFORMS[pl].label})`)));

  async function template() {
    setBusy(true); await loadWeekTemplate(week, posts); await refresh(); setBusy(false);
  }

  const card = (p: Post) => {
    const st = statusOf(p.status); const failed = p.status !== "publicado" && !!p.publish_date && p.publish_date < t;
    // lo de la cuenta conjunta (lo que sale de Archivos › Aldia) ocupa una línea: lo publica cualquiera de los dos
    if (isShared(p.owner) && p.archivo) return (
      <button key={p.id} className={`post-card post-card-mini ${failed ? "failed" : ""} ${p.status === "publicado" ? "done" : ""}`} style={{ borderLeftColor: PLATFORMS[p.platform]?.color }} onClick={() => setEditing(p)} title={p.title}>
        <span className="st-dot"><i style={{ background: failed ? "var(--bad)" : st.color }} /></span>
        <span className="pc-mini">Subir post {PLATFORMS[p.platform]?.label}</span>
      </button>
    );
    return (
      <button key={p.id} className={`post-card ${failed ? "failed" : ""} ${p.status === "publicado" ? "done" : ""}`} style={{ borderLeftColor: PLATFORMS[p.platform]?.color }} onClick={() => setEditing(p)}>
        <div className="pc-top"><span>{PLATFORMS[p.platform]?.label} · {KINDS[p.kind || ""] || p.kind}</span>{isShared(p.owner) && <span>Conjunta</span>}</div>
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
          <p className="page-subtitle">Un calendario para cada uno: lo que sube cada uno a Archivos se pone solo en el suyo. Grabamos en lote el fin de semana y publicamos cada día.</p>
        </div>
        <div className="flex gap-3 items-center">
          <button className="btn-secondary" onClick={template} disabled={busy || loading}><Wand2 style={{ width: 16, height: 16 }} /> Cargar semana tipo</button>
          <button className="btn-primary" onClick={() => setEditing(blank(t >= week && t <= days[6] ? t : week, "tiktok", me?.owner || "Aldia"))}><Plus style={{ width: 17, height: 17 }} /> Nueva pieza</button>
        </div>
      </div>

      {local && <div className="banner"><HardDrive /><div><b>El contenido se está guardando solo en este navegador.</b> Ejecuta <code>redes_setup.sql</code> en Supabase para compartirlo; lo que haya aquí se sube solo.</div></div>}

      <div className="flex items-center justify-between" style={{ marginBottom: "1rem", gap: "1rem", flexWrap: "wrap" }}>
        <div className="flex items-center gap-2">
          <button className="icon-btn" onClick={() => setWeek(addDays(week, -7))} aria-label="Semana anterior"><ChevronLeft /></button>
          <div style={{ minWidth: 190, textAlign: "center" }}><b>Semana {weekNumber(week)}</b> <span className="text-muted text-sm">· {weekLabel(week)}</span></div>
          <button className="icon-btn" onClick={() => setWeek(addDays(week, 7))} aria-label="Semana siguiente"><ChevronRight /></button>
          {week !== weekStart() && <button className="btn-secondary" style={{ padding: "0.45rem 0.8rem" }} onClick={() => setWeek(weekStart())}>Hoy</button>}
        </div>
        {crowded.length > 0 && <span className="chip chip-bad"><AlertTriangle style={{ width: 13, height: 13 }} /> Más de una publicación el {crowded.join(", ")}: máximo una al día por red</span>}
      </div>

      {/* crecimiento de cada cuenta en esta semana (seguidores del check-in) y lo publicado del calendario */}
      <AccountsWeek week={week} posts={posts} snapshots={snapshots} onUpdate={() => openCheckin()} />

      {shown.map((m) => {
        const mine = of(m)(weekPosts), n = (pl: string) => mine.filter((p) => p.platform === pl).length;
        return (
          <section key={m.id} className="cal-person">
            <div className="cal-person-head">
              <span className="mx-avatar">{m.name[0]}</span>
              <div className="mx-grow">
                <div className="mx-title">Calendario de {m.name}{me?.id === m.id && <span className="mx-count" style={{ marginLeft: 10 }}>Tú</span>}</div>
                <div className="mx-meta">Lo que se sube a Archivos › {m.folder} entra aquí solo</div>
              </div>
              <span className="mx-pill">TikTok {n("tiktok")}</span>
              <span className="mx-pill">Instagram {n("instagram")}</span>
              <span className="mx-pill">LinkedIn {n("linkedin")}</span>
            </div>
            <div className="week-board">
              {days.map((d, i) => (
                <div key={d} className={`day-col ${d === t ? "today" : ""} ${i >= 5 ? "weekend" : ""}`}>
                  <div className="day-head"><b>{DIAS[i]}</b><span>{fromISO(d).getDate()}</span></div>
                  {i >= 5 && (
                    <div className="day-off">
                      <b>{i === 5 ? "Día de grabación" : "Planteamiento de la semana"}</b>
                      <span>{i === 5 ? "Se graba en lote todo lo de la semana." : "Se decide qué se publica de lunes a viernes."}</span>
                    </div>
                  )}
                  {mine.filter((p) => p.publish_date === d).sort((a, b) => a.platform.localeCompare(b.platform)).map(card)}
                  {i < 5 && <button className="add-slot" onClick={() => setEditing(blank(d, i === 4 ? "linkedin" : "tiktok", m.owner))}>+ Añadir</button>}
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {editing && <PostEditor post={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}
