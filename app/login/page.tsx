"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { Shield, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Solo inicio de sesión: las cuentas (Guille y Millán) se crean a mano en Supabase → Authentication → Users.
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Correo o contraseña incorrectos." : error.message);
      setLoading(false);
      return;
    }
    router.replace("/");
  };

  return (
    <div className="login-container">
      <div className="login-card animate-in">
        <div className="login-header">
          <div className="login-logo">
            <Shield style={{ width: "32px", height: "32px" }} />
          </div>
          <h1 className="login-title">Aldia Smart Connect</h1>
          <p className="login-subtitle">
            Panel interno de ALDIA Project.
          </p>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form className="login-form" onSubmit={handleAuth}>
          <div className="form-group">
            <label>Correo Electrónico</label>
            <input 
              type="email" 
              placeholder="nombre@empresa.com" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
          </div>

          <button className="btn-primary login-btn" disabled={loading}>
            {loading ? (
              <Loader2 className="animate-spin" />
            ) : (
              <>
                Iniciar sesión
                <ArrowRight style={{ width: "18px" }} />
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Acceso solo para el equipo de ALDIA.</p>
        </div>
      </div>

      <style jsx>{`
        .login-container {
          height: 100vh;
          width: 100vw;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f9fb;
          padding: 2rem;
        }
        .login-card {
          width: 100%;
          max-width: 440px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          padding: 3.5rem;
          box-shadow: 0 12px 40px rgba(0,0,0,0.03);
        }
        .login-header {
          text-align: center;
          margin-bottom: 2.5rem;
        }
        .login-logo {
          width: 64px;
          height: 64px;
          background: #111827;
          color: #fff;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 1.5rem;
        }
        .login-title {
          font-size: 1.5rem;
          font-weight: 800;
          letter-spacing: -0.04em;
          margin-bottom: 0.5rem;
        }
        .login-subtitle {
          font-size: 0.9375rem;
          color: #6b7280;
        }
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .error-message {
          background: #fef2f2;
          border: 1px solid #fee2e2;
          color: #dc2626;
          padding: 1rem;
          border-radius: 12px;
          font-size: 0.8125rem;
          margin-bottom: 1.5rem;
          text-align: center;
        }
        .login-btn {
          width: 100%;
          height: 48px;
          margin-top: 0.5rem;
        }
        .login-footer {
          margin-top: 2rem;
          text-align: center;
          font-size: 0.875rem;
          color: #6b7280;
        }
        .login-footer button {
          background: none;
          border: none;
          color: #111827;
          font-weight: 700;
          cursor: pointer;
          padding: 0;
          margin-left: 4px;
          text-decoration: underline;
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
