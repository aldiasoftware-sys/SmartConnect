// POST /api/discord/announce · publica un anuncio en #anuncios con formato de tarjeta (solo equipo)
import { ACCENT, ANNOUNCEMENTS_ID, Ctx, discord, errorResponse, json, teamUser } from "../../../lib/server/discord";

type Body = { title?: string; body?: string; image_url?: string; button_label?: string; button_url?: string; crosspost?: boolean };
const isUrl = (u?: string) => !!u && /^https:\/\/\S+$/i.test(u);

export async function onRequestPost(ctx: Ctx) {
  const who = await teamUser(ctx);
  if (!who) return json({ ok: false, error: "Solo para el equipo" }, 401);
  const b = (await ctx.request.json().catch(() => ({}))) as Body;
  const title = (b.title || "").trim(), text = (b.body || "").trim();
  if (!title || !text) return json({ ok: false, error: "Faltan título y texto" }, 400);
  if (title.length > 200 || text.length > 3500) return json({ ok: false, error: "Texto demasiado largo" }, 400);
  const comps: any[] = [];
  if (isUrl(b.image_url)) comps.push({ type: 12, items: [{ media: { url: b.image_url } }] });
  comps.push({ type: 10, content: `## ${title}` }, { type: 10, content: text });
  if (b.button_label && isUrl(b.button_url)) comps.push({ type: 1, components: [{ type: 2, style: 5, label: b.button_label.slice(0, 80), url: b.button_url }] });
  comps.push({ type: 10, content: "-# ALDIA · AI ENGINEERING PIONEERS" });
  try {
    const msg = await discord(ctx.env, `/channels/${ANNOUNCEMENTS_ID}/messages`, { method: "POST",
      body: { flags: 1 << 15, components: [{ type: 17, accent_color: ACCENT, components: comps }], allowed_mentions: { parse: [] } } });
    let crossposted = false;
    if (b.crosspost) crossposted = !!(await discord(ctx.env, `/channels/${ANNOUNCEMENTS_ID}/messages/${msg.id}/crosspost`, { method: "POST" }).catch(() => null));
    return json({ ok: true, id: msg.id, crossposted, url: `https://discord.com/channels/1568717330437902386/${ANNOUNCEMENTS_ID}/${msg.id}` });
  } catch (e) { return errorResponse(e); }
}
