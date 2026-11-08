// Adaptador Vercel: reutiliza la función de Cloudflare Pages (mismo código, env desde process.env).
import { onRequestGet, onRequestOptions, onRequestPost } from "../../functions/api/newsletter/baja";

const env = () => process.env as any;
export const GET = (request: Request) => onRequestGet({ request, env: env() } as any);
export const OPTIONS = (request: Request) => onRequestOptions({ request, env: env() } as any);
export const POST = (request: Request) => onRequestPost({ request, env: env() } as any);
