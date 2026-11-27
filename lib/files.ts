import { supabase } from "./supabase";
import { addDays, today, toISO } from "./social";

// «Drive» de Smart Connect sobre Supabase Storage: Aldia | Guille | Alejandro / AAAA-MM-DD / archivos.
// «Aldia» es la marca (cuentas de empresa); Guille y Alejandro, sus redes personales.
// Cada archivo se borra cuando pasan 8 días desde el de subida: lo subido el día 11 se borra el día 19
// (y con él su carpeta de fecha, si se queda vacía). Así no se llena el espacio de Supabase.
export const BUCKET = "contenido";
// Carpetas que se ven en Archivos: la de la marca y la de Millán (la de Guille se quitó: sus archivos, si los hay, siguen en el
// almacén hasta que caduquen, pero no se enseñan). «Alejandro» es la carpeta de Millán (así la escriben las skills).
export const PEOPLE = ["Aldia (Guille)", "Aldia", "Alejandro"];   // «Aldia (Guille)»: lo publica el Mac de Guille (17:00), no el PC de Millán
export const FOLDER_LABEL: Record<string, string> = { Alejandro: "Millán" };
export const folderLabel = (p: string) => FOLDER_LABEL[p] || p;
export const KEEP_DAYS = 8;   // 3 + 5 de margen (pedido 16-11-2026)

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
// Las carpetas se leen todas a la vez (antes, una detrás de otra: decenas de viajes seguidos a Supabase).
export async function listAll(): Promise<StoredFile[]> {
  const persons = (await listDir("")).filter((p) => !p.id && !p.name.startsWith("."));   // solo carpetas de persona
  const days = (await Promise.all(persons.map(async (p) => (await listDir(p.name)).filter((d) => !d.id).map((d) => ({ person: p.name, day: d.name }))))).flat();
  const lists = await Promise.all(days.map(async ({ person, day }) => (await listDir(`${person}/${day}`))
    .filter((f) => f.id && f.name !== ".emptyFolderPlaceholder")
    .map((f): StoredFile => ({
      path: `${person}/${day}/${f.name}`, name: f.name, person, date: day,
      size: Number((f.metadata as any)?.size || 0), mime: String((f.metadata as any)?.mimetype || ""), created: f.created_at || new Date().toISOString(),
    }))));
  const out = lists.flat();
  // si un archivo se ha vuelto a subir (otra fecha de subida), fuera su texto y su enlace guardados
  for (const f of out) { const prev = seen.get(f.path); if (prev && prev !== f.created) { textCache.delete(f.path); urlCache.delete(f.path); } seen.set(f.path, f.created); }
  saveCache(out);
  return out;
}
const seen = new Map<string, string>();

// Copia de la última lista (en memoria y en el navegador) para que Archivos se pinte al instante y luego se ponga al día.
const CACHE_KEY = "sc-archivos-lista";
let memList: StoredFile[] | null = null;
function saveCache(list: StoredFile[]) {
  memList = list;
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(list)); } catch { /* sin sitio o sin localStorage */ }
}
/** La última lista conocida (null si nunca se ha cargado en este navegador). */
export function cachedList(): StoredFile[] | null {
  if (memList) return memList;
  try { const s = localStorage.getItem(CACHE_KEY); if (s) memList = JSON.parse(s); } catch { /* nada */ }
  return memList;
}
/** Solo lo que ya está en memoria (sirve durante el primer pintado sin descuadrar la página). */
export const memoryList = () => memList;

/** Barrido: borra lo que ya ha cumplido sus 8 días y las carpetas de fecha que se quedan vacías. Devuelve cuántos archivos ha borrado. */
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

// Enlaces de vista previa (valen 1 h): se reutilizan 50 min, así volver a una carpeta no los pide otra vez.
const urlCache = new Map<string, { url: string; until: number }>();
export async function signedUrl(path: string, download = false) {
  const hit = !download && urlCache.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const { data, error } = await store().createSignedUrl(path, 3600, download ? { download: path.split("/").pop() } : undefined);
  if (error) throw error;
  if (!download) urlCache.set(path, { url: data.signedUrl, until: Date.now() + 50 * 60000 });
  return data.signedUrl;
}

/** Sobrescribe un texto del espacio de archivos (títulos y pies editados desde Archivos). */
export async function writeText(path: string, text: string) {
  const { error } = await store().upload(path, new Blob([text], { type: "text/plain;charset=utf-8" }), { upsert: true, contentType: "text/plain;charset=utf-8" });
  if (error) throw error;
  textCache.set(path, text);
}

// Textos ya leídos (títulos y descripciones), para no descargarlos cada vez que se abre la carpeta.
const textCache = new Map<string, string>();
export async function readText(path: string) {
  const hit = textCache.get(path);
  if (hit !== undefined && !path.endsWith(".json")) return hit;   // los _creando.json cambian solos: esos se leen siempre
  const { data, error } = await store().download(path);
  if (error) throw error;
  const t = await data.text();
  textCache.set(path, t);
  return t;
}

export const isText = (f: StoredFile) => f.mime.startsWith("text/") || /\.(txt|md|json)$/i.test(f.name);
export const isImage = (f: StoredFile) => f.mime.startsWith("image/") || /\.(png|jpe?g|webp|gif)$/i.test(f.name);
export const isVideo = (f: StoredFile) => f.mime.startsWith("video/") || /\.(mp4|mov|webm)$/i.test(f.name);
export const fmtSize = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : b > 1e3 ? `${Math.round(b / 1e3)} KB` : `${b} B`);

/** Los archivos que dejan las skills: «<pieza> - video.mp4», «- miniatura LinkedIn.png», «- LinkedIn titulo y descripcion.txt», «- TikTok titulo.txt»
 *  y, si el vídeo también va a Instagram, «- Instagram descripcion.txt». */
export type Kit = { name: string; video?: StoredFile; thumb?: StoredFile; linkedin?: StoredFile; tiktok?: StoredFile; instagram?: StoredFile; ruta?: StoredFile; files: StoredFile[] };

/** «- ruta 4K.txt»: dónde está el máster en 4K en el ordenador que lo hizo (Smart Connect solo guarda 50 MB por archivo,
 *  así que el vídeo de aquí es una copia ligera; el bueno se sube a TikTok desde esa ruta). */
export function groupKits(files: StoredFile[]) {
  const kits = new Map<string, Kit>(); const loose: StoredFile[] = [];
  for (const f of files) {
    if (isStatus(f)) continue;   // «_creando.json»: no es un archivo, es el aviso de vídeo en marcha
    const m = f.name.match(/^(.*) - (video\.\w+|miniatura LinkedIn\.\w+|LinkedIn titulo y descripcion\.txt|TikTok titulo\.txt|Instagram descripcion\.txt|ruta 4K\.txt)$/i);
    if (!m) { loose.push(f); continue; }
    const k = kits.get(m[1]) || { name: m[1], files: [] }; kits.set(m[1], k); k.files.push(f);
    const part = m[2].toLowerCase();
    if (part.startsWith("ruta")) k.ruta = f;
    else if (part.startsWith("video")) k.video = f; else if (part.startsWith("miniatura")) k.thumb = f;
    else if (part.startsWith("linkedin")) k.linkedin = f; else if (part.startsWith("instagram")) k.instagram = f; else k.tiktok = f;
  }
  return { kits: Array.from(kits.values()).sort((a, b) => a.name.localeCompare(b.name)), loose };
}

/** «_creando.json»: el Mac de Guille lo deja en la carpeta del día mientras hace ese vídeo (fase n de 6) y lo quita al subirlo (21-11-2026). */
export const STATUS_FILE = "_creando.json";
export const isStatus = (f: StoredFile) => f.name === STATUS_FILE;
export type Creando = { fecha: string; texto: string; titulo?: string; paso?: number; pasos?: number; fase?: string; desde?: string; inicio?: string; actualizado: string; error?: string | null };
export async function readStatus(path: string): Promise<Creando | null> {
  try { const { data, error } = await store().download(path, { cacheNonce: Date.now() } as any); if (error || !data) return null; return JSON.parse(await data.text()); }
  catch { return null; }
}
