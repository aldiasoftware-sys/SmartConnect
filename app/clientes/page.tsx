"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Mail,
  Phone,
  MessageSquare,
  Trash2,
  CheckCircle2,
  Clock,
  User,
  Search,
  Filter,
  ArrowRight,
  MoreVertical,
  ChevronDown
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

export default function ClientesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"todos" | "sin responder" | "respondido">("todos");
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
        setMessages(messages.filter((m) => m.id !== id));
        setDeletingId(null);
      }
    }, 400); // Duración de la animación
  }

  async function toggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "sin responder" ? "respondido" : "sin responder";

    const { error } = await supabase
      .from("contact_messages")
      .update({ estado: newStatus })
      .eq("id", id);

    if (error) {
      alert("Error al actualizar estado");
    } else {
      setMessages(
        messages.map((m) => (m.id === id ? { ...m, estado: newStatus as any } : m))
      );
    }
  }

  const filteredMessages = messages.filter((m) => {
    const matchesSearch =
      m.nombre_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.correo_cliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.mensaje_cliente.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "todos" || m.estado === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: messages.length,
    pending: messages.filter(m => m.estado === "sin responder").length,
    answered: messages.filter(m => m.estado === "respondido").length
  };

  return (
    <div className="page-wrapper animate-in" style={{ padding: '2rem 3rem' }}>
      <div className="page-header" style={{ marginBottom: '64px' }}>
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">Gestiona las consultas y mensajes de tus clientes</p>
        </div>
        <div className="flex gap-3">
          <div className="avatar" style={{ width: 'auto', padding: '0 12px', height: '40px' }}>
            {stats.total} Mensajes
          </div>
        </div>
      </div>

      {error && (
        <div className="card" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#b91c1c', padding: '1.25rem', marginBottom: '64px' }}>
          <p className="font-bold flex items-center gap-2">
            ⚠️ Error de Supabase:
          </p>
          <p className="text-sm mt-1">{error}</p>
          <button
            className="btn-secondary mt-3"
            style={{ padding: '4px 12px', fontSize: '12px' }}
            onClick={fetchMessages}
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Stats Mini Grid */}
      <div className="flex gap-4" style={{ marginBottom: '64px' }}>
        <div className="card flex-1 flex items-center gap-4" style={{ padding: '1.25rem' }}>
          <div className="avatar" style={{ background: '#f3f4f6', color: '#6b7280' }}><Clock size={18} /></div>
          <div>
            <p className="text-xs text-muted font-bold uppercase tracking-wider">Pendientes</p>
            <p className="text-xl font-bold">{stats.pending}</p>
          </div>
        </div>
        <div className="card flex-1 flex items-center gap-4" style={{ padding: '1.25rem' }}>
          <div className="avatar" style={{ background: '#ecfdf5', color: '#059669' }}><CheckCircle2 size={18} /></div>
          <div>
            <p className="text-xs text-muted font-bold uppercase tracking-wider">Respondidos</p>
            <p className="text-xl font-bold">{stats.answered}</p>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex justify-between items-center gap-4" style={{ marginBottom: '64px' }}>
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
          <input
            type="text"
            placeholder="Buscar por nombre, email o mensaje..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 card" style={{ padding: '0.5rem 1rem' }}>
          <Filter size={18} className="text-muted" />
          <select
            className="w-48"
            style={{ border: 'none', background: 'transparent' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
          >
            <option value="todos">Todos los estados</option>
            <option value="sin responder">Sin responder</option>
            <option value="respondido">Respondidos</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-20">
          <div className="animate-pulse text-muted">Cargando mensajes...</div>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="card p-20 text-center">
          <MessageSquare className="mx-auto mb-4 text-muted" size={48} />
          <h3 className="text-lg font-semibold">No hay mensajes</h3>
          <p className="text-secondary">No se han encontrado mensajes que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <div className="cards-grid" style={{ gap: '2rem' }}>
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className={`card flex flex-col gap-4 group transition-all duration-300 cursor-pointer hover:border-gray-400 ${deletingId === msg.id ? 'deleting-card' : ''}`}
              onClick={() => setSelectedMessage(msg)}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="avatar" style={{ background: '#000', color: '#fff' }}>
                    {msg.nombre_cliente.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm">{msg.nombre_cliente}</h3>
                    <p className="text-xs text-muted">
                      {new Date(msg.created_at).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
                <div
                  className={`status-badge ${msg.estado === 'respondido' ? 'done' : 'todo'}`}
                  style={{ marginBottom: 0, cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStatus(msg.id, msg.estado);
                  }}
                  title="Cambiar estado"
                >
                  {msg.estado}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-secondary">
                  <Mail size={14} className="text-muted" />
                  <span>{msg.correo_cliente}</span>
                </div>
                {msg.telefono_cliente && (
                  <div className="flex items-center gap-2 text-xs text-secondary">
                    <Phone size={14} className="text-muted" />
                    <span>{msg.telefono_cliente}</span>
                  </div>
                )}
              </div>

              <div className="bg-secondary p-3 rounded-lg text-sm text-secondary min-h-[80px] line-clamp-3">
                {msg.mensaje_cliente}
              </div>

              <div className="flex justify-between items-center mt-auto pt-4">
                <button
                  className="btn-primary"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleStatus(msg.id, msg.estado);
                  }}
                >
                  {msg.estado === 'sin responder' ? (
                    <><CheckCircle2 size={14} /> Marcar respondido</>
                  ) : (
                    <><Clock size={14} /> Marcar pendiente</>
                  )}
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMessage(msg.id);
                  }}
                  title="Eliminar mensaje"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Detalle */}
      {selectedMessage && (
        <div className="modal-overlay" onClick={() => setSelectedMessage(null)} style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="modal-content drawer-in" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', borderRadius: '24px', margin: 'auto', height: 'auto', maxHeight: '90vh' }}>
            <div className="flex justify-between items-center mb-8">
               <div className="flex items-center gap-4">
                  <div className="avatar" style={{ width: '50px', height: '50px', background: '#000', color: '#fff', fontSize: '1.2rem' }}>
                    {selectedMessage.nombre_cliente.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>{selectedMessage.nombre_cliente}</h2>
                    <p className="text-sm text-muted">Recibido el {new Date(selectedMessage.created_at).toLocaleString()}</p>
                  </div>
               </div>
               <button onClick={() => setSelectedMessage(null)} className="avatar" style={{ cursor: 'pointer', background: '#f3f4f6' }}>✕</button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                <div className="card" style={{ padding: '1rem' }}>
                  <p className="text-xs text-muted font-bold uppercase mb-1 tracking-wider">Email</p>
                  <p className="font-medium">{selectedMessage.correo_cliente}</p>
                </div>
                <div className="card" style={{ padding: '1rem' }}>
                  <p className="text-xs text-muted font-bold uppercase mb-1 tracking-wider">Teléfono</p>
                  <p className="font-medium">{selectedMessage.telefono_cliente || 'No proporcionado'}</p>
                </div>
              </div>

              <div className="card" style={{ padding: '1.5rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                <p className="text-xs text-muted font-bold uppercase mb-3 tracking-wider">Mensaje completo</p>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: '1.7', fontSize: '1rem', color: '#334155' }}>{selectedMessage.mensaje_cliente}</p>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                 <button 
                  className="btn-secondary"
                  onClick={() => {
                    toggleStatus(selectedMessage.id, selectedMessage.estado);
                    setSelectedMessage(null);
                  }}
                 >
                    {selectedMessage.estado === 'sin responder' ? 'Marcar respondido' : 'Marcar pendiente'}
                 </button>
                 <button 
                  className="btn-primary"
                  onClick={() => setSelectedMessage(null)}
                 >
                    Cerrar
                 </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;  
          overflow: hidden;
        }
        .delete-btn {
          padding: 8px;
          border-radius: 8px;
          color: #9ca3af;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          background: transparent;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .delete-btn:hover {
          color: #ef4444;
          background: #fef2f2;
          transform: scale(1.1) rotate(8deg);
        }
        .delete-btn:active {
          transform: scale(0.9);
        }
        .deleting-card {
          animation: fade-out-shrink 0.4s forwards cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        @keyframes fade-out-shrink {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          100% {
            opacity: 0;
            transform: scale(0.9) translateY(20px);
          }
        }
      `}</style>
    </div>
  );
}
