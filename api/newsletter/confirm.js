"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// vercel-api/newsletter/confirm.ts
var confirm_exports = {};
__export(confirm_exports, {
  GET: () => GET
});
module.exports = __toCommonJS(confirm_exports);

// lib/server/nl.ts
var site = (ctx) => (ctx.env.NEWSLETTER_SITE || new URL(ctx.request.url).origin).replace(/\/$/, "");
function adminHeaders(env2) {
  const key = env2.SUPABASE_SERVICE_ROLE_KEY || "";
  return key.startsWith("sb_") ? { apikey: key } : { apikey: key, authorization: `Bearer ${key}` };
}
async function db(env2, path, init = {}) {
  const res = await fetch(`${env2.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`, {
    method: init.method || "GET",
    headers: { ...adminHeaders(env2), "content-type": "application/json", ...init.prefer ? { prefer: init.prefer } : {} },
    body: init.body === void 0 ? void 0 : JSON.stringify(init.body)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : null;
}

// functions/api/newsletter/confirm.ts
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function onRequestGet(ctx) {
  const t = new URL(ctx.request.url).searchParams.get("t") || "";
  const go = (estado) => Response.redirect(`${site(ctx)}/n?estado=${estado}`, 303);
  if (!UUID.test(t)) return go("error");
  try {
    const rows = await db(ctx.env, `newsletter_subscribers?select=id,status&token=eq.${t}`);
    const sub = rows[0];
    if (!sub) return go("error");
    if (sub.status !== "activo") {
      await db(ctx.env, `newsletter_subscribers?id=eq.${sub.id}`, { method: "PATCH", body: { status: "activo", confirmed_at: (/* @__PURE__ */ new Date()).toISOString(), unsubscribed_at: null } });
    }
    return go("confirmado");
  } catch (e) {
    console.error("newsletter/confirm", e?.message || e);
    return go("error");
  }
}

// vercel-api/newsletter/confirm.ts
var env = () => process.env;
var GET = (request) => onRequestGet({ request, env: env() });
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GET
});
