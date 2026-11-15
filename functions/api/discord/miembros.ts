// GET /api/discord/miembros · el día en que entró cada miembro y cuántos hay de cada perfil (solo equipo).
// Alimenta el contador de Comunidad sin apuntar nada a mano. No devuelve nombres: solo fechas y recuentos.
// Necesita «Server Members Intent» en el bot (Discord Developer Portal › Bot › Privileged Gateway Intents).
import { Ctx, errorResponse, json, teamUser } from "../../../lib/server/discord";
import { INTEREST_ROLES, LEVEL_ROLES, dayMadrid, excludedIds, isTeam, listMembers } from "../../../lib/server/comunidad";

export async function onRequestGet(ctx: Ctx) {
  if (!(await teamUser(ctx))) return json({ ok: false, error: "Solo para el equipo" }, 401);
  try {
    const people = (await listMembers(ctx.env)).filter((m) => !m.bot);
    const excluded = await excludedIds(ctx.env, people);
    const community = people.filter((m) => !isTeam(m) && !excluded.has(m.id));   // el equipo y sus otras cuentas no cuentan
    const count = (names: string[]) => names.map((name) => ({ name, count: community.filter((m) => m.roles.includes(name)).length }));
    return json({
      ok: true,
      joins: community.map((m) => dayMadrid(m.joined)).sort(),
      total: community.length,
      // para la lista «Quién no cuenta» de Comunidad
      cuentas: people.map((m) => ({ id: m.id, name: m.name, username: m.username, joined_on: dayMadrid(m.joined), team: isTeam(m), excluded: isTeam(m) || excluded.has(m.id) }))
        .sort((a, b) => a.joined_on.localeCompare(b.joined_on)),
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
