// Adaptador Vercel: reutiliza la función de Cloudflare Pages (mismo código, env desde process.env).
import { onRequestGet } from "../../functions/api/discord/stats";

const env = () => process.env as any;
export const GET = (request: Request) => onRequestGet({ request, env: env() } as any);
