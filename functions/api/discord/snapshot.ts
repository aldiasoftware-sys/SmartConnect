// POST /api/discord/snapshot · foto diaria (la llama n8n cada noche con el secreto compartido)
import { Ctx, activity, errorResponse, guildCounts, json, snapshot } from "../../../lib/server/discord";
import { collectLeads, notifyLeads } from "../../../lib/server/leads";

export async function onRequestPost(ctx: Ctx) {
  const secret = ctx.request.headers.get("x-discord-secret") || "";
  if (!ctx.env.DISCORD_SECRET || secret !== ctx.env.DISCORD_SECRET) return json({ ok: false, error: "No autorizado" }, 401);
  try {
    const [g, act] = await Promise.all([guildCounts(ctx.env), activity(ctx.env)]);
    const saved = await snapshot(ctx.env, g.members, g.online, act.messages7d);
    // de paso, avisa en 🔒・posibles-clientes de lo nuevo (si falla, la foto ya está guardada)
    const avisados = await collectLeads(ctx.env).then((d) => notifyLeads(ctx.env, d)).catch((e) => { console.error("snapshot/leads", e?.message || e); return -1; });
    return json({ ok: saved, members: g.members, online: g.online, messages_7d: act.messages7d, avisados });
  } catch (e) { return errorResponse(e); }
}
