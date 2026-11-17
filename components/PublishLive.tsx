"use client";

// «Publicación de la semana»: un bloque por día (lunes → domingo) y, dentro, cada vídeo en su hora (Millán 11:00, Guille 12:00)
// con el estado en YouTube, Instagram y TikTok. Lo escribe la skill aldia-youtube (app_settings «publicando») mientras trabaja
// y aquí se relee cada 4 s. TikTok aún va a mano: «Toca subirlo» con un «Hecho».
import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BrandLogo } from "@/components/AccountIcon";

type Red = "youtube" | "instagram" | "tiktok";
type Fase = "subiendo" | "procesando" | "programado" | "publicado" | "error";
type Item = { clave: string; red: Red; fase: Fase; quien?: string; archivo?: string | null; titulo: string; pct?: number | null; hora?: string | null; link?: string | null; dia: string; at: string };

const QUIEN: Record<string, string> = { millan: "Millán", guille: "Guille" };
const REDES: Red[] = ["youtube", "instagram", "tiktok"];
const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const lunes = (d = new Date()) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); return x; };
const HORA = (s?: string | null) => (s ? new Date(s).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "");
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

export default function PublishLive({ dark = false }: { dark?: boolean }) {
  const [raw, setRaw] = useState<Record<string, Item>>({});
  const [semana, setSemana] = useState(0);   // 0 = esta semana
  const [, setTick] = useState(0);
  const load = async () => {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "publicando").maybeSingle();
    setRaw((data?.value as Record<string, Item>) || {});
  };
  useEffect(() => { load(); const t = setInterval(() => { load(); setTick((x) => x + 1); }, 4000); return () => clearInterval(t); }, []);

  async function hecho(v: { clave: string; titulo: string; quien?: string }) {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "publicando").maybeSingle();
    const val = { ...((data?.value as Record<string, Item>) || {}) };
    const at = new Date().toISOString();
    val[`${v.clave}|tiktok`] = { clave: v.clave, red: "tiktok", fase: "publicado", titulo: v.titulo, quien: v.quien, hora: at, dia: at.slice(0, 10), at, link: null };
    await supabase.from("app_settings").upsert({ key: "publicando", value: val, updated_at: at }, { onConflict: "key" });
    setRaw(val);
  }

  const now = Date.now();
  const fase = (i?: Item): Fase | undefined => (i && i.fase === "programado" && i.hora && new Date(i.hora).getTime() <= now ? "publicado" : i?.fase);

  // un vídeo = todas sus redes; su día y hora son los de YouTube (o los de la primera red que tenga)
  const videos = new Map<string, { clave: string; titulo: string; quien?: string; hora: string; archivo?: string | null; redes: Partial<Record<Red, Item>> }>();
  for (const i of Object.values(raw)) {
    const v = videos.get(i.clave) || { clave: i.clave, titulo: i.titulo, quien: i.quien, hora: i.hora || i.at, redes: {} };
    v.redes[i.red] = i;
    if (i.red === "youtube" && i.hora) v.hora = i.hora;
    if (!v.quien && i.quien) v.quien = i.quien;
    if (!v.archivo && i.archivo) v.archivo = i.archivo;
    if (i.titulo && (i.red === "youtube" || !v.titulo)) v.titulo = i.titulo;
    videos.set(i.clave, v);
  }
  const ini = lunes(); ini.setDate(ini.getDate() + 7 * semana);
  const dias = Array.from({ length: 7 }, (_, k) => { const d = new Date(ini); d.setDate(ini.getDate() + k); return d; });
  const hoy = iso(new Date());
  const porDia = (d: Date) => [...videos.values()].filter((v) => iso(new Date(v.hora)) === iso(d)).sort((a, b) => a.hora.localeCompare(b.hora));
  const TURNOS = [{ hora: "11:00", quien: "millan" }, { hora: "12:00", quien: "guille" }];
  const faltan = (d: Date, vs: ReturnType<typeof porDia>) => (iso(d) < hoy ? [] : TURNOS.filter((t) => !vs.some((v) => v.quien === t.quien && v.redes.youtube)));
  const total = dias.reduce((n, d) => n + porDia(d).length, 0);
  const enCurso = Object.values(raw).filter((i) => i.fase === "subiendo" || i.fase === "procesando").length;

  const chip = (v: { clave: string; titulo: string; quien?: string; hora: string; redes: Partial<Record<Red, Item>> }, red: Red) => {
    const i = v.redes[red]; const f = fase(i);
    // TikTok: al acabar su día se da por subido aunque no se pulsara «Hecho»
    if (red === "tiktok" && f !== "publicado" && iso(new Date(v.hora)) < hoy) return <span className="pw-chip ok"><BrandLogo platform="tiktok" size={16} /><span>Hecho</span></span>;
    if (red === "tiktok" && f !== "publicado") {
      return <span className="pw-chip pend"><BrandLogo platform="tiktok" size={16} /><span>A mano</span>
        <button className="pw-done" onClick={() => hecho(v)} title="Ya lo he subido a TikTok"><Check /> Hecho</button></span>;
    }
    if (!i && red === "youtube") return <span className="pw-chip off"><BrandLogo platform="youtube" size={16} /><span>No va</span></span>;
    const pasada = new Date(v.hora).getTime() < now;
    const txt = f === "subiendo" ? `Subiendo ${i?.pct ?? 0} %` : f === "procesando" ? "Procesando…" : f === "publicado" ? `Publicado ${HORA(i?.hora)}`
      : f === "programado" ? `Programado ${HORA(i?.hora)}` : f === "error" ? "Error" : pasada ? "Pendiente" : `Saldrá a las ${HORA(v.hora)}`;
    const cls = f === "subiendo" || f === "procesando" ? "run" : f === "publicado" ? "ok" : f === "programado" ? "plan" : f === "error" ? "bad" : pasada ? "late" : "wait";
    const inner = <><BrandLogo platform={red} size={16} /><span>{txt}</span>{(f === "subiendo" || f === "procesando") && <i className="pw-run" style={{ width: `${f === "procesando" ? 100 : Math.max(6, i?.pct ?? 6)}%` }} />}</>;
    return i?.link ? <a className={`pw-chip ${cls}`} href={i.link} target="_blank" rel="noreferrer" title="Abrir">{inner}</a> : <span className={`pw-chip ${cls}`}>{inner}</span>;
  };

  return (
    <section className={`pw ${dark ? "dark" : ""}`}>
      <header className="pw-head">
        <span className={`pw-live ${enCurso ? "busy" : ""}`} />
        <b>Publicación de la semana</b>
        <small>{enCurso ? "el PC está subiendo ahora mismo" : "Millán 11:00 · Guille 12:00"}</small>
        <div className="pw-nav">
          <button onClick={() => setSemana(semana - 1)} aria-label="Semana anterior"><ChevronLeft /></button>
          <span>{semana === 0 ? "Esta semana" : `${dias[0].getDate()}–${dias[6].getDate()} ${dias[6].toLocaleDateString("es-ES", { month: "short" })}`}</span>
          <button onClick={() => setSemana(semana + 1)} aria-label="Semana siguiente"><ChevronRight /></button>
        </div>
      </header>
      {total === 0 ? <p className="pw-empty">Nada programado esta semana.</p> : (
        <div className="pw-days">
          {dias.map((d, k) => {
            const vs = porDia(d); const esHoy = iso(d) === hoy; const pasado = iso(d) < hoy;
            return (
              <div key={k} className={`pw-day ${esHoy ? "today" : ""} ${pasado ? "past" : ""} ${vs.length ? "" : "pw-free"}`}>
                <div className="pw-date"><b>{esHoy ? "Hoy" : DIAS[k]}</b><span>{esHoy ? DIAS[k].toLowerCase() : ""} {d.getDate()}</span></div>
                <div className="pw-rows">
                  {[...faltan(d, vs).map((t) => ({ t, v: null as null | (typeof vs)[number] })), ...vs.map((v) => ({ t: null, v }))]
                    .sort((a, b) => (a.t ? a.t.hora : HORA(a.v!.hora)).localeCompare(b.t ? b.t.hora : HORA(b.v!.hora)))
                    .map(({ t, v }) => t ? (
                    <div key={`f-${t.quien}`} className="pw-row ghost">
                      <span className="pw-time">{t.hora}</span>
                      <span className={`pw-who ${t.quien}`}>{QUIEN[t.quien]}</span>
                      <span className="pw-title">Falta vídeo</span>
                      <span className="pw-chips" />
                    </div>
                  ) : v && (
                    <div key={v.clave} className="pw-row">
                      <span className="pw-time">{HORA(v.hora)}</span>
                      <span className={`pw-who ${v.quien || ""}`}>{QUIEN[v.quien || ""] || "—"}</span>
                      {v.archivo ? <a className="pw-title link" href={`/archivos?abrir=${encodeURIComponent(v.archivo)}`} title={`Abrir en Archivos · ${v.titulo}`}>{v.titulo}</a>
                        : <span className="pw-title" title={v.titulo}>{v.titulo}</span>}
                      <span className="pw-chips">{REDES.map((r) => <span key={r}>{chip(v, r)}</span>)}</span>
                    </div>
                  ))}
                  {pasado && vs.length === 0 && <span className="pw-none">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
