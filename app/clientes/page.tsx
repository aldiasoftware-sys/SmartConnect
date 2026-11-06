"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Portal from "@/components/Portal";
import {
  Mail,
  Phone,
  MessageSquare,
  Trash2,
  CheckCircle2,
  Clock,
  Search,
  Inbox,
  X,
  AlertTriangle,
  RotateCcw,
  Send,
  SearchX,
  Calendar,
} from "lucide-react";

interface ContactMessage {
  id: string;
  created_at: string;
  nombre_cliente: string;
  correo_cliente: string;
  telefono_cliente: string;
  mensaje_cliente: string;
  estado: "sin responder" | "respondido";
}

type Filtro = "todos" | "sin responder" | "respondido";

const AVATAR_GRADIENTS = [
  "linear-gradient(140deg, #13285a, #1e3a8a)",
  "linear-gradient(140deg, #1e3a8a, #3b5fc4)",
  "linear-gradient(140deg, #0a1633, #2b4a9e)",
  "linear-gradient(140deg, #24407f, #5b7fd6)",
  "linear-gradient(140deg, #0f2a4a, #1f6f8b)",
];

function avatarBg(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}

function iniciales(name: string) {
  const parts = (name || "?").trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) || "?";
  const second = parts.length > 1 ? parts[parts.length - 1].charAt(0) : "";
  return (first + second).toUpperCase();
}

function fechaCorta(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (diff >= 0 && diff < 60) return "Ahora";
  if (diff >= 0 && diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (d.toDateString() === now.toDateString()) return `Hoy, ${hora}`;
  const ayer = new Date(now);
  ayer.setDate(now.getDate() - 1);
  if (d.toDateString() === ayer.toDateString()) return `Ayer, ${hora}`;
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}),
  });
}

function fechaLarga(iso: string) {
  return new Date(iso).toLocaleString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function ClientesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<Filtro>("todos");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<ContactMessage | null>(null);

  useEffect(() => {
    fetchMessages();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("realtime-messages")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contact_messages" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setMessages((prev) => [payload.new as ContactMessage, ...prev]);
          } else if (payload.eventType === "UPDATE") {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? (payload.new as ContactMessage) : m))
            );
          } else if (payload.eventType === "DELETE") {
            setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Cerrar el detalle con Escape
  useEffect(() => {
    if (!selectedMessage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedMessage(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedMessage]);

  async function fetchMessages() {
    setLoading(true);
    setError(null);
    try {
      const { data, error: supabaseError } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });

      if (supabaseError) {
        setError(supabaseError.message);
        console.error("Error fetching messages:", supabaseError);
      } else {
        setMessages(data || []);
      }
    } catch (err) {
      setError("Error de conexión inesperado");
    }
    setLoading(false);
  }

  async function deleteMessage(id: string) {
    setDeletingId(id);

    // Esperamos a que la animación termine antes de borrar de Supabase y del estado
    setTimeout(async () => {
      const { error } = await supabase
        .from("contact_messages")
        .delete()
        .eq("id", id);

      if (error) {
        alert("Error al eliminar");
        setDeletingId(null);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== id));
        setSelectedMessage((s) => (s && s.id === id ? null : s));
        setDeletingId(null);
      }
    }, 400); // Duración de la animación
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus: ContactMessage["estado"] =
      currentStatus === "sin responder" ? "respondido" : "sin responder";

    const { error } = await supabase
      .from("contact_messages")
      .update({ estado: newStatus })
      .eq("id", id);

    if (error) {
      alert("Error al actualizar estado");
    } else {
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, estado: newStatus } : m)));
      setSelectedMessage((s) => (s && s.id === id ? { ...s, estado: newStatus } : s));
    }
  }

  const q = searchTerm.trim().toLowerCase();
  const filteredMessages = messages.filter((m) => {
    const matchesSearch =
      !q ||
      (m.nombre_cliente || "").toLowerCase().includes(q) ||
      (m.correo_cliente || "").toLowerCase().includes(q) ||
      (m.mensaje_cliente || "").toLowerCase().includes(q);

    const matchesStatus = filterStatus === "todos" || m.estado === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: messages.length,
    pending: messages.filter((m) => m.estado === "sin responder").length,
    answered: messages.filter((m) => m.estado === "respondido").length,
  };
  const ratio = stats.total ? Math.round((stats.answered / stats.total) * 100) : 0;

  const filtros: { id: Filtro; label: string; count: number }[] = [
    { id: "todos", label: "Todos", count: stats.total },
    { id: "sin responder", label: "Sin responder", count: stats.pending },
    { id: "respondido", label: "Respondidos", count: stats.answered },
  ];

  const hayFiltros = q !== "" || filterStatus !== "todos";
  const sel = selectedMessage;

  return (
    <div className="page-wrapper animate-in">
      {/* Cabecera */}
      <div className="mx-head">
        <div>
          <div className="eyebrow">Bandeja de entrada</div>
          <h2>
            Clientes
            {!loading && <span className="mx-count">{stats.total} {stats.total === 1 ? "mensaje" : "mensajes"}</span>}
          </h2>
          <p>Consultas que llegan desde el formulario de contacto, en tiempo real.</p>
        </div>
        <div className="mx-head-actions">
          <span className="cl-live">
            <i /> En directo
          </span>
        </div>
      </div>

      {error && (
        <div className="cl-error">
          <div className="mx-ico bad">
            <AlertTriangle />
          </div>
          <div className="mx-grow">
            <p className="mx-title">No se han podido cargar los mensajes</p>
            <p className="mx-meta">{error}</p>
          </div>
          <button className="btn-secondary" onClick={fetchMessages}>
            <RotateCcw size={15} /> Reintentar
          </button>
        </div>
      )}

      {/* Métricas */}
      <div className="mx-stats">
        <div className="mx-stat hero">
          <div className="mx-stat-top">
            <span className="mx-stat-label">Total</span>
            <span className="mx-ico">
              <Inbox />
            </span>
          </div>
          <div className="mx-stat-value">{loading ? "—" : stats.total}</div>
          <div className="mx-stat-sub">Mensajes recibidos</div>
        </div>
        <div className="mx-stat">
          <div className="mx-stat-top">
            <span className="mx-stat-label">Pendientes</span>
            <span className="mx-ico warn">
              <Clock />
            </span>
          </div>
          <div className="mx-stat-value">{loading ? "—" : stats.pending}</div>
          <div className="mx-stat-sub">
            {stats.pending === 0 ? "Todo al día" : stats.pending === 1 ? "Espera respuesta" : "Esperan respuesta"}
          </div>
        </div>
        <div className="mx-stat">
          <div className="mx-stat-top">
            <span className="mx-stat-label">Respondidos</span>
            <span className="mx-ico ok">
              <CheckCircle2 />
            </span>
          </div>
          <div className="mx-stat-value">{loading ? "—" : stats.answered}</div>
          <div className="cl-bar" aria-hidden>
            <span style={{ width: `${ratio}%` }} />
          </div>
          <div className="mx-stat-sub">{ratio}% de tasa de respuesta</div>
        </div>
      </div>

      {/* Barra de herramientas */}
      <div className="mx-toolbar">
        <div className="mx-search">
          <Search />
          <input
            type="text"
            placeholder="Buscar por nombre, email o mensaje…"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className="cl-clear" onClick={() => setSearchTerm("")} aria-label="Limpiar búsqueda">
              <X size={14} />
            </button>
          )}
        </div>
        <div className="mx-pills" role="tablist" aria-label="Filtrar por estado">
          {filtros.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filterStatus === f.id}
              className={filterStatus === f.id ? "on" : ""}
              onClick={() => setFilterStatus(f.id)}
            >
              {f.label} <b>{f.count}</b>
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="mx-list">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="mx-row cl-row">
              <div className="mx-skeleton" style={{ width: 40, height: 40, borderRadius: 13, flexShrink: 0 }} />
              <div className="mx-grow">
                <div className="mx-skeleton" style={{ width: "28%", height: 14, marginBottom: 10 }} />
                <div className="mx-skeleton" style={{ width: "40%", height: 11, marginBottom: 12 }} />
                <div className="mx-skeleton" style={{ width: "85%", height: 11, marginBottom: 7 }} />
                <div className="mx-skeleton" style={{ width: "60%", height: 11 }} />
              </div>
              <div className="mx-skeleton cl-skel-pill" style={{ width: 96, height: 24, borderRadius: 99 }} />
            </div>
          ))}
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="mx-empty">
          {messages.length === 0 ? (
            <>
              <div className="mx-ico">
                <MessageSquare />
              </div>
              <h3>Aún no hay mensajes</h3>
              <p>Cuando alguien rellene el formulario de contacto, su consulta aparecerá aquí al momento.</p>
            </>
          ) : (
            <>
              <div className="mx-ico">
                <SearchX />
              </div>
              <h3>Nada por aquí</h3>
              <p>
                {filterStatus === "sin responder" && !q
                  ? "¡Bandeja al día! No queda ningún mensaje sin responder."
                  : "No hay mensajes que coincidan con tu búsqueda o filtro."}
              </p>
              {hayFiltros && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterStatus("todos");
                  }}
                >
                  Ver todos los mensajes
                </button>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="mx-list">
          {filteredMessages.map((msg) => {
            const pendiente = msg.estado === "sin responder";
            return (
              <div
                key={msg.id}
                className={`mx-row click cl-row ${pendiente ? "is-pending" : ""} ${deletingId === msg.id ? "deleting-card" : ""}`}
                onClick={() => setSelectedMessage(msg)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSelectedMessage(msg);
                }}
              >
                <div className="mx-avatar" style={{ background: avatarBg(msg.nombre_cliente || "") }}>
                  {iniciales(msg.nombre_cliente)}
                </div>

                <div className="mx-grow cl-body">
                  <div className="cl-line1">
                    <span className="mx-title mx-trunc">{msg.nombre_cliente}</span>
                    {pendiente && <span className="cl-new" title="Sin responder" />}
                  </div>
                  <div className="cl-contact">
                    <span className="mx-trunc">
                      <Mail size={13} /> {msg.correo_cliente}
                    </span>
                    {msg.telefono_cliente && (
                      <span className="mx-trunc">
                        <Phone size={13} /> {msg.telefono_cliente}
                      </span>
                    )}
                  </div>
                  <p className="cl-preview">{msg.mensaje_cliente}</p>
                </div>

                <div className="cl-side">
                  <span className="mx-meta cl-date">{fechaCorta(msg.created_at)}</span>
                  <div className="cl-actions">
                    <button
                      className={`mx-pill ${pendiente ? "warn" : "ok"}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleStatus(msg.id, msg.estado);
                      }}
                      title={pendiente ? "Marcar como respondido" : "Marcar como pendiente"}
                    >
                      <i /> {pendiente ? "Sin responder" : "Respondido"}
                    </button>
                    <button
                      className="mx-act danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMessage(msg.id);
                      }}
                      title="Eliminar mensaje"
                      aria-label="Eliminar mensaje"
                    >
                      <Trash2 />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detalle */}
      {sel && (
        <Portal>
          <div className="dialog-overlay" onClick={() => setSelectedMessage(null)}>
            <div
              className="dialog"
              style={{ maxWidth: 600 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label={`Mensaje de ${sel.nombre_cliente}`}
            >
              <div className="dialog-head">
                <div className="cl-dhead">
                  <div className="mx-avatar lg" style={{ background: avatarBg(sel.nombre_cliente || "") }}>
                    {iniciales(sel.nombre_cliente)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div className="eyebrow" style={{ marginBottom: 4 }}>Mensaje de contacto</div>
                    <h3 className="cl-dname">{sel.nombre_cliente}</h3>
                    <button
                      className={`mx-pill ${sel.estado === "sin responder" ? "warn" : "ok"}`}
                      style={{ marginTop: 8 }}
                      onClick={() => toggleStatus(sel.id, sel.estado)}
                      title="Cambiar estado"
                    >
                      <i /> {sel.estado === "sin responder" ? "Sin responder" : "Respondido"}
                    </button>
                  </div>
                </div>
                <button type="button" className="icon-btn" onClick={() => setSelectedMessage(null)} aria-label="Cerrar">
                  <X />
                </button>
              </div>

              <div className="dialog-body">
                <div className="cl-quick">
                  <a
                    className="cl-qa"
                    href={`mailto:${sel.correo_cliente}?subject=${encodeURIComponent("Re: tu consulta")}`}
                  >
                    <span className="mx-ico">
                      <Mail />
                    </span>
                    <span className="mx-grow">
                      <span className="cl-qa-label">Email</span>
                      <span className="cl-qa-value mx-trunc">{sel.correo_cliente}</span>
                    </span>
                  </a>
                  {sel.telefono_cliente ? (
                    <a className="cl-qa" href={`tel:${sel.telefono_cliente.replace(/\s+/g, "")}`}>
                      <span className="mx-ico ok">
                        <Phone />
                      </span>
                      <span className="mx-grow">
                        <span className="cl-qa-label">Teléfono</span>
                        <span className="cl-qa-value mx-trunc">{sel.telefono_cliente}</span>
                      </span>
                    </a>
                  ) : (
                    <div className="cl-qa disabled">
                      <span className="mx-ico">
                        <Phone />
                      </span>
                      <span className="mx-grow">
                        <span className="cl-qa-label">Teléfono</span>
                        <span className="cl-qa-value">No proporcionado</span>
                      </span>
                    </div>
                  )}
                </div>

                <div className="cl-msg">
                  <div className="cl-msg-head">
                    <span className="mx-stat-label">Mensaje</span>
                    <span className="mx-meta cl-msg-date">
                      <Calendar size={13} /> {fechaLarga(sel.created_at)}
                    </span>
                  </div>
                  <p>{sel.mensaje_cliente}</p>
                </div>
              </div>

              <div className="dialog-foot">
                <button className="btn-danger" onClick={() => deleteMessage(sel.id)} disabled={deletingId === sel.id}>
                  <Trash2 size={15} /> Eliminar
                </button>
                <div className="cl-foot-r">
                  <button className="btn-secondary" onClick={() => toggleStatus(sel.id, sel.estado)}>
                    {sel.estado === "sin responder" ? (
                      <>
                        <CheckCircle2 size={15} /> Marcar respondido
                      </>
                    ) : (
                      <>
                        <Clock size={15} /> Marcar pendiente
                      </>
                    )}
                  </button>
                  <a
                    className="btn-primary"
                    href={`mailto:${sel.correo_cliente}?subject=${encodeURIComponent("Re: tu consulta")}`}
                  >
                    <Send size={15} /> Responder
                  </a>
                </div>
              </div>
            </div>
          </div>
        </Portal>
      )}

      <style jsx>{`
        .cl-live {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 7px 13px;
          border-radius: 99px;
          background: #fff;
          border: 1px solid var(--border-color);
          box-shadow: var(--shadow-sm);
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-secondary);
        }
        .cl-live i {
          width: 7px;
          height: 7px;
          border-radius: 99px;
          background: var(--ok);
          box-shadow: 0 0 0 0 rgba(18, 162, 107, 0.5);
          animation: clPulse 2s infinite;
        }
        @keyframes clPulse {
          0% { box-shadow: 0 0 0 0 rgba(18, 162, 107, 0.45); }
          70% { box-shadow: 0 0 0 7px rgba(18, 162, 107, 0); }
          100% { box-shadow: 0 0 0 0 rgba(18, 162, 107, 0); }
        }

        .cl-error {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          margin-bottom: 1.25rem;
          background: var(--bad-soft);
          border: 1px solid rgba(229, 72, 77, 0.25);
          border-radius: 20px;
        }

        .cl-bar {
          height: 6px;
          border-radius: 99px;
          background: var(--bg-surface);
          overflow: hidden;
          margin-top: 0.85rem;
        }
        .cl-bar span {
          display: block;
          height: 100%;
          border-radius: 99px;
          background: var(--ok);
          transition: width 0.6s cubic-bezier(0.2, 0.7, 0.2, 1);
        }

        .mx-search {
          position: relative;
        }
        .mx-search input {
          padding-right: 40px;
        }
        .cl-clear {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          width: 26px;
          height: 26px;
          border-radius: 8px;
          border: 0;
          background: var(--bg-surface);
          color: var(--text-secondary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }
        .cl-clear:hover {
          color: var(--ink);
        }

        .cl-row {
          align-items: flex-start;
          position: relative;
          padding-top: 1.05rem;
          padding-bottom: 1.05rem;
        }
        .cl-row:focus-visible {
          outline: 2px solid var(--accent);
          outline-offset: -2px;
        }
        .cl-row.is-pending::before {
          content: "";
          position: absolute;
          left: 0;
          top: 14px;
          bottom: 14px;
          width: 3px;
          border-radius: 0 3px 3px 0;
          background: var(--accent);
        }
        .cl-body {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .cl-line1 {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }
        .cl-new {
          width: 7px;
          height: 7px;
          border-radius: 99px;
          background: var(--accent);
          flex-shrink: 0;
        }
        .cl-contact {
          display: flex;
          flex-wrap: wrap;
          gap: 2px 14px;
          font-size: 0.8125rem;
          color: var(--text-muted);
          min-width: 0;
        }
        .cl-contact span {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          max-width: 100%;
        }
        .cl-preview {
          margin-top: 4px;
          font-size: 0.875rem;
          line-height: 1.55;
          color: var(--text-secondary);
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          word-break: break-word;
          max-width: 760px;
        }
        .cl-row.is-pending .cl-preview {
          color: var(--text-primary);
        }
        .cl-side {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
          flex-shrink: 0;
        }
        .cl-date {
          white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .cl-actions {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .cl-row .mx-act {
          opacity: 0.55;
        }
        .cl-row:hover .mx-act,
        .cl-row .mx-act:focus-visible {
          opacity: 1;
        }

        .deleting-card {
          animation: fade-out-shrink 0.4s forwards cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        @keyframes fade-out-shrink {
          0% {
            opacity: 1;
            transform: translateX(0);
          }
          100% {
            opacity: 0;
            transform: translateX(24px);
          }
        }

        /* Diálogo */
        .cl-dhead {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          min-width: 0;
        }
        .cl-dname {
          font-size: 1.375rem;
          font-weight: 500;
          letter-spacing: -0.03em;
          line-height: 1.15;
          word-break: break-word;
        }
        .cl-quick {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 1rem;
        }
        .cl-qa {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 14px;
          border: 1px solid var(--border-color);
          border-radius: 16px;
          background: #fff;
          text-decoration: none;
          color: inherit;
          min-width: 0;
          transition: var(--transition);
        }
        a.cl-qa:hover {
          border-color: var(--border-strong);
          box-shadow: var(--shadow-md);
          transform: translateY(-1px);
        }
        .cl-qa.disabled {
          background: var(--bg-secondary);
          opacity: 0.75;
        }
        .cl-qa-label {
          display: block;
          font-size: 0.6875rem;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-muted);
        }
        .cl-qa-value {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--ink);
        }
        .cl-msg {
          background: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 18px;
          padding: 1.125rem 1.25rem 1.25rem;
        }
        .cl-msg-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 0.75rem;
        }
        .cl-msg-date {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          text-transform: capitalize;
        }
        .cl-msg p {
          white-space: pre-wrap;
          word-break: break-word;
          line-height: 1.7;
          font-size: 0.9375rem;
          color: var(--text-primary);
        }
        .cl-foot-r {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .cl-foot-r a {
          text-decoration: none;
        }

        @media (max-width: 720px) {
          .cl-row {
            flex-wrap: wrap;
            gap: 0.75rem;
          }
          .cl-body {
            flex: 1 1 calc(100% - 56px);
          }
          .cl-side {
            width: 100%;
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
            padding-left: 52px;
          }
          .cl-row .mx-act {
            opacity: 1;
          }
          .cl-skel-pill {
            display: none;
          }
          .mx-pills {
            overflow-x: auto;
            justify-content: space-between;
          }
          .mx-pills button {
            flex: 1;
            justify-content: center;
            padding: 8px 10px;
          }
          .cl-error {
            flex-wrap: wrap;
          }
          .cl-quick {
            grid-template-columns: 1fr;
          }
          .dialog-foot {
            flex-direction: column-reverse;
            align-items: stretch;
          }
          .cl-foot-r {
            justify-content: stretch;
          }
          .cl-foot-r > * {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
