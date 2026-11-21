"use client";

// «Creando vídeo»: el Mac de Guille deja _creando.json en Archivos › Aldia (Guille) › <día> mientras hace el vídeo de ese día
// (sc.py estado, en cada fase de diario.sh) y lo quita al subirlo. Aquí se pinta en la carpeta del día (21-11-2026).
import { AlertTriangle, Loader2, PauseCircle } from "lucide-react";
import type { Creando } from "@/lib/files";

const FASES = ["Noticia y guion", "Voz", "Escenas 3D", "Render en Blender", "Revisión", "Subida"];
const PARADO_MIN = 180;   // sin avances en 3 h (el render a 1080 tarda ~1,3 h) → seguramente el Mac se apagó o se durmió

const hora = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }) : "");
const diaHora = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso), hoy = new Date();
  return d.toDateString() === hoy.toDateString() ? hora(iso) : `${d.toLocaleDateString("es-ES", { day: "numeric", month: "short" })} ${hora(iso)}`;
};

export function estadoCreando(c: Creando): "error" | "parado" | "activo" {
  if (c.error) return "error";
  return (Date.now() - new Date(c.actualizado).getTime()) / 60000 > PARADO_MIN ? "parado" : "activo";
}

const COLOR = {
  activo: { bg: "var(--accent-soft)", fg: "var(--accent)" },
  parado: { bg: "var(--bg-surface)", fg: "var(--text-secondary)" },
  error: { bg: "var(--warn-soft)", fg: "var(--warn)" },
};

function Icono({ e, size = 13 }: { e: ReturnType<typeof estadoCreando>; size?: number }) {
  const st = { width: size, height: size, flexShrink: 0 };
  return e === "activo" ? <Loader2 className="creando-spin" style={st} /> : e === "parado" ? <PauseCircle style={st} /> : <AlertTriangle style={st} />;
}

/** Etiqueta corta para la tarjeta de la carpeta del día (y la de la persona). */
export function CreandoChip({ c }: { c: Creando }) {
  const e = estadoCreando(c), col = COLOR[e];
  const txt = e === "error" ? "Falló al crear el vídeo" : e === "parado" ? "Creación en pausa" : `Creando vídeo · ${c.paso || 1}/${c.pasos || 6}`;
  return <span className="chip" style={{ background: col.bg, color: col.fg }}><Icono e={e} /> {txt}</span>;
}

/** Tarjeta grande dentro de la carpeta del día: título, fase y progreso. */
export function CreandoCard({ c }: { c: Creando }) {
  const e = estadoCreando(c), col = COLOR[e], paso = c.paso || 1, pasos = c.pasos || FASES.length;
  return (
    <div className="card" style={{ borderColor: col.fg, borderStyle: e === "activo" ? "dashed" : "solid" }}>
      <div className="flex items-center gap-2" style={{ color: col.fg, fontWeight: 600, fontSize: "0.8125rem", marginBottom: 6 }}>
        <Icono e={e} size={16} />
        {e === "error" ? "No se pudo terminar el vídeo" : e === "parado" ? "Creación en pausa" : "Creando vídeo"}
      </div>
      <div style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em", marginBottom: 4 }}>{c.titulo || "Buscando la noticia del día…"}</div>
      <div className="section-sub" style={{ marginBottom: 14 }}>
        {e === "error" ? c.error
          : e === "parado" ? `Sin avances desde las ${diaHora(c.actualizado)} (paso «${c.fase || FASES[paso - 1]}»). Seguramente el Mac se apagó o se durmió; sigue solo en cuanto vuelva a estar encendido.`
          : `Paso ${paso} de ${pasos}: ${c.fase || FASES[paso - 1]}${c.desde ? ` · desde las ${diaHora(c.desde)}` : ""}. Lo hace el Mac de Guille y aparecerá aquí al terminar.`}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${pasos}, 1fr)`, gap: 6 }}>
        {FASES.slice(0, pasos).map((f, i) => {
          const hecho = i + 1 < paso, ahora = i + 1 === paso;
          return (
            <div key={f} title={f}>
              <div style={{ height: 6, borderRadius: 99, background: hecho ? "var(--ink)" : ahora ? col.fg : "var(--border-color)" }} className={ahora && e === "activo" ? "creando-pulso" : undefined} />
              <div className="text-xs" style={{ marginTop: 6, color: hecho || ahora ? "var(--ink)" : "var(--text-muted)", fontWeight: ahora ? 600 : 400, lineHeight: 1.25 }}>{f}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
