// Adaptador Vercel: reutiliza la función de Cloudflare Pages (mismo código, env desde process.env).
import { onRequestOptions, onRequestPost } from "../../functions/api/newsletter/subscribe";

const env = () => process.env as any;
export const OPTIONS = (request: Request) => onRequestOptions({ request, env: env() } as any);
export const POST = (request: Request) => onRequestPost({ request, env: env() } as any);
