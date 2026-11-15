// /api/discord/clientes · posibles clientes salidos del Discord:
//   · quien eligió «Tengo un negocio» al entrar,
//   · mensajes que suenan a encargo («¿cuánto costaría…?», «para mi empresa…») en la comunidad, ayuda y proyectos.
// GET (equipo, desde Smart Connect › Posibles clientes) y POST (n8n con x-discord-secret, cada X minutos).
// Lo nuevo lo avisa el bot en el canal privado 🔒・posibles-clientes (lo crea la primera vez).
import { Ctx, errorResponse, json, teamUser } from "../../../lib/server/discord";
import { collectLeads, notifyLeads } from "../../../lib/server/leads";

export async function onRequestGet(ctx: Ctx) {
  if (!(await teamUser(ctx))) return json({ ok: false, error: "Solo para el equipo" }, 401);
  try {
    const data = await collectLeads(ctx.env);
    const avisados = await notifyLeads(ctx.env, data).catch((e) => { console.error("clientes/aviso", e?.message || e); return -1; });
    return json({ ok: true, ...data, avisados, at: new Date().toISOString() });
  } catch (e: any) {
    if (e?.status === 403 || /50001|Missing Access/i.test(e?.message || "")) return json({ ok: false, needsIntent: true, error: "Faltan permisos del bot en Discord" }, 200);
    return errorResponse(e);
  }
}

export async function onRequestPost(ctx: Ctx) {
  const secret = ctx.request.headers.get("x-discord-secret") || "";
  if (!ctx.env.DISCORD_SECRET || secret !== ctx.env.DISCORD_SECRET) return json({ ok: false, error: "No autorizado" }, 401);
  try {
    const data = await collectLeads(ctx.env);
    const avisados = await notifyLeads(ctx.env, data);
    return json({ ok: true, negocio: data.negocio.length, signals: data.signals.length, avisados });
  } catch (e) { return errorResponse(e); }
}
