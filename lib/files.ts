import { supabase } from "./supabase";
import { addDays, today, toISO } from "./social";

// «Drive» de Smart Connect sobre Supabase Storage: Guille | Alejandro / AAAA-MM-DD / archivos.
// Cada archivo vive 14 días contando el de subida: lo subido el día 1 se borra el día 14.
export const BUCKET = "contenido";
export const PEOPLE = ["Guille", "Alejandro"];
export const KEEP_DAYS = 14;

export type StoredFile = { path: string; name: string; size: number; mime: string; created: string; person: string; date: string };

const store = () => supabase.storage.from(BUCKET);

/** Día (local) en que se sube y día en que se borra. */
export const uploadedOn = (created: string) => toISO(new Date(created));
export const deletesOn = (created: string) => addDays(uploadedOn(created), KEEP_DAYS - 1);
export const isExpired = (created: string) => today() >= deletesOn(created);

async function listDir(prefix: string) {
  const { data, error } = await store().list(prefix, { limit: 1000, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;
  return data || [];
}

/** ¿Existe el espacio de archivos? (archivos_setup.sql deja leer su ficha; listar uno inexistente da lista vacía, no error) */
export async function bucketExists() {
  const { data, error } = await supabase.storage.getBucket(BUCKET);
  return !error && !!data;
}

/** Todos los archivos (persona / fecha / archivo). Las carpetas que empiezan por «.» son internas y no salen. */
export async function listAll(): Promise<StoredFile[]> {
  const out: StoredFile[] = [];
  for (const person of await listDir("")) {
    if (person.id || person.name.startsWith(".")) continue; // solo carpetas de persona
    for (const day of await listDir(person.name)) {
      if (day.id) continue;
      for (const f of await listDir(`${person.name}/${day.name}`)) {
        if (!f.id || f.name === ".emptyFolderPlaceholder") continue;
        out.push({
          path: `${person.name}/${day.name}/${f.name}`, name: f.name, person: person.name, date: day.name,
          size: Number((f.metadata as any)?.size || 0), mime: String((f.metadata as any)?.mimetype || ""), created: f.created_at || new Date().toISOString(),
        });
      }
    }
  }
  return out;
}

/** Barrido: borra lo que ya ha cumplido sus 14 días. Devuelve cuántos archivos ha borrado. */
export async function sweep(files?: StoredFile[]) {
  const all = files || (await listAll());
  const old = all.filter((f) => isExpired(f.created)).map((f) => f.path);
  for (let i = 0; i < old.length; i += 100) { const { error } = await store().remove(old.slice(i, i + 100)); if (error) throw error; }
  return old.length;
}

export async function upload(person: string, date: string, file: File) {
  const path = `${person}/${date}/${file.name}`;
  const { error } = await store().upload(path, file, { upsert: true, contentType: file.type || undefined });
  if (error) throw error;
  return path;
}

export const remove = async (paths: string[]) => { const { error } = await store().remove(paths); if (error) throw error; };

// Piezas del calendario borradas a mano: su vídeo sigue en Archivos, así que se apuntan como descartadas
// (un archivo vacío en .descartes/<persona>/<fecha>/<pieza> ~ <red>) para que la sincronización no las vuelva a crear.
const DISCARDS = ".descartes";
const discardPath = (archivo: string, platform: string) => `${DISCARDS}/${archivo} ~ ${platform}`;

export async function discard(archivo: string, platform: string) {
  const { error } = await store().upload(discardPath(archivo, platform), new Blob([""], { type: "text/plain" }), { upsert: true });
  if (error) throw error;
}

/** Descartes como «persona/fecha/pieza ~ red». */
export async function listDiscarded(): Promise<Set<string>> {
  const out = new Set<string>();
  for (const person of await listDir(DISCARDS)) {
    if (person.id) continue;
    for (const day of await listDir(`${DISCARDS}/${person.name}`)) {
      if (day.id) continue;
      for (const f of await listDir(`${DISCARDS}/${person.name}/${day.name}`)) if (f.id) out.add(`${person.name}/${day.name}/${f.name}`);
    }
  }
  return out;
}
export const isDiscarded = (set: Set<string>, archivo: string, platform: string) => set.has(`${archivo} ~ ${platform}`);
/** Quita las marcas de piezas cuyo vídeo ya no está en Archivos. */
export async function pruneDiscarded(set: Set<string>, alive: Set<string>) {
  const old = Array.from(set).filter((k) => !alive.has(k.replace(/ ~ [^~]+$/, ""))).map((k) => `${DISCARDS}/${k}`);
  if (old.length) await remove(old);
}

export async function signedUrl(path: string, download = false) {
  const { data, error } = await store().createSignedUrl(path, 3600, download ? { download: path.split("/").pop() } : undefined);
  if (error) throw error;
  return data.signedUrl;
}

export async function readText(path: string) {
  const { data, error } = await store().download(path);
  if (error) throw error;
  return await data.text();
}

export const isText = (f: StoredFile) => f.mime.startsWith("text/") || /\.(txt|md|json)$/i.test(f.name);
export const isImage = (f: StoredFile) => f.mime.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(f.name);
export const isVideo = (f: StoredFile) => f.mime.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(f.name);
export const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b > 1e3 ? `${Math.round(b / 1e3)} KB` : `${b} B`);

/** Los archivos que deja `aldia.py publicar`: «<pieza> - video.mp4», «- miniatura LinkedIn.png», «- LinkedIn titulo y descripcion.txt», «- TikTok titulo.txt». */
export type Kit = { name: string; video?: StoredFile; thumb?: StoredFile; linkedin?: StoredFile; tiktok?: StoredFile; files: StoredFile[] };

export function groupKits(files: StoredFile[]) {
  const kits = new Map<string, Kit>(); const loose: StoredFile[] = [];
  for (const f of files) {
    const m = f.name.match(/^(.*) - (video\.\w+|miniatura LinkedIn\.\w+|LinkedIn titulo y descripcion\.txt|TikTok titulo\.txt)$/i);
    if (!m) { loose.push(f); continue; }
    const k = kits.get(m[1]) || { name: m[1], files: [] }; kits.set(m[1], k); k.files.push(f);
    const part = m[2].toLowerCase();
    if (part.startsWith("video")) k.video = f; else if (part.startsWith("miniatura")) k.thumb = f;
    else if (part.startsWith("linkedin")) k.linkedin = f; else k.tiktok = f;
  }
  return { kits: Array.from(kits.values()).sort((a, b) => a.name.localeCompare(b.name)), loose };
}
