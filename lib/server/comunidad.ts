// Comunidad en Discord vista desde Smart Connect: miembros, perfiles (roles de la incorporación),
// enlaces de invitación por red y posibles clientes. Solo lo importan las funciones de Cloudflare.
import { Env, GUILD_ID, discord } from "./discord";
import { db } from "./nl";

export const BOT_ID = "1568719781643821228";

/** Respuestas de «¿Qué te interesa?» al entrar (cada una da su rol). */
export const INTEREST_ROLES = ["Entusiasta IA", "Automatizador", "Desarrollador", "Emprendedor", "Creador de contenido", "Tengo un negocio"];
/** Respuestas de «¿Cuál es tu nivel con la IA?» */
export const LEVEL_ROLES = ["Explorador IA", "Entusiasta IA", "Arquitecto IA"];
export const BUSINESS_ROLE = "Tengo un negocio";
/** El equipo no cuenta como posible cliente. */
export const TEAM_ROLES = ["Fundador", "Cofundador", "Administrador", "Moderador", "Community Manager", "Equipo ALDIA"];

/** Redes con enlace de invitación propio, para saber de dónde viene la gente. */
export const REDES = [
  { id: "tiktok", label: "TikTok" },
  { id: "instagram", label: "Instagram" },
  { id: "linkedin", label: "LinkedIn" },
  { id: "youtube", label: "YouTube" },
  { id: "web", label: "Web" },
] as const;

export const dayMadrid = (d: string | number | Date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(d));

export type Member = { id: string; name: string; username: string; joined: string; roles: string[]; bot: boolean };

/** Todos los miembros (necesita «Server Members Intent»), con los nombres de sus roles. */
export async function listMembers(env: Env): Promise<Member[]> {
  const roles: any[] = await discord(env, `/guilds/${GUILD_ID}/roles`);
  const roleName = new Map(roles.map((r) => [r.id, r.name as string]));
  const out: Member[] = [];
  let after = "0";
  for (let page = 0; page < 20; page++) {
    const batch: any[] = await discord(env, `/guilds/${GUILD_ID}/members?limit=1000&after=${after}`);
    for (const m of batch) {
      out.push({
        id: m.user.id, name: m.nick || m.user.global_name || m.user.username, username: m.user.username, joined: m.joined_at,
        roles: (m.roles || []).map((r: string) => roleName.get(r)).filter(Boolean), bot: !!m.user.bot,
      });
    }
    if (batch.length < 1000) break;
    after = batch[batch.length - 1].user.id;
  }
  return out;
}

export const isTeam = (m: { roles: string[] }) => m.roles.some((r) => TEAM_ROLES.includes(r));

/** Cuentas del equipo que no cuentan como comunidad (Guille, Millán, la cuenta ALDIA y la otra cuenta de Millán) mientras no se elija otra cosa. */
export const DEFAULT_EXCLUDED_USERNAMES = ["rguiillee", "zzmillan", "aldiaproject", "alexelinvestigad_45986"];

/** Ids que no cuentan: los marcados en Smart Connect (app_settings «discord_excluidos») o, si nunca se ha tocado, los del equipo. */
export async function excludedIds(env: Env, members: Member[]): Promise<Set<string>> {
  const saved = await getSettingSrv<string[] | null>(env, "discord_excluidos", null);
  if (saved) return new Set(members.filter((m) => saved.includes(m.id) || saved.includes(m.username)).map((m) => m.id));
  return new Set(members.filter((m) => DEFAULT_EXCLUDED_USERNAMES.includes(m.username)).map((m) => m.id));
}

// ---------- ajustes compartidos (tabla app_settings) con la clave secreta ----------
export async function getSettingSrv<T>(env: Env, key: string, fallback: T): Promise<T> {
  const rows = await db<any[]>(env, `app_settings?select=value&key=eq.${encodeURIComponent(key)}`).catch(() => []);
  return (rows[0]?.value ?? fallback) as T;
}
export async function setSettingSrv(env: Env, key: string, value: unknown) {
  await db(env, "app_settings?on_conflict=key", { method: "POST", body: { key, value, updated_at: new Date().toISOString() }, prefer: "resolution=merge-duplicates" });
}

/** Busca un canal por un trozo de su nombre (los nombres llevan emoji delante). */
export async function findChannel(env: Env, part: string) {
  const chans: any[] = await discord(env, `/guilds/${GUILD_ID}/channels`);
  return chans.find((c) => c.type === 0 && String(c.name).includes(part));
}

// ---------- invitaciones por red ----------
export type InviteRow = { red: string; label: string; code: string | null; url: string | null; uses: number };

export async function readInvites(env: Env) {
  const map = await getSettingSrv<Record<string, string>>(env, "discord_invites", {});
  const all: any[] = await discord(env, `/guilds/${GUILD_ID}/invites`);   // necesita «Gestionar servidor»
  const uses = new Map(all.map((i) => [i.code, i.uses || 0]));
  const tracked = new Set(Object.values(map));
  const redes: InviteRow[] = REDES.map((r) => {
    const code = map[r.id] || null;
    return { red: r.id, label: r.label, code, url: code ? `https://discord.gg/${code}` : null, uses: code ? uses.get(code) ?? 0 : 0 };
  });
  const otros = all.filter((i) => !tracked.has(i.code)).reduce((s, i) => s + (i.uses || 0), 0);
  // foto del día para ver la evolución por semana
  let history = await getSettingSrv<Record<string, Record<string, number>>>(env, "discord_invites_history", {});
  if (redes.some((r) => r.code)) {
    const day = dayMadrid(Date.now());
    history = { ...history, [day]: Object.fromEntries(redes.map((r) => [r.red, r.uses])) };
    const keep = Object.keys(history).sort().slice(-180);
    history = Object.fromEntries(keep.map((k) => [k, history[k]]));
    await setSettingSrv(env, "discord_invites_history", history).catch(() => {});
  }
  return { redes, otros, history, missing: redes.filter((r) => !r.code).map((r) => r.red) };
}

/** Crea (una vez) un enlace permanente por red en 👋・bienvenida. */
export async function createInvites(env: Env) {
  const map = await getSettingSrv<Record<string, string>>(env, "discord_invites", {});
  const chan = (await findChannel(env, "bienvenida")) || (await findChannel(env, "general"));
  if (!chan) throw Object.assign(new Error("No encuentro el canal de bienvenida"), { status: 404 });
  for (const r of REDES) {
    if (map[r.id]) continue;
    const inv = await discord(env, `/channels/${chan.id}/invites`, { method: "POST", body: { max_age: 0, max_uses: 0, unique: true, temporary: false } });
    map[r.id] = inv.code;
  }
  await setSettingSrv(env, "discord_invites", map);
}

// ---------- posibles clientes ----------
/** Frases que suenan a encargo o a interés comercial. */
export const LEAD_RE = /(cu[aá]nto (cuesta|costar[ií]a|cobr[aá]is|cobras|vale)|presupuesto|(qu[eé]|cu[aá]l es el|tiene[ns]? (un )?|vuestros?|tus?) precios?|tarifas?|tengo una? (empresa|negocio|tienda|cl[ií]nica|despacho|restaurante|agencia|academia|gimnasio|inmobiliaria|ecommerce|startup)|quiero automatizar|contratar|contrataros|para mi (empresa|negocio|cliente|equipo|tienda)|en mi (empresa|negocio|trabajo)|mi (empresa|negocio|tienda|despacho|cl[ií]nica|restaurante|agencia)\b|podr[ií]ais (hacer|ayudar|montar)|me (lo )?(montas|mont[aá]is|hac[eé]is|ayud[aá]is)|busco a alguien|necesito (a alguien|que me|ayuda (con|para) (mi|un|una))|consultor[ií]a|servicios? de|freelance|automatizar (mi|los procesos|el negocio))/i;

export type Signal = { id: string; channel: string; author: string; authorId: string; content: string; at: string; url: string; match: string };

/** Lee los mensajes recientes (canales de la comunidad + publicaciones de ayuda y proyectos) y se queda con los que suenan a encargo. */
export async function scanSignals(env: Env, channels: { id: string; name: string }[], forums: Record<string, string>, teamIds: Set<string>, days = 30): Promise<Signal[]> {
  const since = Date.now() - days * 86400_000;
  const sources: { id: string; name: string }[] = [...channels];
  const threads: any[] = (await discord(env, `/guilds/${GUILD_ID}/threads/active`).catch(() => ({ threads: [] }))).threads || [];
  for (const t of threads) if (forums[t.parent_id]) sources.push({ id: t.id, name: `${forums[t.parent_id]} › ${t.name}` });
  const out: Signal[] = [];
  for (const s of sources.slice(0, 40)) {
    const msgs: any[] = await discord(env, `/channels/${s.id}/messages?limit=100`).catch(() => []);
    for (const m of msgs) {
      if (m.author?.bot || m.webhook_id || teamIds.has(m.author?.id) || Date.parse(m.timestamp) < since) continue;
      const hit = String(m.content || "").match(LEAD_RE);
      if (!hit) continue;
      out.push({
        id: m.id, channel: s.name, author: m.member?.nick || m.author.global_name || m.author.username, authorId: m.author.id,
        content: String(m.content).slice(0, 400), at: m.timestamp, url: `https://discord.com/channels/${GUILD_ID}/${s.id}/${m.id}`, match: hit[0],
      });
    }
  }
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/** Canal privado del equipo donde el bot avisa de los posibles clientes (lo crea si no existe). */
export async function leadsChannel(env: Env) {
  const found = await findChannel(env, "posibles-clientes");
  if (found) return found.id as string;
  const roles: any[] = await discord(env, `/guilds/${GUILD_ID}/roles`);
  const VIEW = 1024, SEND = 2048, HISTORY = 65536;
  const overwrites = [
    { id: GUILD_ID, type: 0, deny: String(VIEW) },                                     // @everyone no lo ve
    { id: BOT_ID, type: 1, allow: String(VIEW | SEND | HISTORY) },
    ...roles.filter((r) => TEAM_ROLES.includes(r.name)).map((r) => ({ id: r.id, type: 0, allow: String(VIEW | HISTORY) })),
  ];
  const c = await discord(env, `/guilds/${GUILD_ID}/channels`, { method: "POST", body: { name: "🔒・posibles-clientes", type: 0, topic: "Avisos del bot: gente con negocio y mensajes que suenan a encargo. Solo el equipo.", permission_overwrites: overwrites } });
  return c.id as string;
}
