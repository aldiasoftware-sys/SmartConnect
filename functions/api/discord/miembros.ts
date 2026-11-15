// GET /api/discord/miembros · el día en que entró cada miembro y cuántos hay de cada perfil (solo equipo).
// Alimenta el contador de Comunidad sin apuntar nada a mano. No devuelve nombres: solo fechas y recuentos.
// Necesita «Server Members Intent» en el bot (Discord Developer Portal › Bot › Privileged Gateway Intents).
import { Ctx, errorResponse, json, teamUser } from "../../../lib/server/discord";
import { INTEREST_ROLES, LEVEL_ROLES, dayMadrid, isTeam, listMembers } from "../../../lib/server/comunidad";

export async function onRequestGet(ctx: Ctx) {
  if (!(await teamUser(ctx))) return json({ ok: false, error: "Solo para el equipo" }, 401);
  try {
    const people = (await listMembers(ctx.env)).filter((m) => !m.bot);
    const community = people.filter((m) => !isTeam(m));            // el equipo no cuenta en los perfiles
    const count = (names: string[]) => names.map((name) => ({ name, count: community.filter((m) => m.roles.includes(name)).length }));
    return json({
      ok: true,
      joins: people.map((m) => dayMadrid(m.joined)).sort(),
      total: people.length,
      perfiles: count(INTEREST_ROLES),
      niveles: count(LEVEL_ROLES),
      sinPerfil: community.filter((m) => !m.roles.some((r) => INTEREST_ROLES.includes(r))).length,
      comunidad: community.length,
      at: new Date().toISOString(),
    });
  } catch (e: any) {
    // 403 / 50001: el bot no tiene activado «Server Members Intent»
    if (e?.status === 403 || /50001|Missing Access/i.test(e?.message || "")) return json({ ok: false, needsIntent: true, error: "Activa «Server Members Intent» en el bot de Discord" }, 200);
    return errorResponse(e);
  }
}
