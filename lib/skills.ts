import { supabase } from "./supabase";
import { BUCKET } from "./files";

// Skills de Claude Code que el equipo comparte para instalarlas en otro ordenador.
// Las sube el script publicar_skill.py (Desktop\Skills\_publicar) a la carpeta interna «.skills/<skill>/» del bucket
// de Archivos —las carpetas que empiezan por «.» ni salen en Archivos ni se barren—, y se vuelve a subir sola cada vez
// que la skill cambia. Smart Connect admite 50 MB por archivo: lo pesado (vídeos de referencia) va en partes .001, .002…
export const SKILLS_DIR = ".skills";

export type SkillPart = { nombre: string; tam: number };
export type SkillInfo = {
  slug: string; nombre: string; descripcion: string; version: string; actualizada: string; autor?: string;
  zip: string; tam_zip: number; referencias?: SkillPart[]; tam_referencias?: number;
};

const store = () => supabase.storage.from(BUCKET);

export async function listSkills(): Promise<SkillInfo[]> {
  const { data, error } = await store().list(SKILLS_DIR, { limit: 200, sortBy: { column: "name", order: "asc" } });
  if (error) throw error;
  const out: SkillInfo[] = [];
  for (const d of data || []) {
    if (d.id) continue; // solo carpetas
    const { data: blob } = await store().download(`${SKILLS_DIR}/${d.name}/info.json`);
    if (!blob) continue;
    try { out.push({ slug: d.name, ...JSON.parse(await blob.text()) }); } catch { /* info.json roto: se ignora */ }
  }
  return out.sort((a, b) => (b.actualizada || "").localeCompare(a.actualizada || ""));
}

export async function skillPrompt(slug: string) {
  const { data, error } = await store().download(`${SKILLS_DIR}/${slug}/INSTALAR.md`);
  if (error) throw error;
  return await data.text();
}

export async function skillUrl(slug: string, file: string) {
  const { data, error } = await store().createSignedUrl(`${SKILLS_DIR}/${slug}/${file}`, 3600, { download: file });
  if (error) throw error;
  return data.signedUrl;
}
