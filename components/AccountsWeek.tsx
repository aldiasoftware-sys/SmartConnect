"use client";

import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { ACCOUNTS, Account, Post, Snapshot, addDays, contentByWeek, fmt, followerSeries, isAccountPost, pct, weekRange } from "@/lib/social";
import { Sparkline } from "@/components/SocialCharts";
import AccountIcon from "@/components/AccountIcon";

function Delta({ v }: { v: number | null }) {
  if (v === null) return <span className="delta flat"><Minus /> sin datos</span>;
  const cls = v > 0 ? "up" : v < 0 ? "down" : "flat";
  const Icon = v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus;
  return <span className={`delta ${cls}`}><Icon /> {v > 0 ? "+" : ""}{fmt(v)}</span>;
}

/** Cómo crece cada cuenta en la semana que se mira (seguidores del check-in y su cambio)
 *  y cuánto de lo que hay en el calendario de esa semana se ha publicado ya. Mismas tarjetas que en Redes. */
export default function AccountsWeek({ week, posts, snapshots, accounts = ACCOUNTS, onUpdate }: { week: string; posts: Post[]; snapshots: Snapshot[]; accounts?: Account[]; onUpdate?: () => void }) {
  const weeks = weekRange([...snapshots.map((s) => s.week_start), week], week).filter((w) => w <= week);
  const li = weeks.length - 1;
  const { series } = followerSeries(snapshots, weeks, accounts);
  const has = snapshots.some((s) => s.week_start <= week);
  const end = addDays(week, 6);

  return (
    <div className="grid-3" style={{ marginBottom: "1.5rem" }}>
      {accounts.map((a) => {
        const s = series[a.id];
        const now = s[li], before = li > 0 ? s[li - 1] : null;
        const mine = (p: Post) => isAccountPost(a, p);
        const plan = posts.filter((p) => mine(p) && p.publish_date && p.publish_date >= week && p.publish_date <= end);
        const hist = contentByWeek(posts.filter(mine), weeks).filter((p) => p.reviewed && p.planned > 0).slice(-8);
        const histPct = pct(hist.reduce((x, p) => x + p.published, 0), hist.reduce((x, p) => x + p.planned, 0));
        return (
          <div key={a.id} className="card">
            <div className="flex items-center justify-between" style={{ marginBottom: "1.25rem" }}>
              <div className="flex items-center gap-3">
                <AccountIcon account={a} size={40} />
                <div><b style={{ fontSize: "0.9375rem" }}>{a.name}</b><div className="section-sub">{a.owner}</div></div>
              </div>
              <Sparkline values={s.slice(-12)} color={a.color} />
            </div>
            <div className="flex items-end justify-between">
              <div>
                <button className="kpi-value acc-num" style={{ fontSize: "1.875rem", marginBottom: 6 }} onClick={onUpdate} title="Seguidores del último check-in · pulsa para actualizarlos">{now === null || !has ? "—" : fmt(now)}</button>
                <div className="kpi-sub"><Delta v={now !== null && before !== null ? now - before : null} /> esta semana</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="ci-mini">En el calendario</div>
                <div style={{ fontWeight: 500, fontSize: "1.125rem" }}>{plan.length ? `${plan.filter((p) => p.status === "publicado").length}/${plan.length} ${a.platform === "linkedin" ? "posts" : "vídeos"}` : "—"}</div>
                <div className="section-sub">{hist.length ? `${histPct}% cumplido` : "sin historial"}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
