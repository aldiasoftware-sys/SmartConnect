"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Wand2, CalendarCheck } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSocial } from "@/lib/SocialContext";
import {
  ACCOUNTS, DIAGNOSTICS_TO_VALIDATE, DIAS, KINDS, OPEN_OFFER, OWN_CHANNELS, Offer, PLATFORMS, Person, SAAS_REPEAT, TARGETS,
  addDays, contentByWeek, fmt, followerSeries, fromISO, hoursWaiting, latestFollowers, patterns, shortDate, statusOf, today, weekLabel, weekNumber, weekRange, weekStart,
} from "@/lib/social";
import { listRows } from "@/lib/store";
import { loadWeekTemplate } from "@/lib/content";
import { useScope } from "@/lib/ScopeContext";

type Meeting = { id: string; nombre_reunion: string; fecha_reunion: string; origen?: string };

export default function EstaSemanaPage() {
  const { snapshots, posts: allPosts, refresh, loading, pending: checkinPending, openCheckin } = useSocial();
  const { me, scope, inScope } = useScope();
  const posts = allPosts.filter((p) => inScope(p.owner));
  const accounts = scope === "yo" && me ? ACCOUNTS.filter((a) => a.platform === "tiktok" || a.id === me.linkedin) : ACCOUNTS;
  const [people, setPeople] = useState<Person[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listRows<Person>("community_people").then(setPeople);
    listRows<Offer>("offers").then(setOffers);
    supabase.from("reuniones").select("id,nombre_reunion,fecha_reunion,origen").gte("fecha_reunion", new Date().toISOString()).order("fecha_reunion").limit(4)
      .then(({ data }) => setMeetings((data as Meeting[]) || []));
  }, []);

  const w = weekStart(), t = today();
  const days = Array.from({ length: 5 }, (_, i) => addDays(w, i));
  const weekPosts = posts.filter((p) => p.publish_date && p.publish_date >= w && p.publish_date <= addDays(w, 6));
  const c = contentByWeek(posts, [w])[0];

  // embudo del roadmap: atraer · capturar · nutrir · convertir · SaaS
  const weeks = weekRange(snapshots.map((s) => s.week_start), w);
  const { total } = followerSeries(snapshots, weeks, accounts);
  const followers = total[total.length - 1] || 0;
  const delta = total.length > 1 ? total[total.length - 1] - total[total.length - 2] : 0;
  const newLeads = people.filter((p) => (p.created_at || "").slice(0, 10) >= w).length;
  const contacts = people.filter((p) => p.kind === "contacto").length;
  const openOffers = offers.filter(OPEN_OFFER);
  const diagnostics = offers.filter((o) => ["diagnostico", "propuesta", "negociacion", "ganada"].includes(o.status)).length;
  const topPattern = patterns(offers)[0];
  const waiting = people.filter((p) => p.pending_reply).sort((a, b) => hoursWaiting(b) - hoursWaiting(a));
  const nextSteps = offers.filter((o) => OPEN_OFFER(o) && o.next_date).sort((a, b) => a.next_date!.localeCompare(b.next_date!)).slice(0, 4);

  const funnel = [
    { n: "01", l: "Atraer", v: snapshots.length ? fmt(followers) : "—", s: snapshots.length ? `seguidores · ${delta >= 0 ? "+" : ""}${fmt(delta)} esta semana` : "haz el check-in de seguidores", href: "/redes" },
    { n: "02", l: "Capturar", v: String(newLeads), s: `leads nuevos esta semana · ${people.filter((p) => p.kind === "lead").length} en total`, href: "/comunidad" },
    { n: "03", l: "Nutrir", v: String(contacts), s: `contactos con los que ya hablamos · ${people.filter((p) => p.kind === "cliente").length} clientes`, href: "/comunidad" },
    { n: "04", l: "Convertir", v: String(openOffers.length), s: `ofertas abiertas · ${diagnostics}/${DIAGNOSTICS_TO_VALIDATE} diagnósticos`, href: "/ofertas" },
    { n: "05", l: "Operación SaaS", v: topPattern ? `${topPattern.clients}/${SAAS_REPEAT}` : "—", s: topPattern ? `«${topPattern.pattern}» se repite` : "sin patrones todavía", href: "/ofertas" },
  ];

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <div className="eyebrow">Semana {weekNumber(w)} · {weekLabel(w)}</div>
          <h2 className="page-title">Esta semana</h2>
          <p className="page-subtitle">Cada vídeo debe llevar a alguien un paso más cerca de hablar con ALDIA.</p>
        </div>
        {checkinPending && <button className="btn-primary" onClick={() => openCheckin()}><CalendarCheck style={{ width: 17, height: 17 }} /> Hacer el check-in</button>}
      </div>

      <div className="funnel" style={{ marginBottom: "1.25rem" }}>
        {funnel.map((f) => (
          <Link key={f.n} href={f.href} style={{ color: "inherit", textDecoration: "none" }}>
            <div className="eyebrow" style={{ marginBottom: 0 }}>{f.n} · {f.l}</div>
            <b>{f.v}</b>
            <small>{f.s}</small>
          </Link>
        ))}
      </div>

      <div className="grid-2-1" style={{ marginBottom: "1.25rem" }}>
        <div className="card">
          <div className="flex justify-between items-start" style={{ marginBottom: "1rem", gap: "1rem" }}>
            <div>
              <h3 className="section-title">Contenido de la semana</h3>
              <p className="section-sub">Mínimo 3 TikToks y 2 posts de LinkedIn; como mucho una publicación al día por red.</p>
            </div>
            <div className="flex gap-2">
              <span className={`chip ${c.tiktok >= TARGETS.tiktok ? "chip-ok" : ""}`}>TikTok {c.tiktok}/{TARGETS.tiktok}</span>
              <span className={`chip ${c.linkedin >= TARGETS.linkedin ? "chip-ok" : ""}`}>LinkedIn {c.linkedin}/{TARGETS.linkedin}</span>
              {c.failed > 0 && <span className="chip chip-bad">{c.failed} sin publicar</span>}
            </div>
          </div>
          {loading ? <div className="empty" style={{ padding: "2rem 1rem" }}>Cargando…</div> : weekPosts.length === 0 ? (
            <div className="empty" style={{ padding: "2rem 1rem" }}>
              No hay nada en el calendario esta semana.
              <button className="btn-primary" disabled={busy} onClick={async () => { setBusy(true); await loadWeekTemplate(w, posts); await refresh(); setBusy(false); }} style={{ marginTop: 8 }}>
                <Wand2 style={{ width: 16, height: 16 }} /> Cargar la semana tipo
              </button>
            </div>
          ) : (
            <div className="week-board" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
              {days.map((d, i) => (
                <div key={d} className={`day-col ${d === t ? "today" : ""}`} style={{ minHeight: 140 }}>
                  <div className="day-head"><b>{DIAS[i]}</b><span>{fromISO(d).getDate()}</span></div>
                  {weekPosts.filter((p) => p.publish_date === d).map((p) => {
                    const st = statusOf(p.status); const failed = p.status !== "publicado" && d < t;
                    return (
                      <Link key={p.id} href="/contenido" className={`post-card ${failed ? "failed" : ""} ${p.status === "publicado" ? "done" : ""}`} style={{ borderLeftColor: PLATFORMS[p.platform]?.color, textDecoration: "none" }}>
                        <div className="pc-top"><span>{PLATFORMS[p.platform]?.label}</span></div>
                        <div className="pc-title">{KINDS[p.kind || ""] || p.title}</div>
                        <span className="st-dot" style={{ marginTop: 4 }}><i style={{ background: failed ? "var(--bad)" : st.color }} />{failed ? "Sin publicar" : st.label}</span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
          <Link href="/contenido" className="btn-secondary" style={{ marginTop: "1rem", textDecoration: "none" }}>Abrir el calendario <ArrowRight style={{ width: 15, height: 15 }} /></Link>
        </div>

        <div className="flex flex-col gap-3">
          <div className="card">
            <h3 className="section-title" style={{ marginBottom: 4 }}>Responder en 24 h</h3>
            <p className="section-sub" style={{ marginBottom: "0.75rem" }}>{waiting.length ? `${waiting.length} ${waiting.length === 1 ? "persona espera" : "personas esperan"} respuesta.` : "Nadie espera respuesta. Bien."}</p>
            {waiting.slice(0, 4).map((p) => { const h = hoursWaiting(p); return (
              <div key={p.id} className="flex justify-between text-sm" style={{ padding: "0.3rem 0" }}>
                <span className="font-semibold">{p.name} <span className="text-muted font-medium">· {p.origin}</span></span>
                <span style={{ color: h > 24 ? "var(--bad)" : "var(--text-muted)", fontWeight: 700 }}>{h < 24 ? `${Math.floor(h)} h` : `${Math.floor(h / 24)} d`}</span>
              </div>
            ); })}
            {waiting.length > 0 && <Link href="/comunidad" className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Ir a comunidad →</Link>}
          </div>
          <div className="card">
            <h3 className="section-title" style={{ marginBottom: "0.75rem" }}>Lo siguiente</h3>
            {nextSteps.length === 0 && meetings.length === 0 && <p className="section-sub">Sin reuniones ni pasos con fecha.</p>}
            {meetings.map((m) => (
              <div key={m.id} className="flex justify-between text-sm" style={{ padding: "0.3rem 0", gap: 8 }}>
                <span className="font-semibold">{m.nombre_reunion}</span>
                <span className="text-muted">{shortDate(m.fecha_reunion.slice(0, 10))} · reunión</span>
              </div>
            ))}
            {nextSteps.map((o) => (
              <div key={o.id} className="flex justify-between text-sm" style={{ padding: "0.3rem 0", gap: 8 }}>
                <span><b>{o.client}</b> <span className="text-secondary">· {o.next_step || "seguimiento"}</span></span>
                <span style={{ color: o.next_date! < t ? "var(--bad)" : "var(--text-muted)", whiteSpace: "nowrap" }}>{shortDate(o.next_date!)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid-3">
        <div className="card dark-card">
          <div className="eyebrow">Súper importante</div>
          <p style={{ fontSize: "1rem", fontWeight: 600, lineHeight: 1.45 }}>Más que el contenido, importa la conversación con la comunidad. Si no les das de comer, no ponen huevos.</p>
        </div>
        <div className="quote"><div className="eyebrow">Producir en lotes</div><p>Fin de semana: grabar y preparar todo. De lunes a viernes: subir, cuidar la comunidad y pensar el siguiente lote. Nunca más de una hora al día.</p></div>
        <div className="quote"><div className="eyebrow">Cada detalle cuenta</div><p>Cualquier comentario, like o repost puede ser un futuro cliente o alumno. Apúntalo en Comunidad.</p></div>
      </div>
    </div>
  );
}
