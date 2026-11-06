"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { TEAM, TeamMember } from "@/lib/team";
import s from "./login.module.css";

// Login del equipo: se elige quién entra (Guille o Millán) y solo se escribe la contraseña.
export default function LoginPage() {
  const router = useRouter();
  const [who, setWho] = useState<TeamMember | null>(null);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (who) setTimeout(() => input.current?.focus(), 250);
  }, [who]);

  const pick = (m: TeamMember) => { setWho(m); setPassword(""); setError(null); setShow(false); };
  const back = () => { setWho(null); setPassword(""); setError(null); };

  const fail = (msg: string) => { setError(msg); setShake((n) => n + 1); setLoading(false); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!who || !password) return;
    if (!who.email) return fail(`Falta configurar el email de ${who.name} (NEXT_PUBLIC_EMAIL_${who.id.toUpperCase()}).`);
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email: who.email, password });
    if (error) return fail(error.message === "Invalid login credentials" ? "Contraseña incorrecta." : error.message);
    router.replace("/");
  };

  return (
    <div className={s.page}>
      {/* Lado de marca */}
      <section className={s.brand} aria-hidden="true">
        <div className={s.aurora}>
          <span className={s.blobA} />
          <span className={s.blobB} />
          <span className={s.blobC} />
        </div>
        <div className={s.grid} />
        <div className={s.brandTop}>
          <img src="/aldia-mark.png" alt="" className={s.mark} />
          <span>ALDIA PROJECT</span>
        </div>
        <h1 className={s.claim}>
          Automatiza hoy.<br />
          <span>Lidera mañana.</span>
        </h1>
        <div className={s.brandFoot}>
          <span className={s.dot} /> Aldia Smart Connect · panel interno
        </div>
      </section>

      {/* Acceso */}
      <section className={s.panel}>
        <div className={s.card}>
          <img src="/aldia-mark.png" alt="ALDIA" className={s.mobileMark} />

          {!who ? (
            <div key="who" className={s.step}>
              <p className={s.eyebrow}>Hola de nuevo</p>
              <h2 className={s.title}>¿Quién entra hoy?</h2>
              <div className={s.people}>
                {TEAM.map((m, i) => (
                  <button key={m.id} className={s.person} style={{ animationDelay: `${120 + i * 90}ms` }} onClick={() => pick(m)}>
                    <span className={s.avatar}>{m.name[0]}</span>
                    <span className={s.personName}>{m.name}</span>
                    <span className={s.personGo}>Entrar <ArrowRight size={15} /></span>
                  </button>
                ))}
              </div>
              <p className={s.note}>Acceso solo para el equipo de ALDIA.</p>
            </div>
          ) : (
            <form key="pass" className={s.step} onSubmit={submit}>
              <button type="button" className={s.back} onClick={back}>
                <ArrowLeft size={15} /> No soy {who.name}
              </button>
              <div className={s.who}>
                <span className={`${s.avatar} ${s.avatarLg}`}>{who.name[0]}</span>
                <div>
                  <p className={s.eyebrow}>Bienvenido</p>
                  <h2 className={s.title}>Hola, {who.name}</h2>
                </div>
              </div>

              <label className={s.label} htmlFor="pw">Contraseña</label>
              <div key={shake} className={`${s.field} ${error ? s.fieldError : ""} ${shake ? s.shake : ""}`}>
                <input
                  id="pw"
                  ref={input}
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  placeholder="••••••••"
                />
                <button type="button" className={s.eye} onClick={() => setShow((v) => !v)} aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}>
                  {show ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {error && <p className={s.error} role="alert">{error}</p>}

              <button className={s.submit} disabled={loading || !password}>
                {loading ? <Loader2 size={18} className={s.spin} /> : <>Entrar al panel <ArrowRight size={18} /></>}
              </button>
            </form>
          )}
        </div>
        <p className={s.footer}>aldiaproject.es</p>
      </section>
    </div>
  );
}
