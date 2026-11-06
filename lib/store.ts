import { supabase } from "./supabase";

// Almacén de las secciones nuevas: Supabase si la tabla existe; si no, este navegador (y se sube solo cuando aparezca).
export type Table = "social_snapshots" | "social_plans" | "gantt_items" | "content_posts" | "community_people" | "offers" | "app_settings";
const CONFLICT: Record<Table, string> = {
  social_snapshots: "week_start,account", social_plans: "week_start,account", gantt_items: "id",
  content_posts: "id", community_people: "id", offers: "id", app_settings: "key",
};
const LOCAL = (t: Table) => `aldia_local_${t}`;
const readLocal = <T,>(t: Table): T[] => { try { return JSON.parse(localStorage.getItem(LOCAL(t)) || "[]"); } catch { return []; } };
const writeLocal = (t: Table, rows: unknown[]) => { try { localStorage.setItem(LOCAL(t), JSON.stringify(rows)); } catch { /* sin almacenamiento */ } };
const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Date.now() + Math.random()));
const sameKey = (t: Table, a: any, b: any) => CONFLICT[t].split(",").every((k) => a[k] === b[k]);

const modes = new Map<Table, Promise<"supabase" | "local">>();

/** ¿Existe la tabla en Supabase? Se comprueba una vez; si existe, lo apuntado en local se sube. */
export function tableMode(t: Table) {
  if (!modes.has(t)) modes.set(t, (async () => {
    const { error } = await supabase.from(t).select("*").limit(1);
    // solo «no existe la tabla» pasa a guardar en el navegador; un «sin permiso» (no hay sesión) no
    if (error && !/42P01|PGRST205|PGRST204|could not find the table|does not exist/i.test(`${error.code} ${error.message}`)) { modes.delete(t); return "supabase"; }
    if (error) return "local";
    const rows = readLocal<Record<string, unknown>>(t);
    if (rows.length) {
      const clean = CONFLICT[t] === "id" ? rows : rows.map(({ id, ...r }) => r);
      const { error: e2 } = await supabase.from(t).upsert(clean, { onConflict: CONFLICT[t] });
      if (!e2) localStorage.removeItem(LOCAL(t));
    }
    return "supabase";
  })());
  return modes.get(t)!;
}

/** Al entrar o salir de la sesión se vuelve a comprobar cada tabla. */
export const resetTableModes = () => modes.clear();

export async function listRows<T>(t: Table, order?: string): Promise<T[]> {
  if ((await tableMode(t)) === "local") return readLocal<T>(t);
  let q = supabase.from(t).select("*");
  if (order) q = q.order(order, { ascending: true, nullsFirst: false });
  const { data, error } = await q;
  if (error) { console.error(`Error leyendo ${t}:`, error); return []; }
  return (data || []) as T[];
}

/** Crea (sin id) o actualiza (con id) una fila; devuelve la fila guardada. */
export async function saveRow<T extends { id?: string }>(t: Table, row: T): Promise<T> {
  if ((await tableMode(t)) === "local") {
    const cur = readLocal<T>(t); const saved = { ...row, id: row.id || newId() };
    const i = cur.findIndex((c) => c.id === saved.id);
    if (i >= 0) cur[i] = saved; else cur.push(saved);
    writeLocal(t, cur); return saved;
  }
  const { id, ...payload } = row as any;
  const { data, error } = id ? await supabase.from(t).update(payload).eq("id", id).select().single() : await supabase.from(t).insert(payload).select().single();
  if (error) throw error;
  return data as T;
}

export async function deleteRow(t: Table, id: string) {
  if ((await tableMode(t)) === "local") { writeLocal(t, readLocal<{ id?: string }>(t).filter((c) => c.id !== id)); return; }
  const { error } = await supabase.from(t).delete().eq("id", id);
  if (error) throw error;
}

/** Inserta o actualiza por la clave natural de la tabla (semana+cuenta, clave de ajuste…). */
export async function upsertRows(t: Table, rows: Record<string, any>[]) {
  if (!rows.length) return;
  if ((await tableMode(t)) === "local") {
    const cur = readLocal<Record<string, any>>(t);
    for (const r of rows) { const i = cur.findIndex((c) => sameKey(t, c, r)); if (i >= 0) cur[i] = { ...cur[i], ...r }; else cur.push({ ...r, id: newId() }); }
    writeLocal(t, cur); return;
  }
  const { error } = await supabase.from(t).upsert(rows.map(({ id, ...r }) => r), { onConflict: CONFLICT[t] });
  if (error) throw error;
}

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const rows = await listRows<{ key: string; value: T }>("app_settings");
  return rows.find((r) => r.key === key)?.value ?? fallback;
}
export const setSetting = (key: string, value: unknown) => upsertRows("app_settings", [{ key, value, updated_at: new Date().toISOString() }]);
