import { supabase } from "./supabase";
import { Kit, StoredFile, bucketExists, groupKits, listAll, readText } from "./files";
import { Post, addDays, today } from "./social";
import { deleteRow, listRows, saveRow, tableMode } from "./store";

// Archivos → Calendario: cada vídeo que entra en Archivos aparece solo en el calendario (una pieza de TikTok y otra de LinkedIn),
// se actualiza si se cambian sus textos y desaparece si se borra. Lo publicado o con fecha pasada se queda (historial y fallos).
const OWNER: Record<string, string> = { Guille: "Guille", Alejandro: "Millán" };

/** Primer día desde `from` en el que esa red no tiene nada (1 publicación al día por red como máximo). */
function firstFree(posts: Post[], platform: string, from: string) {
  for (let i = 0; i < 90; i++) { const d = addDays(from, i); if (!posts.some((p) => p.publish_date === d && p.platform === platform)) return d; }
  return from;
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
      ];
      for (const w of want) {
        const cur = posts.find((p) => p.archivo === key && p.platform === w.platform);
        if (!cur) {
          const day = firstFree(posts, w.platform, date > t ? date : t);
          try {
            const saved = await saveRow<Post>("content_posts", { ...w, publish_date: day, status: "montado", archivo: key, notes: `Desde Archivos › ${person} › ${date}` });
            posts.push(saved); changed = true;
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
  return changed;
}
