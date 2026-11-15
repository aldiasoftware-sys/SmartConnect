// Posibles clientes del Discord: quien eligió «Tengo un negocio» y mensajes que suenan a encargo.
// Lo usan /api/discord/clientes (Smart Connect y n8n) y la foto diaria (/api/discord/snapshot).
import { ACCENT, ACTIVITY_CHANNELS, Env, FORUMS, discord } from "./discord";
import { BUSINESS_ROLE, excludedIds, getSettingSrv, isTeam, leadsChannel, listMembers, scanSignals, setSettingSrv, dayMadrid } from "./comunidad";

export async function collectLeads(env: Env) {
  const members = await listMembers(env);
  const excluded = await excludedIds(env, members);
  const teamIds = new Set([...members.filter(isTeam).map((m) => m.id), ...excluded]);
  const negocio = members.filter((m) => !m.bot && !teamIds.has(m.id) && m.roles.includes(BUSINESS_ROLE))
    .map((m) => ({ id: m.id, name: m.name, joined_on: dayMadrid(m.joined), url: `https://discord.com/users/${m.id}` }))
    .sort((a, b) => b.joined_on.localeCompare(a.joined_on));
  const forums = Object.fromEntries(Object.entries(FORUMS).filter(([, n]) => /ayuda|proyectos/.test(n)));
  const signals = await scanSignals(env, ACTIVITY_CHANNELS, forums, teamIds);
  return { negocio, signals };
}

/** Avisa en el canal privado de lo que no se había visto. La primera vez solo deja un resumen (no repasa todo el historial). */
export async function notifyLeads(env: Env, data: Awaited<ReturnType<typeof collectLeads>>) {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return 0;
  const seen = await getSettingSrv<string[] | null>(env, "discord_leads_seen", null);
  const keys = [...data.negocio.map((n) => `n:${n.id}`), ...data.signals.map((s) => `m:${s.id}`)];
  const fresh = seen ? keys.filter((k) => !seen.includes(k)) : [];
  if (seen && !fresh.length) return 0;
  const channel = await leadsChannel(env);
  if (!seen) {
    await discord(env, `/channels/${channel}/messages`, { method: "POST", body: { embeds: [{ color: ACCENT, title: "Posibles clientes: avisos activados",
      description: `Desde ahora aviso aquí de cada persona que elija **Tengo un negocio** al entrar y de cada mensaje que suene a encargo.\n\nAhora mismo: **${data.negocio.length}** con negocio y **${data.signals.length}** mensajes en los últimos 30 días. Están en Smart Connect › Posibles clientes.` }] } });
  } else {
    for (const k of fresh.slice(0, 10)) {
      const n = k.startsWith("n:") ? data.negocio.find((x) => `n:${x.id}` === k) : null;
      const s = k.startsWith("m:") ? data.signals.find((x) => `m:${x.id}` === k) : null;
      const embed = n
        ? { color: ACCENT, title: "Nuevo miembro con negocio", description: `<@${n.id}> eligió **Tengo un negocio** al entrar (${n.joined_on}). Buen momento para saludarle.` }
        : s ? { color: ACCENT, title: `Suena a encargo · ${s.channel}`, description: `<@${s.authorId}>: «${s.content.slice(0, 300)}»\n\n[Ir al mensaje](${s.url})`, footer: { text: `Detectado por: «${s.match}»` } } : null;
      if (embed) await discord(env, `/channels/${channel}/messages`, { method: "POST", body: { embeds: [embed], allowed_mentions: { parse: [] } } });
    }
  }
  await setSettingSrv(env, "discord_leads_seen", Array.from(new Set([...(seen || []), ...keys])).slice(-1000));
  return fresh.length;
}

