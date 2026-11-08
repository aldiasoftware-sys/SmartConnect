// Utilidades de servidor para el apartado Discord (solo las importan las funciones de Cloudflare en functions/).
// El token del bot, el secreto compartido con n8n y la URL del flujo de estado viven aquí: nunca llegan al navegador.
import { Ctx as NlCtx, Env as NlEnv, db, json, teamUser } from "./nl";

export type Env = NlEnv & {
  /** Token del bot oficial «ALDIA AI» (sin el prefijo «Bot ») */
  DISCORD_BOT_TOKEN?: string;
  /** Secreto compartido con n8n: la foto diaria y el flujo de estado lo envían en «x-discord-secret» */
  DISCORD_SECRET?: string;
  /** URL del webhook de n8n que devuelve el estado de los flujos y los lanza (0xFe…H) */
  N8N_DISCORD_HOOK?: string;
};
export type Ctx = { request: Request; env: Env };
export { json, teamUser };

export const GUILD_ID = "1568717330437902386";
export const INVITE_URL = `https://discord.com/channels/${GUILD_ID}`;

/** Canales donde habla la comunidad (los de solo lectura no cuentan para la actividad). */
export const ACTIVITY_CHANNELS: { id: string; name: string }[] = [
  { id: "1568721956407353535", name: "💬・general" },
  { id: "1568721938527027221", name: "🙋・presentaciones" },
  { id: "1568721988317483071", name: "🧠・debate-ia" },
  { id: "1568721998958432266", name: "🤖・claude-code" },
  { id: "1568722036635734046", name: "⚙️・automatización" },
  { id: "1568722151618642012", name: "🏆・reto-semanal" },
];
export const FORUMS: Record<string, string> = {
  "1568741117778989056": "🆘・ayuda",
  "1568741145679499486": "📚・recursos",
  "1568741182287384629": "🚀・proyectos",
};
export const SOCIAL_CHANNELS: Record<string, { id: string; label: string; emoji: string }> = {
  tiktok: { id: "1568729990428758168", label: "TikTok", emoji: "🎵" },
  instagram: { id: "1568729993796657152", label: "Instagram", emoji: "📸" },
  youtube: { id: "1568729996065767585", label: "YouTube", emoji: "▶️" },
  linkedin: { id: "1568729998372765961", label: "LinkedIn", emoji: "💼" },
};
export const ANNOUNCEMENTS_ID = "1568721931073491004";
export const ACCENT = 0xc82828;

export async function discord<T = any>(env: Env, path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!env.DISCORD_BOT_TOKEN) throw Object.assign(new Error("Falta DISCORD_BOT_TOKEN en Cloudflare"), { status: 503 });
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`https://discord.com/api/v10${path}`, {
      method: init.method || "GET",
      headers: {
        authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        "user-agent": "DiscordBot (https://aldiaproject.es, 1.0)",
        ...(init.body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
    });
    if (res.status === 429) {
      const wait = Number(((await res.json().catch(() => ({}))) as any).retry_after || 1);
      await new Promise((r) => setTimeout(r, Math.min(wait, 5) * 1000 + 200));
      continue;
    }
    const text = await res.text();
    if (!res.ok) throw Object.assign(new Error(`Discord ${res.status}: ${text.slice(0, 200)}`), { status: res.status });
    return (text ? JSON.parse(text) : null) as T;
  }
  throw new Error("Discord: demasiadas peticiones, prueba en un minuto");
}

const madridDay = (d = new Date()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(d);

/** Lee la actividad de los últimos 7 días (mensajes de personas, no bots) por canal y por día. */
export async function activity(env: Env) {
  const since = Date.now() - 7 * 86400_000;
  const days: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) days[madridDay(new Date(Date.now() - i * 86400_000))] = 0;
  const authors = new Set<string>();
  const channels = await Promise.all(ACTIVITY_CHANNELS.map(async (c) => {
    const msgs: any[] = await discord(env, `/channels/${c.id}/messages?limit=100`).catch(() => []);
    let n = 0;
    for (const m of msgs) {
      const t = Date.parse(m.timestamp);
      if (m.author?.bot || m.webhook_id || t < since || m.type !== 0 && m.type !== 19) continue;
      n++; authors.add(m.author.id);
      const d = madridDay(new Date(t)); if (d in days) days[d]++;
    }
    return { id: c.id, name: c.name, messages: n };
  }));
  const threads: any[] = (await discord(env, `/guilds/${GUILD_ID}/threads/active`).catch(() => ({ threads: [] }))).threads || [];
  const forums = Object.entries(FORUMS).map(([id, name]) => {
    const own = threads.filter((t) => t.parent_id === id);
    const recent = own.filter((t) => Date.parse(t.thread_metadata?.create_timestamp || 0) >= since && t.owner_id !== "1568719781643821228");
    return { id, name, open: own.length, new7d: recent.length, replies: own.reduce((s, t) => s + (t.message_count || 0), 0) };
  });
  return { channels, forums, byDay: Object.entries(days).map(([day, messages]) => ({ day, messages })), activeAuthors: authors.size,
    messages7d: channels.reduce((s, c) => s + c.messages, 0) };
}

/** Guarda (o mejora) la foto de hoy: miembros, en línea y mensajes de los últimos 7 días. */
export async function snapshot(env: Env, members: number, online: number, messages7d: number) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return false;
  const day = madridDay();
  const prev = await db<any[]>(env, `discord_snapshots?day=eq.${day}&select=members,online`).catch(() => null);
  if (prev === null) return false;
  const row = { day, members: Math.max(members, prev[0]?.members || 0), online: Math.max(online, prev[0]?.online || 0), messages_7d: messages7d, updated_at: new Date().toISOString() };
  await db(env, "discord_snapshots?on_conflict=day", { method: "POST", body: row, prefer: "resolution=merge-duplicates" });
  return true;
}

export async function guildCounts(env: Env) {
  const g = await discord(env, `/guilds/${GUILD_ID}?with_counts=true`);
  return { name: g.name as string, icon: g.icon ? `https://cdn.discordapp.com/icons/${GUILD_ID}/${g.icon}.png?size=128` : null,
    members: g.approximate_member_count as number, online: g.approximate_presence_count as number };
}

export function errorResponse(e: any) {
  return json({ ok: false, error: e?.message || "Error" }, e?.status && e.status < 600 ? (e.status === 503 ? 503 : 502) : 500);
}
export type { NlCtx };
