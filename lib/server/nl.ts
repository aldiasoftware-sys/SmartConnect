// Utilidades de servidor para la newsletter (solo las importan las funciones de Cloudflare en functions/).
// Aquí viven la clave secreta de Supabase y la de Resend: nunca llegan al navegador.

export type Env = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  RESEND_API_KEY?: string;
  /** «ALDIA Intelligence <newsletter@aldiaproject.es>» (dominio verificado en Resend) */
  NEWSLETTER_FROM?: string;
  NEWSLETTER_REPLY_TO?: string;
  /** Webs que pueden enviar el formulario de alta, separadas por comas (p. ej. https://aldiaproject.es) */
  NEWSLETTER_ORIGINS?: string;
  /** Dirección pública del panel para los enlaces de los correos (por defecto, la de la petición) */
  NEWSLETTER_SITE?: string;
};
export type Ctx = { request: Request; env: Env };

export const FROM_FALLBACK = "ALDIA Intelligence <onboarding@resend.dev>";

export const json = (data: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers } });

export const site = (ctx: Ctx) => (ctx.env.NEWSLETTER_SITE || new URL(ctx.request.url).origin).replace(/\/$/, "");

/** CORS solo para las webs permitidas (el formulario de aldiaproject.es) y el propio panel. */
export function cors(ctx: Ctx): Record<string, string> {
  const origin = ctx.request.headers.get("origin");
  if (!origin) return {};
  const allowed = [new URL(ctx.request.url).origin, ...(ctx.env.NEWSLETTER_ORIGINS || "").split(",").map((s) => s.trim().replace(/\/$/, "")).filter(Boolean)];
  return allowed.includes(origin) ? { "access-control-allow-origin": origin, "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, authorization", vary: "origin" } : {};
}

// ---------- Supabase con la clave secreta (se salta RLS) ----------
function adminHeaders(env: Env): Record<string, string> {
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "";
  // las claves nuevas (sb_secret_…) van solo en «apikey»; las antiguas (JWT) también como Bearer
  return key.startsWith("sb_") ? { apikey: key } : { apikey: key, authorization: `Bearer ${key}` };
}

export async function db<T = any>(env: Env, path: string, init: { method?: string; body?: unknown; prefer?: string } = {}): Promise<T> {
  const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, {
    method: init.method || "GET",
    headers: { ...adminHeaders(env), "content-type": "application/json", ...(init.prefer ? { prefer: init.prefer } : {}) },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : null) as T;
}

/** ¿Quien llama es del equipo? Comprueba su sesión de Supabase con is_team() y devuelve su email. */
export async function teamUser(ctx: Ctx): Promise<string | null> {
  const auth = ctx.request.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+/.test(auth)) return null;
  const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anon } = ctx.env;
  const [isTeam, user] = await Promise.all([
    fetch(`${url}/rest/v1/rpc/is_team`, { method: "POST", headers: { apikey: anon, authorization: auth, "content-type": "application/json" }, body: "{}" }),
    fetch(`${url}/auth/v1/user`, { headers: { apikey: anon, authorization: auth } }),
  ]);
  if (!isTeam.ok || !user.ok || (await isTeam.json()) !== true) return null;
  return ((await user.json()) as { email?: string }).email || null;
}

// ---------- Resend ----------
export type Mail = { to: string; subject: string; html: string; text?: string; headers?: Record<string, string> };

const mailBody = (env: Env, m: Mail) => ({
  from: env.NEWSLETTER_FROM || FROM_FALLBACK, to: [m.to], subject: m.subject, html: m.html, text: m.text,
  ...(env.NEWSLETTER_REPLY_TO ? { reply_to: env.NEWSLETTER_REPLY_TO } : {}), ...(m.headers ? { headers: m.headers } : {}),
});

async function resend(env: Env, path: string, body: unknown) {
  const res = await fetch(`https://api.resend.com${path}`, {
    method: "POST", headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" }, body: JSON.stringify(body),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) { const err = new Error(data?.message || `Resend ${res.status}`) as Error & { status?: number }; err.status = res.status; throw err; }
  return data;
}

export const sendMail = (env: Env, m: Mail) => resend(env, "/emails", mailBody(env, m)) as Promise<{ id: string }>;

/** Hasta 100 correos en una sola llamada; devuelve los ids en el mismo orden. */
export async function sendBatch(env: Env, mails: Mail[]): Promise<string[]> {
  const data = await resend(env, "/emails/batch", mails.map((m) => mailBody(env, m)));
  return (data?.data || []).map((d: { id: string }) => d.id);
}

export const EMAIL_RE = /^[^\s@<>()[\]\\,;:"]+@[^\s@<>()[\]\\,;:"]+\.[a-z]{2,}$/i;
