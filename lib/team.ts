// Las dos cuentas del panel. El email es el de la cuenta en Supabase → Authentication → Users
// (y el mismo que hay en team_access, ver seguridad_rls.sql). Se configuran en .env.local / Cloudflare Pages.
export type TeamMember = { id: "guille" | "millan"; name: string; email: string };

export const TEAM: TeamMember[] = [
  { id: "guille", name: "Guille", email: process.env.NEXT_PUBLIC_EMAIL_GUILLE || "" },
  { id: "millan", name: "Millán", email: process.env.NEXT_PUBLIC_EMAIL_MILLAN || "" },
];
