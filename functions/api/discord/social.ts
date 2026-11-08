// POST /api/discord/social · aviso de publicación en el canal de su red (desde el Calendario o a mano)
import { ANNOUNCEMENTS_ID, Ctx, SOCIAL_CHANNELS, discord, errorResponse, json, teamUser } from "../../../lib/server/discord";
import { db } from "../../../lib/server/nl";

type Body = { platform?: string; url?: string; text?: string; post_id?: string; also_announce?: boolean };

export async function onRequestPost(ctx: Ctx) {
  if (!(await teamUser(ctx))) return json({ ok: false, error: "Solo para el equipo" }, 401);
  const b = (await ctx.request.json().catch(() => ({}))) as Body;
  const ch = SOCIAL_CHANNELS[(b.platform || "").toLowerCase()];
  const url = (b.url || "").trim();
  if (!ch) return json({ ok: false, error: "Red sin canal en Discord" }, 400);
  if (!/^https?:\/\/\S+$/i.test(url)) return json({ ok: false, error: "Enlace no válido" }, 400);
  const text = (b.text || "").trim().slice(0, 500);
  const content = `${ch.emoji} **Nueva publicación en ${ch.label}**${text ? `\n${text}` : ""}\n${url}`;
  try {
    if (b.post_id) {   // evita avisar dos veces la misma publicación del calendario
      const rows = await db<any[]>(ctx.env, `content_posts?id=eq.${encodeURIComponent(b.post_id)}&select=discord_notified_at`);
      if (rows[0]?.discord_notified_at) return json({ ok: false, error: "Esta publicación ya se avisó en Discord" }, 409);
    }
    const msg = await discord(ctx.env, `/channels/${ch.id}/messages`, { method: "POST", body: { content, allowed_mentions: { parse: [] } } });
    if (b.also_announce) await discord(ctx.env, `/channels/${ANNOUNCEMENTS_ID}/messages`, { method: "POST", body: { content, allowed_mentions: { parse: [] } } });
    if (b.post_id) await db(ctx.env, `content_posts?id=eq.${encodeURIComponent(b.post_id)}`, { method: "PATCH", body: { discord_notified_at: new Date().toISOString() } });
    return json({ ok: true, id: msg.id });
  } catch (e) { return errorResponse(e); }
}
