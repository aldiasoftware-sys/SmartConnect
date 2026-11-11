// POST /api/discord/social · aviso de publicación en Discord (desde el Calendario, solo o con el botón «Avisar», o a mano)
// Con post_id de un vídeo de TikTok o Instagram de ALDIA salen dos cosas:
//   1. Un aviso breve en el canal de su red (#tiktok / #instagram).
//   2. Una tarjeta en #debate-ia con la miniatura, de qué va, la pregunta del vídeo, botones a las redes y un hilo para
//      comentar. Es UNA tarjeta por vídeo: cuando llega el enlace de la otra red, se le añade su botón.
// El resumen y la pregunta salen del pie de Instagram del kit de Archivos (el vídeo diario siempre cierra con pregunta).
import { ACCENT, ANNOUNCEMENTS_ID, Ctx, DEBATE_ID, SOCIAL_CHANNELS, discord, discordForm, errorResponse, json, teamUser } from "../../../lib/server/discord";
import { db, storageGet } from "../../../lib/server/nl";

type Body = { platform?: string; url?: string; text?: string; post_id?: string; also_announce?: boolean; auto?: boolean };
type Row = { id: string; platform: string; url: string | null; title: string; owner: string | null; archivo: string | null; discord_notified_at: string | null; discord_card_id?: string | null };

const BUCKET = "contenido";
const VIDEO_PLATFORMS = ["tiktok", "instagram"];
/** Va a las cuentas de ALDIA todo lo que no es de Guille (mismo criterio que isAccountPost en lib/social.ts). */
const isAldia = (p: Row) => p.owner !== "Guille";
const BTN: Record<string, { label: string; emoji: string }> = {
  tiktok: { label: "Ver en TikTok", emoji: "🎵" },
  instagram: { label: "Ver en Instagram", emoji: "📸" },
};

export async function onRequestPost(ctx: Ctx) {
  if (!(await teamUser(ctx))) return json({ ok: false, error: "Solo para el equipo" }, 401);
  const b = (await ctx.request.json().catch(() => ({}))) as Body;
  try {
    let post: Row | null = null;
    if (b.post_id) {
      const rows = await db<Row[]>(ctx.env, `content_posts?id=eq.${encodeURIComponent(b.post_id)}&select=*`);
      post = rows[0] || null;
      if (!post) return json({ ok: false, error: "No encuentro esa publicación" }, 404);
      // evita avisar dos veces la misma publicación (el aviso automático se salta en silencio)
      if (post.discord_notified_at) return b.auto ? json({ ok: true, skipped: true }) : json({ ok: false, error: "Esta publicación ya se avisó en Discord" }, 409);
    }
    const platform = (post?.platform || b.platform || "").toLowerCase();
    const url = (post?.url || b.url || "").trim();
    const ch = SOCIAL_CHANNELS[platform];
    if (!ch) return json({ ok: false, error: "Red sin canal en Discord" }, 400);
    if (!/^https?:\/\/\S+$/i.test(url)) return json({ ok: false, error: "Enlace no válido" }, 400);
    const title = (post?.title || b.text || "").trim().slice(0, 300);

    // ---- tarjeta en #debate-ia (solo vídeos de TikTok / Instagram de ALDIA que vienen del Calendario)
    const card = post && VIDEO_PLATFORMS.includes(platform) && isAldia(post) ? await videoCard(ctx, post) : null;

    // ---- aviso breve en el canal de la red
    const more = card ? `\n💬 De qué va y debate: https://discord.com/channels/1568717330437902386/${DEBATE_ID}/${card}` : "";
    const content = `${ch.emoji} **Nuevo vídeo en ${ch.label}**${title ? `: ${title}` : ""}\n${url}${more}`;
    const msg = await discord(ctx.env, `/channels/${ch.id}/messages`, { method: "POST", body: { content, allowed_mentions: { parse: [] } } });
    if (b.also_announce) await discord(ctx.env, `/channels/${ANNOUNCEMENTS_ID}/messages`, { method: "POST", body: { content, allowed_mentions: { parse: [] } } });
    if (post) await db(ctx.env, `content_posts?id=eq.${encodeURIComponent(post.id)}`, { method: "PATCH", body: { discord_notified_at: new Date().toISOString() } });
    return json({ ok: true, id: msg.id, card });
  } catch (e) { return errorResponse(e); }
}

/** Crea la tarjeta del vídeo o, si ya existe por la otra red, le añade el botón. Devuelve el id del mensaje. */
async function videoCard(ctx: Ctx, post: Row): Promise<string | null> {
  const env = ctx.env;
  // las piezas del mismo vídeo (TikTok e Instagram) comparten «archivo»; las creadas a mano van solas
  const siblings = post.archivo
    ? await db<Row[]>(env, `content_posts?archivo=eq.${encodeURIComponent(post.archivo)}&select=*`).catch(() => [post])
    : [post];
  const all = siblings.some((s) => s.id === post.id) ? siblings.map((s) => (s.id === post.id ? post : s)) : [...siblings, post];
  const links = VIDEO_PLATFORMS.map((p) => all.find((s) => s.platform === p && s.url && /^https?:\/\//i.test(s.url)))
    .filter(Boolean).map((s) => ({ platform: s!.platform, url: s!.url!.trim() }));
  const existing = all.map((s) => s.discord_card_id).find(Boolean) || null;

  const txt = post.archivo ? await storageGet(env, BUCKET, `${post.archivo} - Instagram descripcion.txt`) : null;
  const info = parseCaption(txt ? new TextDecoder().decode(txt) : "", post.title);
  const thumb = post.archivo ? await storageGet(env, BUCKET, `${post.archivo} - miniatura LinkedIn.png`) : null;
  const hasThumb = !!thumb || !!existing;   // al editar, la miniatura ya está adjunta en el mensaje
  const components = [cardBody(info, links, hasThumb)];

  if (existing) {
    try {
      await discord(env, `/channels/${DEBATE_ID}/messages/${existing}`, { method: "PATCH", body: { flags: 1 << 15, components } });
      return existing;
    } catch { /* la borraron en Discord: se crea otra */ }
  }
  const payload = { flags: 1 << 15, components: thumb ? components : [cardBody(info, links, false)], allowed_mentions: { parse: [] } };
  const msg = thumb
    ? await discordForm(env, `/channels/${DEBATE_ID}/messages`, "POST", payload, [{ name: "miniatura.png", data: thumb, type: "image/png" }])
    : await discord(env, `/channels/${DEBATE_ID}/messages`, { method: "POST", body: payload });
  // hilo para comentar el vídeo sin llenar el canal (si falla, la tarjeta queda igual)
  await discord(env, `/channels/${DEBATE_ID}/messages/${msg.id}/threads`, { method: "POST",
    body: { name: `💬 ${info.headline}`.slice(0, 100), auto_archive_duration: 4320 } }).catch(() => null);
  const ids = all.map((s) => s.id).filter(Boolean);
  await db(env, `content_posts?id=in.(${ids.map(encodeURIComponent).join(",")})`, { method: "PATCH", body: { discord_card_id: msg.id } }).catch(() => null);
  return msg.id;
}

type Info = { headline: string; hook: string; summary: string; question: string };

/** Del pie de Instagram (gancho · detalle · pregunta · Discord · hashtags) saca lo que va en la tarjeta. */
export function parseCaption(text: string, title: string): Info {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
    .filter((l) => !l.startsWith("#") && !/discord|enlace en (el|la) (perfil|bio)|link en (la )?bio/i.test(l));
  const qi = lines.map((l) => l.includes("¿")).lastIndexOf(true);
  let question = "";
  if (qi >= 0) {
    const l = lines[qi];
    question = l.slice(l.indexOf("¿"), l.lastIndexOf("?") + 1 || undefined).trim();
  }
  const hook = (lines[0] && lines[0] !== lines[qi] ? lines[0] : "") || title;
  const body = lines.slice(1, qi >= 0 ? qi : undefined).join(" ");
  return { headline: (title || hook).replace(/\s*#\S+/g, "").trim() || "Nuevo vídeo", hook, summary: clip(body, 520), question: question || "¿Tú qué opinas?" };
}

/** Corta en el último final de frase antes del límite. */
function clip(s: string, max: number) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(": "));
  return end > max * 0.4 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, "") + "…";
}

function cardBody(info: Info, links: { platform: string; url: string }[], thumb: boolean) {
  const head = { type: 10, content: `-# 🎬 NUEVO VÍDEO DE ALDIA\n## ${info.headline}\n${info.hook !== info.headline ? info.hook : ""}`.trim() };
  const comps: any[] = [thumb ? { type: 9, components: [head], accessory: { type: 11, media: { url: "attachment://miniatura.png" } } } : head];
  if (info.summary) comps.push({ type: 10, content: info.summary });
  comps.push({ type: 14, divider: true, spacing: 1 });
  comps.push({ type: 10, content: `### 💬 ${info.question}\nResponde en el hilo de abajo 👇 y si te ha servido, dale like y compártelo.` });
  if (links.length) comps.push({ type: 1, components: links.map((l) => ({ type: 2, style: 5, label: BTN[l.platform].label, emoji: { name: BTN[l.platform].emoji }, url: l.url })) });
  comps.push({ type: 10, content: "-# ALDIA · Noticias de IA cada día" });
  return { type: 17, accent_color: ACCENT, components: comps };
}
