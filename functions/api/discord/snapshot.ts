// POST /api/discord/snapshot · foto diaria (la llama n8n cada noche con el secreto compartido)
import { Ctx, activity, errorResponse, guildCounts, json, snapshot } from "../../../lib/server/discord";

export async function onRequestPost(ctx: Ctx) {
  const secret = ctx.request.headers.get("x-discord-secret") || "";
  if (!ctx.env.DISCORD_SECRET || secret !== ctx.env.DISCORD_SECRET) return json({ ok: false, error: "No autorizado" }, 401);
  try {
    const [g, act] = await Promise.all([guildCounts(ctx.env), activity(ctx.env)]);
    const saved = await snapshot(ctx.env, g.members, g.online, act.messages7d);
    return json({ ok: saved, members: g.members, online: g.online, messages_7d: act.messages7d });
  } catch (e) { return errorResponse(e); }
}
