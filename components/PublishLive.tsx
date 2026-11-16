"use client";

// «Publicación en directo»: lo que el PC está subiendo, lo programado y lo ya publicado en YouTube e Instagram (dos al día:
// Millán 11:00 y Guille 12:00). Lo escribe la skill aldia-youtube (app_settings «publicando») mientras trabaja; aquí se lee cada 4 s.
// TikTok aún no se publica solo (la API sin auditar solo publica en privado): cada vídeo sale como «toca subirlo» con un «Hecho».
import { useEffect, useState } from "react";
import { Check, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BrandLogo } from "@/components/AccountIcon";

type Fase = "subiendo" | "procesando" | "programado" | "publicado" | "error" | "pendiente";
type Item = { clave: string; red: "youtube" | "instagram" | "tiktok"; fase: Fase; quien?: string;
  titulo: string; pct?: number | null; hora?: string | null; link?: string | null; dia: string; at: string };

const DIA = (iso: string) => {
  const d = new Date(iso), hoy = new Date(), man = new Date(); man.setDate(hoy.getDate() + 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  return same(d, hoy) ? "hoy" : same(d, man) ? "mañana" : d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
};
const HORA = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
const QUIEN: Record<string, string> = { millan: "Millán", guille: "Guille" };

export default function PublishLive({ dark = false }: { dark?: boolean }) {
  const [raw, setRaw] = useState<Record<string, Item>>({});
  const [, setTick] = useState(0);
  const load = async () => {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "publicando").maybeSingle();
    setRaw((data?.value as Record<string, Item>) || {});
  };
  useEffect(() => {
    load(); const t = setInterval(() => { load(); setTick((x) => x + 1); }, 4000);
    return () => clearInterval(t);
  }, []);

  async function hecho(i: Item) {
    const { data } = await supabase.from("app_settings").select("value").eq("key", "publicando").maybeSingle();
    const val = { ...((data?.value as Record<string, Item>) || {}) };
    val[`${i.clave}|tiktok`] = { ...i, red: "tiktok", fase: "publicado", hora: new Date().toISOString(), link: null, at: new Date().toISOString() };
    await supabase.from("app_settings").upsert({ key: "publicando", value: val, updated_at: new Date().toISOString() }, { onConflict: "key" });
    setRaw(val);
  }

  const now = Date.now();
  const base = Object.values(raw);
  // TikTok a mano: un «toca subirlo» por cada vídeo de YouTube de hoy o mañana que aún no esté marcado
  const tiktok: Item[] = base.filter((i) => i.red === "youtube" && i.hora && !raw[`${i.clave}|tiktok`]
    && new Date(i.hora).getTime() < now + 30 * 3600e3 && now - new Date(i.hora).getTime() < 30 * 3600e3)
    .map((i) => ({ ...i, red: "tiktok", fase: "pendiente", link: null }));
  const shown = [...base, ...tiktok]
    .map((i) => (i.fase === "programado" && i.hora && new Date(i.hora).getTime() <= now ? { ...i, fase: "publicado" as const } : i))
    .filter((i) => i.fase !== "publicado" || (i.hora && now - new Date(i.hora).getTime() < 30 * 3600e3))
    .filter((i) => i.fase !== "programado" || (i.hora && new Date(i.hora).getTime() - now < 36 * 3600e3))
    .sort((a, b) => {
      const w = (x: Item) => (x.fase === "subiendo" || x.fase === "procesando" ? 0 : x.fase === "error" ? 1 : x.fase === "pendiente" ? 2 : x.fase === "programado" ? 3 : 4);
      return (a.hora || "").localeCompare(b.hora || "") || w(a) - w(b) || a.red.localeCompare(b.red);
    });
  const mas = base.filter((i) => i.fase === "programado" && i.hora && new Date(i.hora).getTime() - now >= 36 * 3600e3).length;
  if (!shown.length) return null;

  return (
    <section className={`pl ${dark ? "dark" : ""}`}>
      <div className="pl-head"><span className="pl-live" /> Publicación en directo <small>Millán 11:00 · Guille 12:00 · lo que hace el PC, al momento</small></div>
      <div className="pl-list">
        {shown.map((i) => (
          <div key={`${i.clave}|${i.red}`} className={`pl-item ${i.fase}`}>
            <BrandLogo platform={i.red} size={28} />
            <div className="pl-txt">
              <b title={i.titulo}>{i.titulo || i.clave}</b>
              {i.fase === "subiendo" || i.fase === "procesando" ? (
                <div className="pl-bar"><div style={{ width: `${Math.max(4, i.pct ?? 5)}%` }} /></div>
              ) : i.quien ? <small className="pl-who">{QUIEN[i.quien] || i.quien}</small> : null}
            </div>
            <span className="pl-state">
              {i.fase === "subiendo" && <>Subiendo… {i.pct ?? 0} %</>}
              {i.fase === "procesando" && <>Procesando…</>}
              {i.fase === "programado" && i.hora && <>Programado · {DIA(i.hora)} {HORA(i.hora)}</>}
              {i.fase === "publicado" && <>Publicado{i.hora ? ` · ${DIA(i.hora)} ${HORA(i.hora)}` : ""}</>}
              {i.fase === "pendiente" && <>Toca subirlo · {i.hora ? `${DIA(i.hora)} ${HORA(i.hora)}` : "hoy"}</>}
              {i.fase === "error" && <>Error al subir</>}
            </span>
            {i.fase === "pendiente" ? <button className="pl-done" onClick={() => hecho(i)} title="Ya lo he subido a TikTok"><Check /> Hecho</button>
              : i.link ? <a className="pl-open" href={i.link} target="_blank" rel="noreferrer" aria-label="Abrir"><ExternalLink /></a> : null}
          </div>
        ))}
      </div>
      {mas > 0 && <p className="pl-more">+{mas} programados para los próximos días</p>}
    </section>
  );
}
