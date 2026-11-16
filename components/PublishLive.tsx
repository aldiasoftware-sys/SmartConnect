"use client";

// «Publicación en directo»: lo que el PC está subiendo, lo programado y lo ya publicado en YouTube e Instagram.
// Lo escribe la skill aldia-youtube (app_settings «publicando») mientras trabaja; aquí se lee cada 4 s.
import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { BrandLogo } from "@/components/AccountIcon";

type Item = { clave: string; red: "youtube" | "instagram" | "tiktok"; fase: "subiendo" | "procesando" | "programado" | "publicado" | "error";
  titulo: string; pct?: number | null; hora?: string | null; link?: string | null; dia: string; at: string };

const DIA = (iso: string) => {
  const d = new Date(iso), hoy = new Date(), man = new Date(); man.setDate(hoy.getDate() + 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  return same(d, hoy) ? "hoy" : same(d, man) ? "mañana" : d.toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
};
const HORA = (iso: string) => new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

export default function PublishLive({ dark = false }: { dark?: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let stop = false;
    const load = async () => {
      const { data } = await supabase.from("app_settings").select("value").eq("key", "publicando").maybeSingle();
      if (!stop) setItems(Object.values((data?.value as Record<string, Item>) || {}));
    };
    load(); const t = setInterval(() => { load(); setTick((x) => x + 1); }, 4000);
    return () => { stop = true; clearInterval(t); };
  }, []);

  const now = Date.now();
  // un programado cuya hora ya pasó se enseña como publicado
  const shown = items.map((i) => (i.fase === "programado" && i.hora && new Date(i.hora).getTime() <= now ? { ...i, fase: "publicado" as const } : i))
    .filter((i) => i.fase !== "publicado" || (i.hora && now - new Date(i.hora).getTime() < 36 * 3600e3))
    .sort((a, b) => {
      const w = (x: Item) => (x.fase === "subiendo" || x.fase === "procesando" ? 0 : x.fase === "error" ? 1 : x.fase === "programado" ? 2 : 3);
      return w(a) - w(b) || (a.hora || "").localeCompare(b.hora || "");
    });
  if (!shown.length) return null;
  void tick;

  return (
    <section className={`pl ${dark ? "dark" : ""}`}>
      <div className="pl-head"><span className="pl-live" /> Publicación en directo <small>lo que hace el PC, al momento</small></div>
      <div className="pl-list">
        {shown.map((i) => (
          <div key={`${i.clave}|${i.red}`} className={`pl-item ${i.fase}`}>
            <BrandLogo platform={i.red} size={28} />
            <div className="pl-txt">
              <b title={i.titulo}>{i.titulo || i.clave}</b>
              {i.fase === "subiendo" || i.fase === "procesando" ? (
                <div className="pl-bar"><div style={{ width: `${Math.max(4, i.pct ?? 5)}%` }} /></div>
              ) : null}
            </div>
            <span className="pl-state">
              {i.fase === "subiendo" && <>Subiendo… {i.pct ?? 0} %</>}
              {i.fase === "procesando" && <>Procesando…</>}
              {i.fase === "programado" && i.hora && <>Programado · {DIA(i.hora)} {HORA(i.hora)}</>}
              {i.fase === "publicado" && <>Publicado{i.hora ? ` · ${DIA(i.hora)} ${HORA(i.hora)}` : ""}</>}
              {i.fase === "error" && <>Error al subir</>}
            </span>
            {i.link && <a className="pl-open" href={i.link} target="_blank" rel="noreferrer" aria-label="Abrir"><ExternalLink /></a>}
          </div>
        ))}
      </div>
    </section>
  );
}
