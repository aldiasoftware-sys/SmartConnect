"use client";

// «Cómo funciona»: guía corta de la publicación automática, una por persona (pedido de Guille, 20-11-2026).
// En la raíz de Archivos salen las dos; dentro de una carpeta, solo la de su dueño. Si cambia el sistema, cambia este texto.
import { Info } from "lucide-react";

type Guia = { titulo: string; carpeta: string; pasos: string[] };

const GUIAS: Record<string, Guia> = {
  "Aldia (Guille)": {
    titulo: "Guille · desde su Mac, a las 17:00",
    carpeta: "Aldia (Guille)",
    pasos: [
      "El Mac hace un vídeo al día con 4 días de antelación (unas 2–2,5 h cada uno) y lo deja aquí, en la carpeta del día en que se publica. Mientras lo hace, esa carpeta ya aparece con «Creando vídeo» y el paso en el que va.",
      "En cuanto llega, el Mac lo programa en YouTube para las 17:00 de ese día y a esa hora publica el Reel de Instagram. Si el Mac está dormido, sale al despertarlo.",
      "TikTok, a mano: el máster 4K está en Películas › TikTok 4K y el título en «… - TikTok titulo.txt». Cuando lo subas, pulsa «Hecho» en Contenido.",
      "Cuando ya está en YouTube e Instagram (y TikTok marcado «Hecho», o han pasado 7 días), se borra solo de aquí para liberar espacio.",
      "Para que todo salga: Mac enchufado y con la tapa abierta por la mañana y a las 17:00.",
    ],
  },
  Alejandro: {
    titulo: "Millán · desde su PC, a las 11:00",
    carpeta: "Millán",
    pasos: [
      "El PC sube aquí cada vídeo que haces con aldia-viral (la copia ligera, la miniatura y los textos), en la carpeta de su día.",
      "El PC lo programa en YouTube para las 11:00 y a esa hora publica el Reel de Instagram. Si el PC está apagado, sale al encenderlo.",
      "TikTok, a mano: el máster 4K está en Vídeos › TikTok 4K. Cuando lo subas, pulsa «Hecho» en Contenido.",
      "En cuanto está en YouTube e Instagram, el vídeo se borra solo de aquí; la miniatura y los textos se quedan hasta que caducan.",
      "El PC de Millán solo hace su turno: lo de «Aldia (Guille)» lo publica el Mac de Guille.",
    ],
  },
};

const COMUN = [
  "Calendario: cada vídeo que llega a Archivos crea solo sus filas de TikTok e Instagram; la de YouTube la apunta el PC o el Mac al programarlo.",
  "Contenido › «Publicación de la semana» enseña en directo en qué punto está cada vídeo (subiendo, programado o publicado).",
  "Todo lo de Archivos caduca a los 8 días de su fecha, aunque no se haya publicado.",
];

function Bloque({ g }: { g: Guia }) {
  return (
    <div>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{g.titulo}</div>
      <ol style={{ margin: 0, paddingLeft: "1.1rem", display: "grid", gap: 4 }}>
        {g.pasos.map((p) => <li key={p}>{p}</li>)}
      </ol>
    </div>
  );
}

export function ComoFunciona({ carpeta }: { carpeta?: string | null }) {
  const guias = carpeta ? (GUIAS[carpeta] ? [GUIAS[carpeta]] : []) : Object.values(GUIAS);
  if (!guias.length) return null;
  return (
    <details className="card" style={{ marginTop: "1.5rem", fontSize: "0.875rem", lineHeight: 1.55, color: "var(--text-secondary)" }} open={!carpeta}>
      <summary style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: 8, color: "var(--ink)", fontWeight: 500 }}>
        <Info style={{ width: 16, height: 16 }} /> Cómo funciona la publicación automática{carpeta ? ` (${guias[0].carpeta})` : ""}
      </summary>
      <div style={{ display: "grid", gap: "1.25rem", gridTemplateColumns: guias.length > 1 ? "repeat(auto-fit, minmax(280px, 1fr))" : "1fr", marginTop: "1rem" }}>
        {guias.map((g) => <Bloque key={g.titulo} g={g} />)}
      </div>
      <ul style={{ margin: "1rem 0 0", paddingLeft: "1.1rem", display: "grid", gap: 4 }}>
        {COMUN.map((p) => <li key={p}>{p}</li>)}
      </ul>
    </details>
  );
}
