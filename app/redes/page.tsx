"use client";

import { useMemo, useState } from "react";
import { Users, TrendingUp, TrendingDown, Target, AlertTriangle, CalendarCheck, Flame, Pencil, Minus, HardDrive } from "lucide-react";
import { useSocial } from "@/lib/SocialContext";
import { ACCOUNTS as ALL_ACCOUNTS, KINDS, addDays, PLATFORMS, TARGETS, contentByWeek, fmt, followerSeries, metMinimum, pct, shortDate, today, weekLabel, weekNumber, weekRange, weekStart } from "@/lib/social";
import { LineChart, PostsBars, Sparkline } from "@/components/SocialCharts";
import AccountIcon from "@/components/AccountIcon";
import { useScope } from "@/lib/ScopeContext";

function Delta({ v, suffix = "" }: { v: number | null; suffix?: string }) {
  if (v === null) return <span className="delta flat"><Minus /> sin datos</span>;
  const cls = v > 0 ? "up" : v < 0 ? "down" : "flat";
  const Icon = v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus;
  return <span className={`delta ${cls}`}><Icon /> {v > 0 ? "+" : ""}{fmt(v)}{suffix}</span>;
}

export default function RedesPage() {
  const { snapshots, posts: everyPost, loading, local, pending, openCheckin } = useSocial();
  const { me, scope, inScope } = useScope();
  const allPosts = everyPost.filter((p) => inScope(p.owner));
  const ACCOUNTS = scope === "yo" && me ? ALL_ACCOUNTS.filter((a) => a.platform === "tiktok" || a.id === me.linkedin) : ALL_ACCOUNTS;
  const [range, setRange] = useState<12 | 26 | 0>(12);

  const data = useMemo(() => {
    const thisWeek = weekStart();
    const allWeeks = weekRange([...snapshots.map((s) => s.week_start), ...allPosts.filter((p) => p.publish_date).map((p) => p.publish_date!)], thisWeek);
    const weeks = range ? allWeeks.slice(-range) : allWeeks;
    const off = allWeeks.length - weeks.length;
    const { series, total } = followerSeries(snapshots, allWeeks, ACCOUNTS);
    // última semana con algún seguidor apuntado
    let li = allWeeks.length - 1;
    while (li > 0 && !snapshots.some((s) => s.week_start === allWeeks[li])) li--;
    const has = snapshots.length > 0;
    const diff = (arr: (number | null)[], back: number) => (li - back >= 0 && arr[li] !== null && arr[li - back] !== null ? (arr[li] as number) - (arr[li - back] as number) : null);

    // publicaciones: salen del calendario de contenido; una semana cumple si llega al mínimo (3 TikToks + 2 LinkedIn)
    const posts = contentByWeek(allPosts, allWeeks);
    const reviewed = posts.filter((p) => p.reviewed && p.planned > 0);
    const last8 = reviewed.slice(-8);
    const planned8 = last8.length;
    const done8 = last8.filter(metMinimum).length;
    const failedAll = reviewed.reduce((s, p) => s + p.failed, 0);
    const monthKey = thisWeek.slice(0, 7);
    const failedMonth = posts.filter((p) => p.week.slice(0, 7) === monthKey).reduce((s, p) => s + p.failed, 0);
    let streak = 0;
    for (let i = reviewed.length - 1; i >= 0 && metMinimum(reviewed[i]); i--) streak++;
    const failedWeeks = reviewed.filter((p) => !metMinimum(p)).length;
    const t = today();
    const fails = allPosts.filter((p) => (p.platform === "tiktok" || p.platform === "linkedin") && p.publish_date && p.publish_date < t && p.status !== "publicado")
      .sort((a, b) => b.publish_date!.localeCompare(a.publish_date!)).slice(0, 6);
    const thisWeekPosts = allPosts.filter((p) => p.publish_date && p.publish_date >= thisWeek && p.publish_date <= addDays(thisWeek, 6));

    return {
      thisWeek, allWeeks, weeks, off, series, total, li, has, diff,
      posts: posts.slice(-Math.min(range || 52, 12)), planned8, done8, failedAll, failedMonth, streak, failedWeeks, fails, thisWeekPosts,
      totalNow: has ? total[li] : 0,
    };
  }, [snapshots, allPosts, range, ACCOUNTS]);

  const d = data;
  const growth4 = d.diff(d.total, 4);
  const growth4pct = growth4 !== null && d.total[d.li - 4] ? Math.round((growth4 / d.total[d.li - 4]) * 1000) / 10 : null;
  const compliance = pct(d.done8, d.planned8);

  return (
    <div className="page-wrapper">
      <div className="page-header">
        <div>
          <h2 className="page-title">Redes sociales</h2>
          <p className="page-subtitle">Cómo crecemos en LinkedIn y TikTok, y si cumplimos la rutina: {TARGETS.tiktok} TikToks y {TARGETS.linkedin} posts de LinkedIn a la semana.</p>
        </div>
        <div className="flex gap-3 items-center">
          <div className="seg">
            {([[12, "12 sem"], [26, "6 meses"], [0, "Todo"]] as const).map(([v, l]) => (
              <button key={l} className={range === v ? "on" : ""} onClick={() => setRange(v)}>{l}</button>
            ))}
          </div>
          <button className="btn-primary" onClick={() => openCheckin()}>
            <CalendarCheck style={{ width: 17, height: 17 }} /> {pending ? "Hacer check-in de la semana" : "Editar esta semana"}
          </button>
        </div>
      </div>

      {local && (
        <div className="banner">
          <HardDrive />
          <div>
            <b>Los datos de redes se están guardando solo en este navegador.</b> Para compartirlos entre los dos, ejecuta <code>redes_setup.sql</code> en el SQL Editor de Supabase:
            en cuanto existan las tablas, lo que hayáis apuntado aquí se sube solo.
          </div>
        </div>
      )}

      {!loading && !d.has && (
        <div className="card" style={{ marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1.5rem", background: "var(--ink)", color: "#fff", border: "none" }}>
          <div>
            <h3 style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Empieza con el primer check-in</h3>
            <p style={{ color: "#b9bcc4", fontSize: "0.875rem" }}>Apunta los seguidores de hoy. Cada lunes la app os lo volverá a preguntar; las publicaciones salen del calendario de contenido.</p>
          </div>
          <button className="btn-secondary" onClick={() => openCheckin()}>Hacer check-in</button>
        </div>
      )}

      {/* KPIs */}
      <div className="grid-4" style={{ marginBottom: "1.25rem" }}>
        <div className="card kpi">
          <div className="kpi-label">Seguidores totales <Users /></div>
          <div className="kpi-value">{fmt(d.totalNow)}</div>
          <div className="kpi-sub"><Delta v={d.diff(d.total, 1)} /> vs. semana anterior</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Crecimiento 4 semanas <TrendingUp /></div>
          <div className="kpi-value">{growth4 === null ? "—" : `${growth4 >= 0 ? "+" : ""}${fmt(growth4)}`}</div>
          <div className="kpi-sub">{growth4pct === null ? "Hacen falta 4 semanas de datos" : <><span className={`delta ${growth4pct >= 0 ? "up" : "down"}`}>{growth4pct >= 0 ? "+" : ""}{growth4pct}%</span> en el último mes</>}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-label">Semanas cumpliendo el mínimo <Target /></div>
          <div className="kpi-value" style={{ color: d.planned8 ? (compliance >= 80 ? "var(--ok)" : compliance >= 50 ? "var(--warn)" : "var(--bad)") : undefined }}>{d.planned8 ? `${compliance}%` : "—"}</div>
          <div className="kpi-sub">{d.planned8 ? `${d.done8} de ${d.planned8} semanas con ${TARGETS.tiktok} TikToks y ${TARGETS.linkedin} LinkedIn` : "Aún no hay semanas cerradas con contenido"}</div>
          {d.planned8 > 0 && <div style={{ height: 6, background: "var(--bg-surface)", borderRadius: 99, marginTop: 12, overflow: "hidden" }}><div style={{ width: `${compliance}%`, height: "100%", background: compliance >= 80 ? "var(--ok)" : compliance >= 50 ? "var(--warn)" : "var(--bad)", borderRadius: 99 }} /></div>}
        </div>
        <div className="card kpi">
          <div className="kpi-label">Piezas sin publicar <AlertTriangle /></div>
          <div className="kpi-value" style={{ color: d.failedAll ? "var(--bad)" : undefined }}>{d.failedAll}</div>
          <div className="kpi-sub">
            <span>{d.failedMonth} este mes · {d.failedWeeks} {d.failedWeeks === 1 ? "semana" : "semanas"} sin llegar al mínimo</span>
          </div>
          <div className="kpi-sub" style={{ marginTop: 8 }}><span className="chip"><Flame style={{ width: 13, height: 13, color: "var(--warn)" }} /> {d.streak} {d.streak === 1 ? "semana" : "semanas"} seguidas cumpliendo</span></div>
        </div>
      </div>

      {/* Cuentas */}
      <div className="grid-3" style={{ marginBottom: "1.25rem" }}>
        {ACCOUNTS.map((a) => {
          const s = d.series[a.id];
          const mine = (p: { platform: string; owner: string | null }) => p.platform === a.platform && (a.platform === "tiktok" || p.owner === a.owner);
          const plan = d.thisWeekPosts.filter(mine);
          const accPosts = contentByWeek(allPosts.filter(mine), d.allWeeks).filter((p) => p.reviewed && p.planned > 0).slice(-8);
          const accPct = pct(accPosts.reduce((x, p) => x + p.published, 0), accPosts.reduce((x, p) => x + p.planned, 0));
          return (
            <div key={a.id} className="card">
              <div className="flex items-center justify-between" style={{ marginBottom: "1.25rem" }}>
                <div className="flex items-center gap-3">
                  <AccountIcon account={a} size={40} />
                  <div><b style={{ fontSize: "0.9375rem" }}>{a.name}</b><div className="section-sub">{a.owner}</div></div>
                </div>
                <Sparkline values={s.slice(d.off)} color={a.color} />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="kpi-value" style={{ fontSize: "1.875rem", marginBottom: 6 }}>{s[d.li] === null || !d.has ? "—" : fmt(s[d.li]!)}</div>
                  <div className="kpi-sub"><Delta v={d.diff(s, 1)} /> esta semana</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="ci-mini">En el calendario</div>
                  <div style={{ fontWeight: 800, fontSize: "1.125rem" }}>{plan.length ? `${plan.filter((p) => p.status === "publicado").length}/${plan.length} ${a.platform === "tiktok" ? "vídeos" : "posts"}` : "—"}</div>
                  <div className="section-sub">{accPosts.length ? `${accPct}% cumplido` : "sin historial"}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Evolución + publicaciones */}
      <div className="grid-2-1" style={{ marginBottom: "1.25rem" }}>
        <div className="card">
          <div className="flex justify-between items-start" style={{ marginBottom: "1.25rem" }}>
            <div><h3 className="section-title">Evolución de seguidores</h3><p className="section-sub">Semana a semana, por cuenta</p></div>
            <div className="flex gap-2" style={{ flexWrap: "wrap", justifyContent: "flex-end" }}>
              {ACCOUNTS.map((a) => <span key={a.id} className="chip"><i style={{ background: a.color }} />{a.name} · {a.owner.split(" ")[0]}</span>)}
            </div>
          </div>
          {d.has ? (
            <LineChart weeks={d.weeks} lines={ACCOUNTS.map((a) => ({ id: a.id, label: `${a.name} · ${a.owner.split(" ")[0]}`, color: a.color, values: d.series[a.id].slice(d.off) }))} height={330} />
          ) : <div className="empty" style={{ height: 240 }}>Aquí verás la curva en cuanto apuntéis la primera semana.</div>}
        </div>

        <div className="card">
          <h3 className="section-title">Publicaciones por semana</h3>
          <p className="section-sub" style={{ marginBottom: "0.5rem" }}>
            <span className="chip" style={{ marginRight: 6 }}><i style={{ background: "#e3e6eb" }} />Planificadas</span>
            <span className="chip" style={{ marginRight: 6 }}><i style={{ background: "var(--ink)" }} />Subidas</span>
            <span className="chip"><i style={{ background: "var(--bad)" }} />Con fallos</span>
          </p>
          {d.posts.some((p) => p.planned) ? <PostsBars rows={d.posts} /> : <div className="empty" style={{ height: 190 }}>Llenad el calendario de contenido para ver si cumplís.</div>}
          {d.fails.length > 0 && (
            <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
              <div className="ci-mini" style={{ textAlign: "left", marginBottom: 8 }}>Últimas piezas sin publicar</div>
              {d.fails.map((f) => (
                <div key={f.id} className="flex items-center justify-between" style={{ fontSize: "0.8125rem", padding: "0.3rem 0", gap: 8 }}>
                  <span className="flex items-center gap-2" style={{ minWidth: 0 }}><i style={{ width: 8, height: 8, borderRadius: 9, background: PLATFORMS[f.platform].color, flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{PLATFORMS[f.platform].label} · {KINDS[f.kind || ""] || f.title}</span></span>
                  <span style={{ color: "var(--bad)", fontWeight: 700, whiteSpace: "nowrap" }}>{shortDate(f.publish_date!)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historial */}
      <div className="table-container">
        <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid var(--border-color)" }}>
          <h3 className="section-title">Historial semanal</h3>
          <p className="section-sub">Pulsa el lápiz para corregir los seguidores de cualquier semana.</p>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Semana</th>
              {ACCOUNTS.map((a) => <th key={a.id}>{a.name} · {a.owner.split(" ")[0]}</th>)}
              <th>Total</th>
              <th>Publicaciones</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {[...d.allWeeks].reverse().slice(0, range || undefined).map((w) => {
              const i = d.allWeeks.indexOf(w);
              const p = contentByWeek(allPosts, [w])[0];
              const own = (acc: string) => snapshots.find((s) => s.account === acc && s.week_start === w);
              return (
                <tr key={w}>
                  <td><b>S{weekNumber(w)}</b> <span className="text-muted text-xs">{weekLabel(w)}</span>{w === d.thisWeek && <span className="chip" style={{ marginLeft: 8 }}>Esta semana</span>}</td>
                  {ACCOUNTS.map((a) => {
                    const v = own(a.id); const prev = i > 0 ? d.series[a.id][i - 1] : null;
                    return <td key={a.id} style={{ fontVariantNumeric: "tabular-nums" }}>{v ? <>{fmt(v.followers)} {prev !== null && <span style={{ fontSize: "0.75rem", fontWeight: 700, color: v.followers - prev >= 0 ? "var(--ok)" : "var(--bad)" }}>{v.followers - prev >= 0 ? "+" : ""}{fmt(v.followers - prev)}</span>}</> : <span className="text-muted">—</span>}</td>;
                  })}
                  <td style={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{snapshots.some((s) => s.week_start === w) ? fmt(d.total[i]) : <span className="text-muted">—</span>}</td>
                  <td>{!p.planned ? <span className="text-muted">—</span> : !p.reviewed ? <span className="chip">{p.planned} planificadas</span>
                    : <span className={`chip ${metMinimum(p) ? "chip-ok" : "chip-bad"}`}>TikTok {p.tiktok}/{TARGETS.tiktok} · LinkedIn {p.linkedin}/{TARGETS.linkedin}{p.failed ? ` · ${p.failed} sin publicar` : ""}</span>}</td>
                  <td style={{ textAlign: "right" }}><button className="icon-btn" onClick={() => openCheckin(w)} aria-label={`Editar semana ${weekNumber(w)}`}><Pencil /></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
