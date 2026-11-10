// Las dos cuentas del panel. El email es el de la cuenta en Supabase → Authentication → Users
// (y el mismo que hay en team_access, ver seguridad_rls.sql). Se configuran en .env.local / Cloudflare Pages.
// owner: como aparece en el calendario · folder: su carpeta en Archivos · linkedin: su cuenta en Redes.
export type TeamMember = { id: "guille" | "millan"; name: string; email: string; owner: string; folder: string; linkedin: string };

export const TEAM: TeamMember[] = [
  { id: "guille", name: "Guille", email: process.env.NEXT_PUBLIC_EMAIL_GUILLE || "", owner: "Guille", folder: "Guille", linkedin: "linkedin_guille" },
  { id: "millan", name: "Millán", email: process.env.NEXT_PUBLIC_EMAIL_MILLAN || "", owner: "Millán", folder: "Alejandro", linkedin: "linkedin_millan" },
];

export const memberByEmail = (email?: string | null) =>
  TEAM.find((m) => m.email && email && m.email.toLowerCase() === email.toLowerCase()) || null;

/** Lo que en el calendario es de los dos (la cuenta conjunta y lo que aún no tiene dueño). */
export const SHARED_OWNER = "Aldia";
export const isShared = (owner?: string | null) => !owner || owner === SHARED_OWNER || owner === "Ambos";

/** ¿Esta pieza va en el calendario de esta persona? (por su nombre en el calendario, su nombre o su carpeta de Archivos) */
export const ownedBy = (owner: string | null | undefined, m: TeamMember) => !!owner && (owner === m.owner || owner === m.name || owner === m.folder);
