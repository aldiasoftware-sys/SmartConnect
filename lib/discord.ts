// Datos compartidos del apartado Discord (navegador). Las claves viven en functions/api/discord.

export const DISCORD_SERVER_URL = "https://discord.com/channels/1568717330437902386";

/** Metas de miembros del Discord, alineadas con las revisiones del roadmap (S4, S8, S12). Ajustables. */
export const DISCORD_GOALS = [
  { week: 4, until: "2026-12-06", target: 30 },
  { week: 8, until: "2027-01-03", target: 75 },
  { week: 12, until: "2027-01-31", target: 150 },
];
export function discordGoalFor(day: string) {
  return DISCORD_GOALS.find((g) => day <= g.until) || DISCORD_GOALS[DISCORD_GOALS.length - 1];
}

/** Redes del Calendario que tienen canal de avisos en el Discord. */
export const SOCIAL_TARGETS: Record<string, { label: string; emoji: string }> = {
  tiktok: { label: "TikTok", emoji: "🎵" },
  instagram: { label: "Instagram", emoji: "📸" },
  youtube: { label: "YouTube", emoji: "▶️" },
  linkedin: { label: "LinkedIn", emoji: "💼" },
};

export type DiscordStats = {
  ok: boolean; error?: string;
  guild: { name: string; icon: string | null; members: number; online: number };
  invite: string;
  activity: {
    channels: { id: string; name: string; messages: number }[];
    forums: { id: string; name: string; open: number; new7d: number; replies: number }[];
    byDay: { day: string; messages: number }[];
    activeAuthors: number; messages7d: number;
  };
  history: { day: string; members: number; online: number; messages_7d: number }[];
  historyReady: boolean;
  serviceKey?: boolean;
};

export type FlowStatus = {
  slug: string; name: string; schedule: string; manual: boolean; form: string | null;
  last: { status: string; at: string; mode: string } | null; runs7d: number; errors7d: number;
};
