// GET /api/newsletter/estado · ¿está configurado el envío? (solo dice sí/no, nunca las claves)
import { Ctx, FROM_FALLBACK, json, teamUser } from "../../../lib/server/nl";

export async function onRequestGet(ctx: Ctx) {
  if (!(await teamUser(ctx))) return json({ ok: false, error: "Solo para el equipo" }, 401);
  const from = ctx.env.NEWSLETTER_FROM || FROM_FALLBACK;
  return json({
    ok: true,
    resend: !!ctx.env.RESEND_API_KEY,
    supabase: !!ctx.env.SUPABASE_SERVICE_ROLE_KEY,
    from,
    testMode: from === FROM_FALLBACK,   // con onboarding@resend.dev Resend solo deja enviar a la cuenta dueña
    origins: (ctx.env.NEWSLETTER_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
  });
}
