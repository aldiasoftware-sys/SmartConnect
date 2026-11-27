import { Linkedin, Mail, Send } from "lucide-react";
import { useId } from "react";
import { Account } from "@/lib/social";

/** Logos oficiales de las redes (formas y colores de marca), en baldosa cuadrada. */
export function BrandLogo({ platform, size = 36 }: { platform: string; size?: number }) {
  const uid = useId().replace(/:/g, "");
  const r = size * 0.28;
  if (platform === "youtube") return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="YouTube" className="brand-logo">
      <rect width="40" height="40" rx={r * 40 / size} fill="#fff" />
      <path d="M33.6 13.4a3.5 3.5 0 0 0-2.5-2.5C28.9 10.3 20 10.3 20 10.3s-8.9 0-11.1.6a3.5 3.5 0 0 0-2.5 2.5C5.8 15.6 5.8 20 5.8 20s0 4.4.6 6.6a3.5 3.5 0 0 0 2.5 2.5c2.2.6 11.1.6 11.1.6s8.9 0 11.1-.6a3.5 3.5 0 0 0 2.5-2.5c.6-2.2.6-6.6.6-6.6s0-4.4-.6-6.6z" fill="#FF0000" />
      <path d="M17.2 24.2 24.6 20l-7.4-4.2z" fill="#fff" />
    </svg>
  );
  if (platform === "instagram") return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="Instagram" className="brand-logo">
      <defs>
        <radialGradient id={`ig-${uid}`} cx="0.28" cy="1.05" r="1.25">
          <stop offset="0" stopColor="#FFD776" /><stop offset="0.18" stopColor="#F9A23A" /><stop offset="0.42" stopColor="#EE2A7B" />
          <stop offset="0.7" stopColor="#C42FB0" /><stop offset="1" stopColor="#5B51D8" />
        </radialGradient>
      </defs>
      <rect width="40" height="40" rx={r * 40 / size} fill={`url(#ig-${uid})`} />
      <rect x="10" y="10" width="20" height="20" rx="6" fill="none" stroke="#fff" strokeWidth="2.4" />
      <circle cx="20" cy="20" r="4.7" fill="none" stroke="#fff" strokeWidth="2.4" />
      <circle cx="25.6" cy="14.4" r="1.4" fill="#fff" />
    </svg>
  );
  if (platform === "tiktok") {
    const note = "M23.6 8.5c.5 2.8 2.3 4.6 5.3 4.8v3.6c-2 0-3.8-.6-5.3-1.6v7.6a6.6 6.6 0 1 1-6.6-6.6c.3 0 .7 0 1 .1v3.7a3 3 0 1 0 2 2.8V8.5z";
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-label="TikTok" className="brand-logo">
        <rect width="40" height="40" rx={r * 40 / size} fill="#000" />
        <path d={note} fill="#25F4EE" transform="translate(-1.1 -1)" />
        <path d={note} fill="#FE2C55" transform="translate(1.1 1)" />
        <path d={note} fill="#fff" />
      </svg>
    );
  }
  if (platform === "discord") return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-label="Discord" className="brand-logo">
      <rect width="40" height="40" rx={r * 40 / size} fill="#5865F2" />
      <path transform="translate(8.5 8.5) scale(0.96)" fill="#fff" d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.865-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.74 19.74 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.058a.082.082 0 0 0 .031.056 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.873-1.295 1.226-1.994a.076.076 0 0 0-.042-.106 13.1 13.1 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
  return null;
}

/** Icono cuadrado de la cuenta: logo real de TikTok, Instagram y YouTube; LinkedIn, canal de avisos y newsletter con icono. */
export default function AccountIcon({ account, size = 36 }: { account: Account; size?: number }) {
  if (["youtube", "instagram", "tiktok"].includes(account.platform)) return <BrandLogo platform={account.platform} size={size} />;
  const ico = { width: size * 0.47, height: size * 0.47 };
  return (
    <span className="acc-ico" style={{ width: size, height: size, borderRadius: size * 0.3, background: account.color }}>
      {account.platform === "linkedin" ? <Linkedin style={ico} />
        : account.id === "newsletter" ? <Mail style={ico} /> : <Send style={ico} />}
    </span>
  );
}
