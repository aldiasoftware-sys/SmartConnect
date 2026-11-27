"use client";

import { useEffect, useState } from "react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { ACCOUNTS, Account, Post, Snapshot, addDays, fmt, followerSeries, weekRange } from "@/lib/social";
import { useAuth } from "@/lib/AuthContext";
import AccountIcon, { BrandLogo } from "@/components/AccountIcon";

function Delta({ v }: { v: number | null }) {
  if (v === null) return <span className="delta flat"><Minus /> sin datos</span>;
  const cls = v > 0 ? "up" : v < 0 ? "down" : "flat";
  const Icon = v > 0 ? TrendingUp : v < 0 ? TrendingDown : Minus;
  return <span className={`delta ${cls}`}><Icon /> {v > 0 ? "+" : ""}{fmt(v)}</span>;
}

/** Miembros del servidor de Discord (sin el equipo), leídos solos de /api/discord/miembros. */
type Discord = { status: "cargando" | "ok" | "sin-datos"; joins: string[]; error?: string };

function useDiscordMembers(): Discord {
  const { session } = useAuth();
  const [dc, setDc] = useState<Discord>({ status: "cargando", joins: [] });
  useEffect(() => {
    if (!session?.access_token) return;
    (async () => {
      try {
        const r = await fetch("/api/discord/miembros", { headers: { authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
        if (!(r.headers.get("content-type") || "").includes("json")) { setDc({ status: "sin-datos", joins: [], error: "Sin funciones de Cloudflare (en local)" }); return; }
        const j = await r.json();
        setDc(j.ok ? { status: "ok", joins: j.joins || [] } : { status: "sin-datos", joins: [], error: j.error });
      } catch (e: any) { setDc({ status: "sin-datos", joins: [], error: e?.message }); }
    })();
  }, [session?.access_token]);
  return dc;
}

/** Cómo crece cada cuenta en la semana que se mira (seguidores del check-in y su cambio) y Discord (miembros y nuevos). */
export default function AccountsWeek({ week, snapshots, accounts = ACCOUNTS, onUpdate }: { week: string; posts?: Post[]; snapshots: Snapshot[]; accounts?: Account[]; onUpdate?: () => void }) {
  const weeks = weekRange([...snapshots.map((s) => s.week_start), week], week).filter((w) => w <= week);
  const li = weeks.length - 1;
  const { series } = followerSeries(snapshots, weeks, accounts);
  const has = snapshots.some((s) => s.week_start <= week);
  const end = addDays(week, 6);
  const dc = useDiscordMembers();
  // miembros que había al acabar la semana que se mira y cuántos entraron en ella
  const dcTotal = dc.joins.filter((d) => d <= end).length;
  const dcNew = dc.joins.filter((d) => d >= week && d <= end).length;
  const redes = ["youtube", "tiktok", "instagram"];

  return (
    <div className="grid-4" style={{ marginBottom: "1.5rem" }}>
      {accounts.map((a) => {
        const s = series[a.id];
        const now = s[li], before = li > 0 ? s[li - 1] : null;
        const red = redes.includes(a.platform);
        return (
          <div key={a.id} className={`card ${red ? "acc-card" : ""}`} title={red ? "Abrir el detalle en una pestaña nueva" : undefined}
            onClick={() => { if (red) window.open(`/red?p=${a.platform}`, "_blank"); }}>
            <div className="flex items-center gap-3" style={{ marginBottom: "1.25rem" }}>
              <AccountIcon account={a} size={40} />
              <div><b style={{ fontSize: "0.9375rem" }}>{a.name}</b><div className="section-sub">{a.owner.replace(" (conjunta)", "")} <span className="acc-open">· ver detalle ↗</span></div></div>
            </div>
            <button className="kpi-value acc-num" style={{ fontSize: "1.875rem", marginBottom: 6 }} onClick={(e) => { e.stopPropagation(); onUpdate?.(); }} title="Seguidores del último check-in · pulsa para actualizarlos">{now === null || !has ? "—" : fmt(now)}</button>
            <div className="kpi-sub"><Delta v={now !== null && before !== null ? now - before : null} /> esta semana</div>
          </div>
        );
      })}

      <div className="card acc-card" title="Abrir Discord en una pestaña nueva" onClick={() => window.open("/discord", "_blank")}>
        <div className="flex items-center gap-3" style={{ marginBottom: "1.25rem" }}>
          <BrandLogo platform="discord" size={40} />
          <div><b style={{ fontSize: "0.9375rem" }}>Discord</b><div className="section-sub">Miembros <span className="acc-open">· ver detalle ↗</span></div></div>
        </div>
        <div className="kpi-value" style={{ fontSize: "1.875rem", marginBottom: 6 }} title={dc.error || "Miembros del servidor sin contar al equipo"}>
          {dc.status === "ok" ? fmt(dcTotal) : dc.status === "cargando" ? "…" : "—"}
        </div>
        <div className="kpi-sub"><Delta v={dc.status === "ok" ? dcNew : null} /> nuevos esta semana</div>
      </div>
    </div>
  );
}
