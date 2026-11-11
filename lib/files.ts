import { supabase } from "./supabase";
import { addDays, today, toISO } from "./social";

// «Drive» de Smart Connect sobre Supabase Storage: Aldia | Guille | Alejandro / AAAA-MM-DD / archivos.
// «Aldia» es la marca (cuentas de empresa); Guille y Alejandro, sus redes personales.
// Cada archivo se borra cuando pasan 3 días desde el de subida: lo subido el día 11 se borra el día 14
// (y con él su carpeta de fecha, si se queda vacía). Así no se llena el espacio de Supabase.
export const BUCKET = "contenido";
export const PEOPLE = ["Aldia", "Guille", "Alejandro"];
export const KEEP_DAYS = 3;

export type StoredFile = { path: string; name: string; size: number; mime: string; created: string; person: string; date: string };

const store = () => supabase.storage.from(BUCKET);

/** Día (local) en que se sube y día en que se borra. */
export const uploadedOn = (created: string) => toISO(new Date(created));
// Se cuenta desde el día de subida o, si es posterior, desde el de su carpeta de fecha (día de publicación):
// lo preparado por adelantado (subido el 11 para el 15) no se borra hasta el 18.
const ISO = /^\d{4}-\d{2}-\d{2}$/;
export const deletesOn = (created: string, date?: string) => {
  const up = uploadedOn(created);
  return addDays(date && ISO.test(date) && date > up ? date : up, KEEP_DAYS);
};
export const isExpired = (created: string, date?: string) => today() >= deletesOn(created, date);

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

/** Barrido: borra lo que ya ha cumplido sus 3 días y las carpetas de fecha que se quedan vacías. Devuelve cuántos archivos ha borrado. */
export async function sweep(files?: StoredFile[]) {
  const all = files || (await listAll());
  const old = all.filter((f) => isExpired(f.created, f.date));
  // carpeta persona/fecha sin nada vivo → fuera también su marcador, para que la carpeta desaparezca
  const live = new Set(all.filter((f) => !isExpired(f.created, f.date)).map((f) => `${f.person}/${f.date}`));
  const emptied = Array.from(new Set(old.map((f) => `${f.person}/${f.date}`))).filter((d) => !live.has(d)).map((d) => `${d}/.emptyFolderPlaceholder`);
  const paths = [...old.map((f) => f.path), ...emptied];
  for (let i = 0; i < paths.length; i += 100) { const { error } = await store().remove(paths.slice(i, i + 100)); if (error) throw error; }
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

/** Los archivos que dejan las skills: «<pieza> - video.mp4», «- miniatura LinkedIn.png», «- LinkedIn titulo y descripcion.txt», «- TikTok titulo.txt»
 *  y, si el vídeo también va a Instagram, «- Instagram descripcion.txt». */
export type Kit = { name: string; video?: StoredFile; thumb?: StoredFile; linkedin?: StoredFile; tiktok?: StoredFile; instagram?: StoredFile; files: StoredFile[] };

export function groupKits(files: StoredFile[]) {
  const kits = new Map<string, Kit>(); const loose: StoredFile[] = [];
  for (const f of files) {
    const m = f.name.match(/^(.*) - (video\.\w+|miniatura LinkedIn\.\w+|LinkedIn titulo y descripcion\.txt|TikTok titulo\.txt|Instagram descripcion\.txt)$/i);
    if (!m) { loose.push(f); continue; }
    const k = kits.get(m[1]) || { name: m[1], files: [] }; kits.set(m[1], k); k.files.push(f);
    const part = m[2].toLowerCase();
    if (part.startsWith("video")) k.video = f; else if (part.startsWith("miniatura")) k.thumb = f;
    else if (part.startsWith("linkedin")) k.linkedin = f; else if (part.startsWith("instagram")) k.instagram = f; else k.tiktok = f;
  }
  return { kits: Array.from(kits.values()).sort((a, b) => a.name.localeCompare(b.name)), loose };
}
