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
