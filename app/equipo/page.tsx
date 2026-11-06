"use client";

import { useState, useEffect, useMemo } from "react";
import { Plus, X, Users, Search, Mail, UserCheck, Shield, SearchX, UserPlus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Portal from "@/components/Portal";
import { CardMenu } from "@/components/Papelera";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'pending';
}

const ROLES = ["Miembro", "Desarrollador", "Ventas", "Administrador"];

/** Degradados para los avatares: cada persona tiene siempre el mismo según su nombre. */
const GRADIENTS = [
  "linear-gradient(140deg, #13285a, #1e3a8a)",
  "linear-gradient(140deg, #1e3a8a, #3b6fe0)",
  "linear-gradient(140deg, #0a1633, #2c4a9a)",
  "linear-gradient(140deg, #12a26b, #1e3a8a)",
  "linear-gradient(140deg, #3b6fe0, #7c9cf0)",
];
const gradientFor = (name: string) => {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
};
const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "U";
  return ((parts[0][0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
};

export default function TeamPage() {
  const { user: authUser } = useAuth();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("todos");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Miembro' });

  const fetchTeam = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('team_members')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) console.error("Error fetching team:", error);
    else setTeam(data.map(d => ({
      id: d.id,
      name: d.full_name,
      email: d.email,
      role: d.role,
      status: d.status as any
    })));
    setLoading(false);
  };

  useEffect(() => {
    if (authUser) fetchTeam();
    else setLoading(false);
  }, [authUser]);

  const handleCreatePersona = async () => {
    if (!form.name) return;

    // Generate a dummy email if none provided
    const userEmail = form.email || `${form.name.toLowerCase().replace(/\s+/g, '')}@equipo.local`;

    const { error } = await supabase.from('team_members').insert({
      full_name: form.name,
      email: userEmail,
      role: form.role,
      status: 'active'
    });

    if (error) console.error("Error creating persona:", error);
    else fetchTeam();

    setIsModalOpen(false);
    setForm({ name: '', email: '', role: 'Miembro' });
  };

  const handleDelete = async (id: string, email: string) => {
    if (email === authUser?.email) {
      alert("No puedes eliminarte a ti mismo.");
      return;
    }
    if (confirm("¿Estás seguro de que quieres eliminar a esta persona?")) {
      await supabase.from('team_members').delete().eq('id', id);
      fetchTeam();
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setForm({ name: '', email: '', role: 'Miembro' });
  };

  // Roles presentes en el equipo, con su recuento, para las pastillas de filtro
  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    team.forEach(m => { counts[m.role || "Miembro"] = (counts[m.role || "Miembro"] || 0) + 1; });
    return counts;
  }, [team]);
  const roles = Object.keys(roleCounts);

  useEffect(() => {
    if (roleFilter !== "todos" && !roleCounts[roleFilter]) setRoleFilter("todos");
  }, [roleCounts, roleFilter]);

  const filteredTeam = team.filter(m =>
    (m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.email.toLowerCase().includes(searchQuery.toLowerCase())) &&
    (roleFilter === "todos" || (m.role || "Miembro") === roleFilter)
  );

  const activeCount = team.filter(m => m.status !== 'pending').length;
  const pendingCount = team.length - activeCount;
  const isLocalEmail = (email: string) => email.endsWith("@equipo.local");

  return (
    <div className="page-wrapper">
      <div className="mx-head">
        <div>
          <div className="eyebrow">Equipo</div>
          <h2>Personal {!loading && <span className="mx-count">{team.length} {team.length === 1 ? "persona" : "personas"}</span>}</h2>
          <p>Gestiona las personas del equipo para asignarlas a tareas.</p>
        </div>
        <div className="mx-head-actions">
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus style={{ width: '18px', height: '18px' }} />
            Añadir Persona
          </button>
        </div>
      </div>

      <div className="mx-stats">
        <div className="mx-stat hero">
          <div className="mx-stat-top">
            <span className="mx-stat-label">Equipo</span>
            <span className="mx-ico"><Users /></span>
          </div>
          <div className="mx-stat-value">{loading ? "–" : team.length}</div>
          <div className="mx-stat-sub">personas para asignar tareas</div>
        </div>
        <div className="mx-stat">
          <div className="mx-stat-top">
            <span className="mx-stat-label">Activas</span>
            <span className="mx-ico ok"><UserCheck /></span>
          </div>
          <div className="mx-stat-value">{loading ? "–" : activeCount}</div>
          <div className="mx-stat-sub">{pendingCount > 0 ? `${pendingCount} pendiente${pendingCount === 1 ? "" : "s"} de confirmar` : "todas confirmadas"}</div>
        </div>
        <div className="mx-stat">
          <div className="mx-stat-top">
            <span className="mx-stat-label">Roles</span>
            <span className="mx-ico"><Shield /></span>
          </div>
          <div className="mx-stat-value">{loading ? "–" : roles.length}</div>
          <div className="mx-stat-sub mx-trunc">{roles.length ? roles.join(" · ") : "sin roles todavía"}</div>
        </div>
      </div>

      <div className="mx-toolbar">
        <div className="mx-search">
          <Search />
          <input
            type="text"
            placeholder="Buscar persona por nombre o correo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {roles.length > 1 && (
          <div className="mx-pills role-pills" role="tablist" aria-label="Filtrar por rol">
            <button className={roleFilter === "todos" ? "on" : ""} onClick={() => setRoleFilter("todos")}>
              Todos <b>{team.length}</b>
            </button>
            {roles.map(r => (
              <button key={r} className={roleFilter === r ? "on" : ""} onClick={() => setRoleFilter(r)}>
                {r} <b>{roleCounts[r]}</b>
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="mx-grid">
          {[0, 1, 2].map(i => <div key={i} className="mx-skeleton" style={{ height: 196, borderRadius: 20 }} />)}
        </div>
      ) : team.length === 0 ? (
        <div className="mx-empty">
          <span className="mx-ico"><UserPlus /></span>
          <h3>Aún no hay nadie en el equipo</h3>
          <p>Añade a las personas con las que trabajas para poder asignarles tareas.</p>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus style={{ width: '16px', height: '16px' }} /> Añadir Persona
          </button>
        </div>
      ) : filteredTeam.length === 0 ? (
        <div className="mx-empty">
          <span className="mx-ico"><SearchX /></span>
          <h3>Nadie coincide con la búsqueda</h3>
          <p>Prueba con otro nombre o correo{roleFilter !== "todos" ? `, o quita el filtro «${roleFilter}»` : ""}.</p>
          <button className="btn-secondary" onClick={() => { setSearchQuery(""); setRoleFilter("todos"); }}>
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="mx-grid team-grid">
          {filteredTeam.map((member) => {
            const isMe = !!authUser?.email && member.email === authUser.email;
            const pending = member.status === 'pending';
            return (
              <div key={member.id} className="mx-card person">
                <div className="person-top">
                  <div className="mx-avatar lg person-avatar" style={{ background: gradientFor(member.name || "U") }}>
                    {initials(member.name || "")}
                    <span className={`presence ${pending ? "pending" : "active"}`} aria-hidden />
                  </div>
                  <CardMenu onDelete={() => handleDelete(member.id, member.email)} />
                </div>

                <div className="person-id">
                  <div className="mx-title mx-trunc">
                    {member.name}
                    {isMe && <span className="me-tag">Tú</span>}
                  </div>
                  {isLocalEmail(member.email) ? (
                    <div className="mx-meta mx-trunc person-mail"><Mail /> Sin correo asociado</div>
                  ) : (
                    <a className="mx-meta mx-trunc person-mail" href={`mailto:${member.email}`} title={member.email}>
                      <Mail /> {member.email}
                    </a>
                  )}
                </div>

                <div className="person-foot">
                  <span className="mx-pill info"><Shield className="pill-ico" /> {member.role || "Miembro"}</span>
                  <span className={`mx-pill ${pending ? "warn" : "ok"}`}><i /> {pending ? "Pendiente" : "Activo"}</span>
                </div>
              </div>
            );
          })}

          <button className="add-card" onClick={() => setIsModalOpen(true)}>
            <span className="mx-ico"><Plus /></span>
            <span className="mx-title">Añadir Persona</span>
            <span className="mx-meta">Suma a alguien más al equipo</span>
          </button>
        </div>
      )}

      {isModalOpen && (
        <Portal>
          <div className="dialog-overlay" onClick={closeModal}>
            <form
              className="dialog"
              style={{ maxWidth: 480 }}
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => { e.preventDefault(); handleCreatePersona(); }}
            >
              <div className="dialog-head">
                <div className="flex items-center gap-3">
                  <div className="mx-avatar lg" style={{ background: form.name ? gradientFor(form.name) : undefined }}>
                    {form.name ? initials(form.name) : <UserPlus style={{ width: 20, height: 20 }} />}
                  </div>
                  <div>
                    <div className="eyebrow" style={{ marginBottom: 2 }}>Equipo</div>
                    <h3 style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em" }}>Añadir Persona</h3>
                  </div>
                </div>
                <button type="button" className="icon-btn" onClick={closeModal} aria-label="Cerrar"><X /></button>
              </div>
              <div className="dialog-body">
                <div className="form-group">
                  <label>Nombre de la Persona</label>
                  <input autoFocus value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej: Juan Pérez" />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico (Opcional)</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Para asociar cuenta real si existe..." />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Responsabilidad / Rol</label>
                  <div className="seg" style={{ flexWrap: "wrap" }}>
                    {ROLES.map(r => (
                      <button type="button" key={r} className={form.role === r ? "on" : ""} onClick={() => setForm({ ...form, role: r })}>
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="dialog-foot">
                <span />
                <div className="flex gap-2">
                  <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn-primary" disabled={!form.name.trim()}>Crear Persona</button>
                </div>
              </div>
            </form>
          </div>
        </Portal>
      )}

      <style jsx>{`
        .team-grid {
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        }
        .person {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          padding: 1.25rem;
          overflow: visible;
        }
        .person:hover,
        .person:focus-within {
          z-index: 3;
        }
        .person::before {
          content: "";
          position: absolute;
          inset: 0 0 auto 0;
          height: 64px;
          border-radius: 20px 20px 0 0;
          background: linear-gradient(180deg, var(--bg-secondary), rgba(244, 246, 250, 0));
          pointer-events: none;
        }
        .person-top {
          position: relative;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
        }
        .person-avatar {
          position: relative;
          width: 60px;
          height: 60px;
          border-radius: 18px;
          font-size: 1.25rem;
          letter-spacing: -0.02em;
          box-shadow: 0 14px 28px -14px rgba(10, 22, 51, 0.55);
        }
        .presence {
          position: absolute;
          right: -3px;
          bottom: -3px;
          width: 14px;
          height: 14px;
          border-radius: 99px;
          border: 3px solid #fff;
          background: var(--ok);
        }
        .presence.pending {
          background: var(--warn);
        }
        .person-id {
          position: relative;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .person-id .mx-title {
          font-size: 1.0625rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .me-tag {
          flex-shrink: 0;
          font-size: 0.6875rem;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 99px;
          background: var(--navy);
          color: #fff;
          letter-spacing: 0;
        }
        .person-mail {
          display: flex;
          align-items: center;
          gap: 6px;
          text-decoration: none;
          color: var(--text-muted);
          transition: color 0.15s ease;
        }
        a.person-mail:hover {
          color: var(--accent);
        }
        .person-mail :global(svg) {
          width: 13px;
          height: 13px;
          flex-shrink: 0;
        }
        .person-foot {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: auto;
          padding-top: 0.875rem;
          border-top: 1px solid var(--border-color);
        }
        .person-foot :global(.pill-ico) {
          width: 12px;
          height: 12px;
        }
        .add-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 196px;
          padding: 1.25rem;
          border: 1px dashed var(--border-strong);
          border-radius: 20px;
          background: transparent;
          font-family: inherit;
          cursor: pointer;
          transition: var(--transition);
        }
        .add-card .mx-ico {
          margin-bottom: 0.375rem;
          transition: var(--transition);
        }
        .add-card:hover {
          border-color: var(--accent);
          background: #fff;
          box-shadow: var(--shadow-sm);
        }
        .add-card:hover .mx-ico {
          background: var(--accent);
          color: #fff;
          transform: rotate(90deg);
        }
        .role-pills {
          max-width: 100%;
          overflow-x: auto;
          scrollbar-width: none;
        }
        .role-pills::-webkit-scrollbar {
          display: none;
        }
        @media (max-width: 720px) {
          .team-grid {
            grid-template-columns: 1fr;
          }
          .add-card {
            min-height: 120px;
          }
          .mx-head-actions,
          .mx-head-actions :global(.btn-primary) {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
