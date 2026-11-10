import { Instagram, Linkedin, Mail, Send } from "lucide-react";
import { Account } from "@/lib/social";

/** Icono cuadrado de la cuenta: LinkedIn con su color, TikTok con la nota, canal de avisos y newsletter. */
export default function AccountIcon({ account, size = 36 }: { account: Account; size?: number }) {
  const ico = { width: size * 0.47, height: size * 0.47 };
  return (
    <span className="acc-ico" style={{ width: size, height: size, borderRadius: size * 0.3, background: account.platform === "tiktok" ? "#0e0e0e" : account.color }}>
      {account.platform === "linkedin" ? <Linkedin style={ico} />
        : account.platform === "instagram" ? <Instagram style={ico} />
        : account.platform === "own" ? (account.id === "newsletter" ? <Mail style={ico} /> : <Send style={ico} />)
        : (
          <svg viewBox="0 0 24 24" fill="none" aria-hidden style={{ width: size * 0.5, height: size * 0.5 }}>
            <path d="M14.5 3c.4 2.3 1.9 3.8 4.5 4v3.1c-1.7 0-3.2-.5-4.5-1.4v6.4a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.2a2.5 2.5 0 1 0 1.6 2.3V3h3.1z" fill="#fff" />
            <path d="M14.5 3c.4 2.3 1.9 3.8 4.5 4" stroke="#25f4ee" strokeWidth="1.2" />
          </svg>
        )}
    </span>
  );
}
