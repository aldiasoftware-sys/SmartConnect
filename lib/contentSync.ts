import { supabase } from "./supabase";
import { Kit, StoredFile, bucketExists, groupKits, isDiscarded, listAll, listDiscarded, pruneDiscarded, readText } from "./files";
import { Post, addDays, fromISO, today } from "./social";
import { deleteRow, listRows, saveRow, tableMode } from "./store";
import { TEAM, isShared } from "./team";

// Archivos → Calendario: cada vídeo que entra en Archivos aparece solo en el calendario (una pieza de TikTok, otra de LinkedIn
// y otra de Instagram si trae su pie de foto),
// se actualiza si se cambian sus textos y desaparece si se borra. Lo publicado o con fecha pasada se queda (historial y fallos).
// Si una pieza se borra a mano en el calendario, queda descartada (lib/files.ts) y no se vuelve a crear aunque su vídeo siga en Archivos.
// Cada carpeta de Archivos va al calendario de su persona: Archivos › Alejandro → calendario de Millán; Archivos › Guille → el de Guille.
const OWNER: Record<string, string> = Object.fromEntries(TEAM.map((m) => [m.folder, m.owner]));

/** Se publica de lunes a viernes; el sábado se graba y el domingo se plantea la semana. */
export const isPublishDay = (d: string) => { const w = fromISO(d).getDay(); return w >= 1 && w <= 5; };

/** Primer día de lunes a viernes, desde `from`, en el que esa red tiene hueco EN EL CALENDARIO DE ESA PERSONA
 *  (cada uno tiene el suyo: 1 publicación al día por red y persona como máximo; lo conjunto cuenta en los dos).
 *  Un hueco es un día sin nada en esa red o con una pieza de la semana tipo aún vacía (en «Idea» y sin vídeo), que se aprovecha. */
function firstSlot(posts: Post[], platform: string, from: string, owner: string): { day: string; reuse?: Post } {
  for (let i = 0; i < 120; i++) {
    const d = addDays(from, i); if (!isPublishDay(d)) continue;
    // lo que sale de Archivos › Aldia va a las cuentas de la marca: no ocupa el hueco de la cuenta personal
    const there = posts.filter((p) => p.publish_date === d && p.platform === platform && (p.owner === owner || (isShared(p.owner) && !p.archivo)));
    if (!there.length) return { day: d };
    const idea = there.find((p) => p.status === "idea" && !p.archivo);
    if (there.length === 1 && idea) return { day: d, reuse: idea };
  }
  return { day: from };
}

async function texts(kit: Kit) {
  let li = "", tt = "";
  if (kit.linkedin) { const t = await readText(kit.linkedin.path).catch(() => ""); li = (t.match(/T[IÍ]TULO\s*\n([^\n]+)/i)?.[1] || "").trim(); }
  if (kit.tiktok) tt = (await readText(kit.tiktok.path).catch(() => "")).trim().split("\n")[0];
  return { li: li || kit.name, tt: tt || kit.name };
}

let running: Promise<boolean> | null = null;

/** Pone el calendario al día con Archivos. Devuelve true si ha cambiado algo. */
export function syncCalendarWithFiles() {
  if (!running) running = run().catch((e) => { console.warn("Archivos → Calendario:", e?.message || e); return false; }).finally(() => { running = null; });
  return running;
}

async function run() {
  if ((await tableMode("content_posts")) === "local" || !(await bucketExists())) return false;
  // hace falta la columna «archivo» (archivos_setup.sql)
  const probe = await supabase.from("content_posts").select("archivo").limit(1);
  if (probe.error) return false;

  const files = await listAll();
  const folders = new Map<string, StoredFile[]>();
  for (const f of files) { const k = `${f.person}/${f.date}`; folders.set(k, [...(folders.get(k) || []), f]); }
  const posts = await listRows<Post>("content_posts");
  const discarded = await listDiscarded().catch(() => new Set<string>());
  const t = today(); let changed = false; const alive = new Set<string>();

  for (const [folder, fs] of Array.from(folders.entries())) {
    const [person, date] = folder.split("/");
    for (const kit of groupKits(fs).kits) {
      if (!kit.video) continue;
      const key = `${folder}/${kit.name}`; alive.add(key);
      const { li, tt } = await texts(kit);
      const want = [
        { platform: "tiktok", kind: "video", owner: OWNER[person] || person, title: tt },
        ...(kit.linkedin ? [{ platform: "linkedin", kind: "post", owner: OWNER[person] || person, title: li }] : []),
        ...(kit.instagram ? [{ platform: "instagram", kind: "video", owner: OWNER[person] || person, title: tt.split("#")[0].trim() || kit.name }] : []),
      ];
      for (const w of want) {
        const cur = posts.find((p) => p.archivo === key && p.platform === w.platform);
        if (!cur && isDiscarded(discarded, key, w.platform)) continue;   // la borraron a mano en el calendario
        if (!cur) {
          const { day, reuse } = firstSlot(posts, w.platform, date > t ? date : t, w.owner);
          try {
            const row = { ...(reuse || {}), ...w, kind: reuse?.kind || w.kind, publish_date: day, status: "montado", archivo: key, notes: `Desde Archivos › ${person} › ${date}` } as Post;
            const saved = await saveRow<Post>("content_posts", row);
            if (reuse) Object.assign(reuse, saved); else posts.push(saved);
            changed = true;
          } catch { /* ya lo había creado otro (índice único) */ }
        } else if (cur.status !== "publicado" && cur.title !== w.title) {
          await saveRow<Post>("content_posts", { ...cur, title: w.title }); cur.title = w.title; changed = true;
        }
      }
    }
  }

  // borrado en Archivos → fuera del calendario, salvo lo publicado o con fecha pasada
  for (const p of posts) {
    if (!p.archivo || alive.has(p.archivo) || p.status === "publicado" || (p.publish_date && p.publish_date < t)) continue;
    await deleteRow("content_posts", p.id!); changed = true;
  }
  await pruneDiscarded(discarded, alive).catch(() => { /* se reintenta en la próxima sincronización */ });
  return changed;
}
