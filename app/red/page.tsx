"use client";

// Detalle de una red (/red?p=youtube|tiktok|instagram): estilo «bolsa» con los colores de cada app.
// YouTube: datos reales del canal (app_settings «youtube_stats», que sube el PC cada 30 min con aldia-youtube) y contador en
// directo con la clave pública de «youtube_live». Instagram: «instagram_stats». TikTok: «tiktok_stats» (tiktok.py del Mac de Guille cada 30 min:
// API oficial si está conectada; si no, el perfil público con Chrome sin ventana).
import { useEffect, useMemo, useState } from "react";
import { ArrowDownRight, ArrowUpRight, CalendarClock, Clock, Eye, Flame, Heart, MessageCircle, Minus, Play, Radio, Repeat2, Target, Trophy, UserPlus, Users } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useSocial } from "@/lib/SocialContext";
import { ACCOUNTS, TARGETS, addDays, fmt, isPublished, shortDate, today, weekStart } from "@/lib/social";
import { BrandLogo } from "@/components/AccountIcon";
import { groupKits, listAll, signedUrl } from "@/lib/files";
import { AreaChart, ColumnChart, CountUp, Ring, Sparkline } from "@/components/charts";

type P = "youtube" | "tiktok" | "instagram";
const THEME: Record<P, { name: string; handle: string; accent: string; accent2: string; cls: string; unit: string }> = {
  youtube: { name: "YouTube", handle: "Shorts · ALDIA", accent: "#FF0033", accent2: "#FF6B6B", cls: "rd-yt", unit: "suscriptores" },
  tiktok: { name: "TikTok", handle: "@aldiaproject", accent: "#FE2C55", accent2: "#25F4EE", cls: "rd-tt", unit: "seguidores" },
  instagram: { name: "Instagram", handle: "@aldiaproject", accent: "#E1306C", accent2: "#F77737", cls: "rd-ig", unit: "seguidores" },
};
const RANGES = [{ id: 7, l: "7D" }, { id: 30, l: "1M" }, { id: 90, l: "3M" }, { id: 3650, l: "Todo" }];

type YTVideo = { id: string; titulo: string; publicado?: string; programado?: string | null; privacidad: string; miniatura?: string; vistas: number; likes: number; comentarios: number; duracion?: string };
type IGReel = { id: string; titulo: string; publicado?: string; link?: string; miniatura?: string; tipo?: string; likes: number; comentarios: number;
  views?: number; reach?: number; shares?: number; saved?: number; total_interactions?: number; ig_reels_avg_watch_time?: number };
type IGStats = { cuenta: { usuario: string; seguidores: number; publicaciones: number; foto?: string }; reels: IGReel[]; actualizado: string;
  dias: { day: string; reach?: number; views?: number; accounts_engaged?: number; total_interactions?: number }[]; historial: Record<string, { seguidores: number }> };
type TTVideo = { id: string; titulo: string; publicado?: string; link?: string; miniatura?: string; duracion?: number; vistas: number; likes: number; comentarios: number; compartidos: number; guardados: number; fijado?: boolean };
type TTStats = { cuenta: { usuario: string; nombre?: string; seguidores: number; me_gusta: number; videos: number; foto?: string }; videos: TTVideo[];
  historial: Record<string, { seguidores: number; me_gusta?: number; vistas?: number }>; fuente?: string; aviso?: string | null; actualizado: string };
type YTStats = {
  canal: { id: string; nombre: string; suscriptores: number; vistas: number; videos: number };
  videos: YTVideo[]; actualizado: string;
  dias: { day: string; views: number; estimatedMinutesWatched: number; subscribersGained: number; subscribersLost: number; likes: number; comments: number; shares: number }[];
  por_video: Record<string, { views: number; averageViewDuration: number; averageViewPercentage: number; subscribersGained: number; likes: number; shares: number }>;
  historial: Record<string, { suscriptores: number; vistas: number }>;
};

const dayLbl = (d: string) => shortDate(d);
const ago = (iso?: string) => { if (!iso) return ""; const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000); return m < 1 ? "ahora" : m < 60 ? `hace ${m} min` : m < 1440 ? `hace ${Math.round(m / 60)} h` : `hace ${Math.round(m / 1440)} d`; };
const secs = (iso?: string) => { const m = iso?.match(/PT(?:(\d+)M)?(?:(\d+)S)?/); return m ? Number(m[1] || 0) * 60 + Number(m[2] || 0) : 0; };

function Change({ now, before, unit = "" }: { now: number | null; before: number | null; unit?: string }) {
  if (now === null || before === null) return <span className="rd-chg flat"><Minus /> sin datos aún</span>;
  const d = now - before, pct = before ? (d / before) * 100 : d ? 100 : 0;
  const cls = d > 0 ? "up" : d < 0 ? "down" : "flat";
  const I = d > 0 ? ArrowUpRight : d < 0 ? ArrowDownRight : Minus;
  return <span className={`rd-chg ${cls}`}><I /> {d > 0 ? "+" : ""}{fmt(d)}{unit} <em>({pct > 0 ? "+" : ""}{pct.toFixed(1).replace(".", ",")} %)</em></span>;
}

function Tile({ icon: I, label, value, sub, spark, color }: { icon: any; label: string; value: React.ReactNode; sub?: React.ReactNode; spark?: number[]; color: string }) {
  return (
    <div className="rd-tile">
      <div className="rd-tile-top"><span className="rd-tile-ico" style={{ color }}><I /></span><span>{label}</span></div>
      <div className="rd-tile-val">{value}</div>
      <div className="rd-tile-foot"><small>{sub}</small>{spark && spark.length > 1 && <Sparkline values={spark} color={color} width={84} height={26} />}</div>
    </div>
  );
}

export default function RedPage() {
  const [p, setP] = useState<P>("youtube");
  useEffect(() => { const q = new URLSearchParams(window.location.search).get("p") as P; if (q && q in THEME) setP(q); }, []);
  const T = THEME[p];
  const { posts, snapshots } = useSocial();
  const [range, setRange] = useState(30);
  const [yt, setYt] = useState<YTStats | null>(null);
  const [live, setLive] = useState<{ channelId: string; apiKey: string } | null>(null);
  const [now, setNow] = useState<{ subs: number; views: number; videos: number; at: number } | null>(null);
  const [first, setFirst] = useState<number | null>(null);
  const [liveVid, setLiveVid] = useState<Record<string, { v: number; l: number; c: number }>>({});
  const [flash, setFlash] = useState<string>("");
  const [igs, setIgs] = useState<IGStats | null>(null);
  const [tts, setTts] = useState<TTStats | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [badImg, setBadImg] = useState<Record<string, true>>({});

  // Instagram: lo sube el PC cada 10 min (instagram.py stats); aquí se relee cada minuto
  useEffect(() => {
    if (p !== "instagram") return;
    const load = async () => { const { data } = await supabase.from("app_settings").select("value").eq("key", "instagram_stats").maybeSingle(); if (data?.value) setIgs(data.value as IGStats); };
    load(); const t = setInterval(load, 60000); return () => clearInterval(t);
  }, [p]);

  // TikTok: lo sube el Mac de Guille cada 30 min (tiktok.py); aquí se relee cada minuto
  useEffect(() => {
    if (p !== "tiktok") return;
    const load = async () => { const { data } = await supabase.from("app_settings").select("value").eq("key", "tiktok_stats").maybeSingle(); if (data?.value) setTts(data.value as TTStats); };
    load(); const t = setInterval(load, 60000); return () => clearInterval(t);
  }, [p]);

  // Próximos Shorts: YouTube solo da miniaturas firmadas (caducan en horas) de los vídeos privados/programados,
  // así que usamos la «miniatura LinkedIn» del kit en Archivos (ruta en «publicando»; si se movió, por el nombre de la pieza).
  useEffect(() => {
    if (p !== "youtube" || !yt) return;
    const ids = yt.videos.filter((v) => v.programado).map((v) => v.id).filter((id) => !thumbs[id]);
    if (!ids.length) return;
    (async () => {
      try {
        const { data } = await supabase.from("app_settings").select("value").eq("key", "publicando").maybeSingle();
        const arch: Record<string, string> = {};
        for (const i of Object.values((data?.value || {}) as Record<string, any>)) {
          const id = String(i?.link || "").match(/shorts\/([\w-]{11})/)?.[1];
          if (i?.red === "youtube" && id && i.archivo) arch[id] = i.archivo;
        }
        const { kits } = groupKits(await listAll());
        const out: Record<string, string> = {};
        for (const id of ids) {
          const a = arch[id]; if (!a) continue;
          const base = a.split("/").pop();
          const k = kits.find((x) => x.thumb?.path.startsWith(`${a} - `)) || kits.find((x) => x.thumb && x.name === base);
          if (k?.thumb) { try { out[id] = await signedUrl(k.thumb.path); } catch { /* sin miniatura */ } }
        }
        if (Object.keys(out).length) setThumbs((t) => ({ ...t, ...out }));
      } catch { /* sin Archivos: se queda el logo */ }
    })();
  }, [p, yt]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.title = `${T.name} · Aldia Smart Connect`; }, [T.name]);

  // datos del PC (cada 10 min) — aquí se releen cada minuto
  useEffect(() => {
    if (p !== "youtube") return;
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("key,value").in("key", ["youtube_stats", "youtube_live"]);
      for (const r of data || []) { if (r.key === "youtube_stats") setYt(r.value as YTStats); if (r.key === "youtube_live") setLive(r.value as any); }
    };
    load(); const t = setInterval(load, 60000); return () => clearInterval(t);
  }, [p]);

  // en directo: suscriptores y vistas cada 10 s; vistas de cada vídeo cada minuto
  useEffect(() => {
    if (p !== "youtube" || !live?.apiKey) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${live.channelId}&key=${live.apiKey}`).then((x) => x.json());
        const s = r.items?.[0]?.statistics; if (!s || stop) return;
        const n = { subs: Number(s.subscriberCount), views: Number(s.viewCount), videos: Number(s.videoCount), at: Date.now() };
        setNow((prev) => {
          if (prev && n.subs > prev.subs) { setFlash(`+${n.subs - prev.subs} ${n.subs - prev.subs === 1 ? "nuevo suscriptor" : "nuevos suscriptores"}`); setTimeout(() => setFlash(""), 4000); }
          return n;
        });
        setFirst((f) => (f === null ? n.subs : f));
      } catch { /* sin red: se reintenta */ }
    };
    tick(); const t = setInterval(tick, 10000); return () => { stop = true; clearInterval(t); };
  }, [p, live]);
  useEffect(() => {
    if (p !== "youtube" || !live?.apiKey || !yt?.videos?.length) return;
    const ids = yt.videos.slice(0, 50).map((v) => v.id).join(",");
    const tick = async () => {
      try {
        const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${ids}&key=${live.apiKey}`).then((x) => x.json());
        setLiveVid(Object.fromEntries((r.items || []).map((v: any) => [v.id, { v: Number(v.statistics.viewCount || 0), l: Number(v.statistics.likeCount || 0), c: Number(v.statistics.commentCount || 0) }])));
      } catch { /* */ }
    };
    tick(); const t = setInterval(tick, 60000); return () => clearInterval(t);
  }, [p, live, yt]);

  const acc = ACCOUNTS.find((a) => a.platform === p);
  const t0 = today(), from = addDays(t0, -range);

  // ---------- serie de seguidores ----------
  const followers = useMemo(() => {
    if (p === "youtube" && yt) {
      const h = Object.entries(yt.historial || {}).filter(([d]) => d >= from).map(([d, v]) => ({ d, v: v.suscriptores }));
      if (now && (!h.length || h[h.length - 1].d !== t0)) h.push({ d: t0, v: now.subs });
      else if (now && h.length) h[h.length - 1].v = now.subs;
      return h;
    }
    if (p === "instagram" && igs) return Object.entries(igs.historial || {}).filter(([d]) => d >= from).map(([d, v]) => ({ d, v: v.seguidores }));
    if (p === "tiktok" && tts) return Object.entries(tts.historial || {}).filter(([d]) => d >= from).map(([d, v]) => ({ d, v: v.seguidores }));
    return snapshots.filter((s) => s.account === acc?.id && s.week_start >= weekStart(new Date(from))).sort((a, b) => a.week_start.localeCompare(b.week_start)).map((s) => ({ d: s.week_start, v: s.followers }));
  }, [p, yt, igs, tts, now, snapshots, acc, from, t0]);
  const cur = p === "youtube" ? (now?.subs ?? yt?.canal.suscriptores ?? null) : p === "instagram" && igs ? igs.cuenta.seguidores : p === "tiktok" && tts ? tts.cuenta.seguidores : (followers[followers.length - 1]?.v ?? null);
  // Instagram: días y Reels
  const igDias = (igs?.dias || []).filter((d) => d.day >= from);
  const igSum = (k: "reach" | "views" | "accounts_engaged" | "total_interactions") => igDias.reduce((a, d) => a + Number(d[k] || 0), 0);
  const igReels = (igs?.reels || []).filter((r) => r.tipo === "REELS" || r.tipo === "VIDEO").sort((a, b) => (b.publicado || "").localeCompare(a.publicado || ""));
  const igBest = [...igReels].sort((a, b) => (b.views || 0) - (a.views || 0))[0];
  const base = followers.length ? followers[0].v : null;
  // TikTok: vídeos y vistas por día (diferencia entre el total de vistas de cada día)
  const ttVids = [...(tts?.videos || [])].sort((a, b) => (b.publicado || "").localeCompare(a.publicado || ""));
  const ttBest = [...ttVids].sort((a, b) => b.vistas - a.vistas)[0];
  const ttSum = (k: "vistas" | "likes" | "comentarios" | "compartidos" | "guardados") => ttVids.reduce((a, v) => a + (v[k] || 0), 0);
  const ttHist = Object.entries(tts?.historial || {}).filter(([, v]) => v.vistas != null).sort(([a], [b]) => a.localeCompare(b));
  const ttDias = ttHist.map(([d, v], i) => ({ day: d, vistas: i ? Math.max(0, (v.vistas || 0) - (ttHist[i - 1][1].vistas || 0)) : 0 })).slice(1).filter((d) => d.day >= from);
  // mientras no haya dos días de lecturas: vistas de cada vídeo por fecha de publicación (ya hay datos desde el primer día)
  const ttPorVideo = [...ttVids].filter((v) => (v.publicado || "").slice(0, 10) >= from).reverse();

  // ---------- publicaciones del calendario ----------
  const mine = posts.filter((x) => x.platform === p && x.publish_date);
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(weekStart(), -7 * (7 - i)));
  const perWeek = weeks.map((w) => ({ key: w, label: shortDate(w), value: mine.filter((x) => x.publish_date! >= w && x.publish_date! <= addDays(w, 6) && isPublished(x, t0)).length, tip: `Semana del ${shortDate(w)}` }));
  const thisWeek = mine.filter((x) => x.publish_date! >= weekStart() && x.publish_date! <= addDays(weekStart(), 6));
  let streak = 0; for (let d = t0; mine.some((x) => x.publish_date === d && isPublished(x, addDays(t0, 1))); d = addDays(d, -1)) streak++;
  const target = (TARGETS as any)[p] as number;

  // ---------- YouTube: días y vídeos ----------
  const dias = (yt?.dias || []).filter((d) => d.day >= from);
  const sum = (k: keyof YTStats["dias"][number]) => dias.reduce((a, d) => a + Number(d[k] || 0), 0);
  const vids = (yt?.videos || []).map((v) => ({ ...v, vistas: liveVid[v.id]?.v ?? v.vistas, likes: liveVid[v.id]?.l ?? v.likes, comentarios: liveVid[v.id]?.c ?? v.comentarios, an: yt?.por_video?.[v.id] }));
  const publicados = vids.filter((v) => v.privacidad === "public").sort((a, b) => (b.publicado || "").localeCompare(a.publicado || ""));
  const programados = vids.filter((v) => v.programado).sort((a, b) => (a.programado || "").localeCompare(b.programado || ""));
  const best = [...publicados].sort((a, b) => b.vistas - a.vistas)[0];
  const avgPct = (() => { const xs = publicados.map((v) => v.an?.averageViewPercentage).filter((x): x is number => typeof x === "number"); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; })();
  // el contador del canal va con mucho retraso; la suma de las vistas de cada vídeo (en directo) no
  // subs en directo: el contador de suscriptores de cada día (historial + ahora) en vez de la analítica (2-3 días tarde)
  const subsSpark = followers.map((f, i) => (i ? Math.max(0, f.v - followers[i - 1].v) : 0));
  const subsGanados = Math.max(sum("subscribersGained"), subsSpark.reduce((a, b) => a + b, 0));
  const totalViews = Math.max(now?.views ?? 0, yt?.canal.vistas ?? 0, vids.reduce((a, v) => a + (v.vistas || 0), 0));

  return (
    <div className={`rd ${T.cls}`}>
      <div className="rd-glow" />
      <header className="rd-head">
        <div className="rd-id">
          <BrandLogo platform={p} size={52} />
          <div>
            <h1>{T.name}</h1>
            <span>{p === "youtube" && yt ? yt.canal.nombre : p === "instagram" && igs ? `@${igs.cuenta.usuario}` : p === "tiktok" && tts ? `@${tts.cuenta.usuario}` : T.handle}</span>
          </div>
        </div>
        <div className="rd-head-r">
          {p === "youtube" && (live?.apiKey
            ? <span className="rd-live yt-pulse"><Radio /> En directo · {now ? ago(new Date(now.at).toISOString()) : "conectando…"}</span>
            : <span className="rd-live off"><Clock /> Datos del PC {yt ? ago(yt.actualizado) : "—"}</span>)}
          {p === "instagram" && <span className="rd-live off"><Clock /> Datos del PC {igs ? ago(igs.actualizado) : "—"}</span>}
          {p === "tiktok" && <span className="rd-live off" title={tts?.aviso || tts?.fuente || ""}><Clock /> {tts?.fuente === "API oficial" ? "API de TikTok" : "Perfil público"} {tts ? ago(tts.actualizado) : "—"}</span>}
          <div className="rd-tabs">
            {(Object.keys(THEME) as P[]).map((k) => (
              <a key={k} href={`/red?p=${k}`} className={k === p ? "on" : ""} onClick={(e) => { e.preventDefault(); history.replaceState(null, "", `/red?p=${k}`); setP(k); }}>
                <BrandLogo platform={k} size={18} /> {THEME[k].name}
              </a>
            ))}
          </div>
        </div>
      </header>

      {/* ticker principal */}
      <section className="rd-hero">
        <div className="rd-hero-l">
          <div className="rd-label"><Users /> {T.unit}</div>
          <div className="rd-big">{cur === null ? "—" : <CountUp value={cur} />}</div>
          <div className="rd-hero-sub">
            <Change now={cur} before={base} />
            <span className="rd-muted">{RANGES.find((r) => r.id === range)?.l === "Todo" ? "desde el inicio" : `últimos ${RANGES.find((r) => r.id === range)?.l}`}</span>
            {p === "youtube" && first !== null && now && now.subs > first && <span className="rd-new">+{now.subs - first} desde que abriste</span>}
          </div>
        </div>
        <div className="rd-range">{RANGES.map((r) => <button key={r.id} className={range === r.id ? "on" : ""} onClick={() => setRange(r.id)}>{r.l}</button>)}</div>
        <div className="rd-chart">
          {followers.length >= 2
            ? <AreaChart labels={followers.map((f) => dayLbl(f.d))} series={[{ id: "f", label: T.unit, color: T.accent, values: followers.map((f) => f.v) }]} height={260} />
            : <div className="rd-empty"><span>La curva se dibuja sola en cuanto haya dos días de datos.</span><small>{p === "tiktok" ? "El Mac de Guille los apunta solo cada 30 min." : "El PC los apunta solo cada 10 min."}</small></div>}
        </div>
      </section>

      {flash && <div className="rd-toast"><UserPlus /> {flash}</div>}

      {/* indicadores */}
      {p === "youtube" ? (
        <section className="rd-tiles">
          <Tile icon={Eye} label="Visualizaciones" value={<CountUp value={totalViews} />} sub={`${fmt(sum("views"))} en el periodo`} spark={dias.map((d) => d.views)} color={T.accent} />
          <Tile icon={Clock} label="Minutos vistos" value={<CountUp value={sum("estimatedMinutesWatched")} />} sub="en el periodo" spark={dias.map((d) => d.estimatedMinutesWatched)} color={T.accent} />
          <Tile icon={UserPlus} label="Subs ganados" value={<>+<CountUp value={subsGanados} /></>} sub={`−${fmt(sum("subscribersLost"))} perdidos`} spark={subsSpark} color="#0bb07b" />
          <Tile icon={Target} label="% visto medio" value={avgPct === null ? "—" : `${avgPct.toFixed(0)} %`} sub={avgPct === null ? "llega a las 48 h" : avgPct < 40 ? "bajo: acortar (< 40 %)" : "bien (≥ 40 %)"} color={avgPct !== null && avgPct < 40 ? "#e5484d" : T.accent} />
          <Tile icon={Heart} label="Me gusta" value={<CountUp value={publicados.reduce((a, v) => a + v.likes, 0)} />} sub={`${fmt(publicados.reduce((a, v) => a + v.comentarios, 0))} comentarios`} color={T.accent} />
          <Tile icon={Play} label="Shorts" value={<CountUp value={publicados.length} />} sub={`${programados.length} programados`} color={T.accent} />
        </section>
      ) : p === "instagram" && igs ? (
        <section className="rd-tiles">
          <Tile icon={Eye} label="Visualizaciones" value={<CountUp value={Math.max(igSum("views"), igReels.reduce((a, r) => a + (r.views || 0), 0))} />} sub="de todos los Reels" spark={igDias.map((d) => d.views || 0)} color={T.accent} />
          <Tile icon={Users} label="Alcance" value={<CountUp value={igSum("reach")} />} sub="cuentas alcanzadas" spark={igDias.map((d) => d.reach || 0)} color={T.accent2} />
          <Tile icon={Heart} label="Me gusta" value={<CountUp value={igReels.reduce((a, r) => a + (r.likes || 0), 0)} />} sub={`${fmt(igReels.reduce((a, r) => a + (r.comentarios || 0), 0))} comentarios`} color={T.accent} />
          <Tile icon={Repeat2} label="Compartidos" value={<CountUp value={igReels.reduce((a, r) => a + (r.shares || 0), 0)} />} sub={`${fmt(igReels.reduce((a, r) => a + (r.saved || 0), 0))} guardados`} color={T.accent2} />
          <Tile icon={CalendarClock} label="Esta semana" value={<>{thisWeek.filter((x) => isPublished(x, t0)).length}<small>/{target}</small></>} sub="Reels publicados" color={T.accent} />
          <Tile icon={Play} label="Publicaciones" value={<CountUp value={igs.cuenta.publicaciones} />} sub="en el perfil" color={T.accent} />
        </section>
      ) : p === "tiktok" && tts ? (
        <section className="rd-tiles">
          <Tile icon={Eye} label="Visualizaciones" value={<CountUp value={ttSum("vistas")} />} sub={`${fmt(ttDias.reduce((a, d) => a + d.vistas, 0))} en el periodo`} spark={ttDias.map((d) => d.vistas)} color={T.accent} />
          <Tile icon={Heart} label="Me gusta" value={<CountUp value={tts.cuenta.me_gusta || ttSum("likes")} />} sub={`${fmt(ttSum("comentarios"))} comentarios`} color={T.accent} />
          <Tile icon={Repeat2} label="Compartidos" value={<CountUp value={ttSum("compartidos")} />} sub={`${fmt(ttSum("guardados"))} guardados`} color={T.accent2} />
          <Tile icon={Target} label="Media por vídeo" value={<CountUp value={ttVids.length ? Math.round(ttSum("vistas") / ttVids.length) : 0} />} sub="visualizaciones" color={T.accent2} />
          <Tile icon={CalendarClock} label="Esta semana" value={<>{thisWeek.filter((x) => isPublished(x, t0)).length}<small>/{target}</small></>} sub="vídeos publicados" color={T.accent} />
          <Tile icon={Play} label="Vídeos" value={<CountUp value={tts.cuenta.videos || ttVids.length} />} sub="en el perfil" color={T.accent} />
        </section>
      ) : (
        <section className="rd-tiles">
          <Tile icon={CalendarClock} label="Esta semana" value={<>{thisWeek.filter((x) => isPublished(x, t0)).length}<small>/{target}</small></>} sub={`${thisWeek.length} en el calendario`} spark={perWeek.map((w) => w.value)} color={T.accent} />
          <Tile icon={Flame} label="Racha" value={<>{streak}<small> días</small></>} sub="publicando seguido" color={T.accent2} />
          <Tile icon={Repeat2} label="Media semanal" value={(perWeek.reduce((a, w) => a + w.value, 0) / perWeek.length).toFixed(1).replace(".", ",")} sub="últimas 8 semanas" color={T.accent} />
          <Tile icon={Trophy} label="Mejor semana" value={Math.max(0, ...perWeek.map((w) => w.value))} sub={perWeek.reduce((a, w) => (w.value > a.value ? w : a), perWeek[0])?.label} color={T.accent2} />
        </section>
      )}

      <div className="rd-grid">
        <section className="rd-card">
          <h3>{p === "youtube" ? "Visualizaciones por día" : p === "instagram" && igDias.length ? "Alcance por día" : p === "tiktok" && ttDias.length ? "Visualizaciones por día" : p === "tiktok" && ttPorVideo.length ? "Visualizaciones de cada vídeo" : "Publicado por semana"}</h3>
          <p className="rd-muted">{p === "youtube" ? "Vistas casi en directo (cada 10 min); minutos y me gusta llegan con 1-2 días de retraso." : p === "instagram" && igDias.length ? "Cuentas alcanzadas cada día (Instagram)." : p === "tiktok" && ttDias.length ? "Vistas nuevas cada día (suma de todos los vídeos)." : p === "tiktok" && ttPorVideo.length ? "Por fecha de publicación. Desde mañana, vistas nuevas de cada día." : `Objetivo: ${target} a la semana.`}</p>
          {p === "youtube"
            ? (dias.length ? <ColumnChart data={dias.map((d) => ({ key: d.day, label: dayLbl(d.day), value: d.views, tip: `${dayLbl(d.day)} · ${fmt(d.views)} vistas · +${d.subscribersGained} subs` }))} highlight={dias[dias.length - 1]?.day} color={T.accent} height={220} />
              : <div className="rd-empty sm"><span>Aún sin analítica: activa la YouTube Analytics API.</span></div>)
            : p === "instagram" && igDias.length ? <ColumnChart data={igDias.map((d) => ({ key: d.day, label: dayLbl(d.day), value: d.reach || 0, tip: `${dayLbl(d.day)} · ${fmt(d.reach || 0)} de alcance${d.views ? ` · ${fmt(d.views)} vistas` : ""}` }))} highlight={igDias[igDias.length - 1]?.day} color={T.accent} height={220} />
            : p === "tiktok" && ttDias.length ? <ColumnChart data={ttDias.map((d) => ({ key: d.day, label: dayLbl(d.day), value: d.vistas, tip: `${dayLbl(d.day)} · ${fmt(d.vistas)} vistas` }))} highlight={ttDias[ttDias.length - 1]?.day} color={T.accent} height={220} />
            : p === "tiktok" && ttPorVideo.length ? <ColumnChart data={ttPorVideo.map((v) => ({ key: v.id, label: dayLbl((v.publicado || "").slice(0, 10)), value: v.vistas, tip: `${v.titulo.slice(0, 60)} · ${fmt(v.vistas)} vistas` }))} highlight={ttBest?.id} color={T.accent} height={220} />
            : <ColumnChart data={perWeek} highlight={weeks[weeks.length - 1]} color={T.accent} height={220} />}
        </section>

        <section className="rd-card">
          <h3>{p === "youtube" ? "Próximos Shorts" : "Esta semana"}</h3>
          <div className="rd-list">
            {(p === "youtube" ? programados.map((v) => ({ k: v.id, t: v.titulo, d: v.programado!, img: thumbs[v.id] || (v.privacidad === "public" ? v.miniatura : undefined) })) : thisWeek.map((x) => ({ k: x.id!, t: x.title, d: x.publish_date!, img: undefined })))
              .slice(0, 6).map((x) => (
                <div key={x.k} className="rd-li">
                  {x.img && !badImg[x.k] ? <img src={x.img} alt="" onError={() => setBadImg((b) => ({ ...b, [x.k]: true }))} /> : <BrandLogo platform={p} size={34} />}
                  <div className="mx-grow"><b className="mx-trunc">{x.t}</b><small><Cuenta d={x.d} />{" · "}{shortDate(x.d.slice(0, 10))}{x.d.length > 10 ? ` · ${new Date(x.d).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}` : ""}</small></div>
                </div>
              ))}
            {(p === "youtube" ? programados : thisWeek).length === 0 && <p className="rd-muted">Nada programado.</p>}
          </div>
        </section>
      </div>

      {p === "instagram" && igs && (
        <section className="rd-card">
          <div className="flex items-center justify-between"><h3>Rendimiento de cada Reel</h3>{igBest && (igBest.views || 0) > 0 && <span className="rd-badge"><Trophy /> Ganador: {igBest.titulo.slice(0, 40)}</span>}</div>
          <div className="rd-table">
            <div className="rd-tr rd-th"><span>Reel</span><span>Vistas</span><span>Me gusta</span><span>Coment.</span><span>Alcance</span><span /></div>
            {igReels.map((r) => (
              <a key={r.id} className="rd-tr" href={r.link} target="_blank" rel="noreferrer">
                <span className="rd-vid">{r.miniatura && <img src={r.miniatura} alt="" />}<span><b className="mx-trunc">{r.titulo || "Reel"}</b><small>{r.publicado ? ago(r.publicado) : ""}{r.shares ? ` · ${r.shares} compartidos` : ""}</small></span></span>
                <span className="rd-num">{fmt(r.views || 0)}</span>
                <span className="rd-num"><Heart /> {fmt(r.likes)}</span>
                <span className="rd-num"><MessageCircle /> {fmt(r.comentarios)}</span>
                <span className="rd-num">{fmt(r.reach || 0)}</span>
                <span>{r.id === igBest?.id && (r.views || 0) > 0 ? <em className="rd-win">top</em> : null}</span>
              </a>
            ))}
            {!igReels.length && <p className="rd-muted" style={{ padding: "1rem" }}>Todavía no hay Reels.</p>}
          </div>
        </section>
      )}

      {p === "tiktok" && tts && (
        <section className="rd-card">
          <div className="flex items-center justify-between"><h3>Rendimiento de cada vídeo</h3>{ttBest && ttBest.vistas > 0 && <span className="rd-badge"><Trophy /> Ganador: {ttBest.titulo.slice(0, 40)}</span>}</div>
          <div className="rd-table">
            <div className="rd-tr rd-th"><span>Vídeo</span><span>Vistas</span><span>Me gusta</span><span>Coment.</span><span>Compart.</span><span /></div>
            {ttVids.map((v) => (
              <a key={v.id} className="rd-tr" href={v.link} target="_blank" rel="noreferrer">
                <span className="rd-vid">{v.miniatura && !badImg[v.id] ? <img src={v.miniatura} alt="" referrerPolicy="no-referrer" onError={() => setBadImg((b) => ({ ...b, [v.id]: true }))} /> : null}<span><b className="mx-trunc">{v.titulo || "Vídeo"}</b><small>{v.publicado ? ago(v.publicado) : ""}{v.duracion ? ` · ${v.duracion} s` : ""}{v.guardados ? ` · ${v.guardados} guardados` : ""}</small></span></span>
                <span className="rd-num">{fmt(v.vistas)}</span>
                <span className="rd-num"><Heart /> {fmt(v.likes)}</span>
                <span className="rd-num"><MessageCircle /> {fmt(v.comentarios)}</span>
                <span className="rd-num">{fmt(v.compartidos)}</span>
                <span>{v.id === ttBest?.id && v.vistas > 0 ? <em className="rd-win">top</em> : null}</span>
              </a>
            ))}
            {!ttVids.length && <p className="rd-muted" style={{ padding: "1rem" }}>Todavía no hay vídeos.</p>}
          </div>
        </section>
      )}

      {p === "youtube" && (
        <section className="rd-card">
          <div className="flex items-center justify-between"><h3>Rendimiento de cada Short</h3>{best && best.vistas > 0 && <span className="rd-badge"><Trophy /> Ganador: {best.titulo.slice(0, 40)}</span>}</div>
          <div className="rd-table">
            <div className="rd-tr rd-th"><span>Short</span><span>Vistas</span><span>Me gusta</span><span>Coment.</span><span>% visto</span><span /></div>
            {publicados.map((v) => {
              const pct = v.an?.averageViewPercentage;
              return (
                <a key={v.id} className="rd-tr" href={`https://youtube.com/shorts/${v.id}`} target="_blank" rel="noreferrer">
                  <span className="rd-vid">{v.miniatura && <img src={v.miniatura} alt="" />}<span><b className="mx-trunc">{v.titulo}</b><small>{v.publicado ? ago(v.publicado) : ""} · {secs(v.duracion)} s</small></span></span>
                  <span className="rd-num">{fmt(v.vistas)}</span>
                  <span className="rd-num"><Heart /> {fmt(v.likes)}</span>
                  <span className="rd-num"><MessageCircle /> {fmt(v.comentarios)}</span>
                  <span>{typeof pct === "number" ? <Ring pct={pct} size={38} color={pct < 40 ? "#e5484d" : T.accent} /> : <small className="rd-muted">48 h</small>}</span>
                  <span>{typeof pct === "number" && pct < 40 ? <em className="rd-alert">acortar</em> : v.id === best?.id && v.vistas > 0 ? <em className="rd-win">top</em> : null}</span>
                </a>
              );
            })}
            {!publicados.length && <p className="rd-muted" style={{ padding: "1rem" }}>Todavía no hay Shorts públicos.</p>}
          </div>
        </section>
      )}
    </div>
  );
}

/** cuenta atrás hasta la hora de publicación («en 2 d 5 h», «en 3 h 12 min», «en 04:32»); se refresca cada segundo */
function Cuenta({ d }: { d: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  const t = new Date(d.length > 10 ? d : `${d}T00:00:00`).getTime() - now;
  if (t <= 0) return <span className="rd-cd">Publicado</span>;
  const s = Math.floor(t / 1000), dd = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
  const p2 = (n: number) => String(n).padStart(2, "0");
  const txt = dd > 0 ? `en ${dd} d ${h} h` : h > 0 ? `en ${h} h ${p2(m)} min` : `en ${p2(m)}:${p2(ss)}`;
  return <span className={`rd-cd${t < 3600e3 ? " soon" : ""}`}>{txt}</span>;
}
