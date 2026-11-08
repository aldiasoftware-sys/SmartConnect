// Adaptador Vercel: reutiliza la función de Cloudflare Pages (mismo código, env desde process.env).
import { onRequestPost } from "../../functions/api/newsletter/send";

const env = () => process.env as any;
export const POST = (request: Request) => onRequestPost({ request, env: env() } as any);
