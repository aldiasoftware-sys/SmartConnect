"use client";

import { useEffect, useState } from "react";
import { X, CalendarCheck, Check, Minus, Timer } from "lucide-react";
import { useSocial } from "@/lib/SocialContext";
import { ACCOUNTS, ROUTINE_PLATFORMS, KINDS, PLATFORMS, Post, Snapshot, TARGETS, addDays, checkinWeek, contentByWeek, countdown, fmt, nextCheckinAt, shortDate, toISO, weekLabel, weekNumber } from "@/lib/social";
import { saveRow, upsertRows } from "@/lib/store";
import AccountIcon from "./AccountIcon";
import Portal from "./Portal";

type Vals = Record<string, string>;
const num = (v: string) => (v.trim() === "" ? null : Math.max(0, Math.round(Number(v))));

/** Check-in semanal (se abre cada lunes a las 8:00): seguidores y repaso de lo que quedó sin publicar la semana pasada. */
export default function WeeklyCheckin() {
  const { checkinWeek: week, closeCheckin, snapshots, posts, refresh } = useSocial();
  const [followers, setFollowers] = useState<Vals>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [, tick] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const prev = week ? addDays(week, -7) : "";
  const inWeek = (p: Post, w: string) => !!p.publish_date && p.publish_date >= w && p.publish_date <= addDays(w, 6) && ROUTINE_PLATFORMS.includes(p.platform);
  const prevPosts = posts.filter((p) => inWeek(p, prev)).sort((a, b) => a.publish_date!.localeCompare(b.publish_date!));
  const isCurrent = week === checkinWeek();
  const doneThisWeek = isCurrent && ACCOUNTS.filter((a) => !a.optional).every((a) => snapshots.some((s) => s.week_start === week && s.account === a.id));
  const next = nextCheckinAt();

  // la cuenta atrás se actualiza sola mientras el diálogo está abierto
  useEffect(() => { if (!doneThisWeek) return; const t = setInterval(() => tick((n) => n + 1), 30000); return () => clearInterval(t); }, [doneThisWeek]);

  useEffect(() => {
    if (!week) return;
    setFollowers(Object.fromEntries(ACCOUNTS.map((a) => {
      const r = snapshots.find((x) => x.week_start === week && x.account === a.id);
      return [a.id, r ? String(r.followers) : ""];
    })));
    setDone(Object.fromEntries(prevPosts.map((p) => [p.id!, p.status === "publicado"])));
    setError("");
  }, [week]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!week) return null;

  const lastKnown = (acc: string) => [...snapshots].filter((s) => s.account === acc && s.week_start < week).sort((a, b) => b.week_start.localeCompare(a.week_start))[0];
  const prevStats = contentByWeek(prevPosts.map((p) => ({ ...p, status: done[p.id!] ? "publicado" : p.status === "publicado" ? "montado" : p.status })), [prev])[0];

  async function save() {
    setSaving(true); setError("");
    try {
      await upsertRows("social_snapshots", ACCOUNTS.filter((a) => num(followers[a.id] || "") !== null)
        .map((a) => ({ week_start: week!, account: a.id, followers: num(followers[a.id])! } as Snapshot)));
      for (const p of prevPosts) {
        const was = p.status === "publicado", now = !!done[p.id!];
        if (was !== now) await saveRow<Post>("content_posts", { ...p, status: now ? "publicado" : "montado" });
      }
      await refresh();
      closeCheckin();
    } catch (e: any) {
      setError(e?.message || "No se ha podido guardar.");
    }
    setSaving(false);
  }

  const row = (a: (typeof ACCOUNTS)[number]) => {
    const lk = lastKnown(a.id);
    return (
      <div key={a.id} className="ci-row">
        <div className="ci-acc">
          <AccountIcon account={a} />
          <div><b>{a.name} · {a.owner}</b><small>{lk ? `La última vez: ${fmt(lk.followers)}` : a.optional ? "Opcional · déjalo vacío si aún no existe" : "Primera vez que lo apuntamos"}</small></div>
        </div>
        <input type="number" min={0} inputMode="numeric" placeholder={lk ? String(lk.followers) : "0"} value={followers[a.id] || ""}
          onChange={(e) => setFollowers({ ...followers, [a.id]: e.target.value })} />
      </div>
    );
  };

  return (
    <Portal>
      <div className="dialog-overlay" onClick={() => closeCheckin(true)}>
        <div className="dialog" onClick={(e) => e.stopPropagation()}>
          <div className="dialog-head">
            <div>
              <span className="chip" style={{ marginBottom: "0.75rem" }}><CalendarCheck style={{ width: 13, height: 13 }} /> Semana {weekNumber(week)} · {weekLabel(week)}</span>
              <h3 style={{ fontSize: "1.375rem", fontWeight: 500, letterSpacing: "-0.03em" }}>Check-in semanal</h3>
              <p className="section-sub">Un minuto: cuánto crecemos y si cumplimos la rutina.</p>
            </div>
            <button className="icon-btn" onClick={() => closeCheckin(true)} aria-label="Cerrar"><X /></button>
          </div>

          <div className="dialog-body">
            {doneThisWeek && (
              <div className="ci-done">
                <span className="ci-done-ico"><Timer /></span>
                <div>
                  <b>Check-in de esta semana hecho</b>
                  <small>El próximo se abre el lunes {shortDate(toISO(next))} a las 8:00</small>
                </div>
                <div className="ci-count">{countdown(next)}</div>
              </div>
            )}
            <div className="ci-step"><span>1</span> ¿Cuántos seguidores tenemos hoy?</div>
            {ACCOUNTS.map(row)}

            <div className="ci-step" style={{ marginTop: "1.5rem" }}><span>2</span> La semana pasada, ¿se publicó todo?</div>
            {prevPosts.length === 0 ? (
              <p className="section-sub" style={{ padding: "0.25rem 0 0.5rem" }}>La semana pasada no había nada en el calendario de contenido.</p>
            ) : (
              <>
                <div className="flex gap-2" style={{ marginBottom: "0.75rem", flexWrap: "wrap" }}>
                  <span className={`chip ${prevStats.tiktok >= TARGETS.tiktok ? "chip-ok" : "chip-bad"}`}>TikTok {prevStats.tiktok}/{TARGETS.tiktok}</span>
                  <span className={`chip ${prevStats.instagram >= TARGETS.instagram ? "chip-ok" : "chip-bad"}`}>Instagram {prevStats.instagram}/{TARGETS.instagram}</span>
                  <span className={`chip ${prevStats.linkedin >= TARGETS.linkedin ? "chip-ok" : "chip-bad"}`}>LinkedIn {prevStats.linkedin}/{TARGETS.linkedin}</span>
                </div>
                {prevPosts.map((p) => (
                  <div key={p.id} className="ci-row" style={{ gridTemplateColumns: "1fr auto" }}>
                    <div className="ci-acc">
                      <span className="acc-ico" style={{ background: PLATFORMS[p.platform].color, width: 30, height: 30, fontSize: 11 }}>{PLATFORMS[p.platform].label.slice(0, 2)}</span>
                      <div><b style={{ fontSize: "0.8125rem" }}>{p.title}</b><small>{shortDate(p.publish_date!)} · {KINDS[p.kind || ""] || p.kind}</small></div>
                    </div>
                    <div className="seg">
                      <button className={done[p.id!] ? "on" : ""} onClick={() => setDone({ ...done, [p.id!]: true })}><Check style={{ width: 13, height: 13, verticalAlign: -2 }} /> Publicado</button>
                      <button className={!done[p.id!] ? "on" : ""} onClick={() => setDone({ ...done, [p.id!]: false })}><Minus style={{ width: 13, height: 13, verticalAlign: -2 }} /> No</button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {error && <p style={{ color: "var(--bad)", fontSize: "0.8125rem", marginTop: "0.75rem" }}>{error}</p>}
          </div>

          <div className="dialog-foot">
            {doneThisWeek ? <button className="btn-secondary" onClick={() => closeCheckin()}>Cerrar</button>
              : <button className="btn-secondary" onClick={() => closeCheckin(true)}>Recordármelo mañana</button>}
            <button className="btn-primary" onClick={save} disabled={saving}>{saving ? "Guardando…" : doneThisWeek ? "Guardar cambios" : "Guardar semana"}</button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
