"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Calendar as CalendarIcon,
  Clock,
  Video,
  Phone,
  MoreHorizontal,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  Save,
  Trash2,
  CalendarDays
} from "lucide-react";

interface Reunion {
  id?: string;
  nombre_reunion: string;
  fecha_reunion: string;
  duracion: string;
  origen: "Calendly" | "Telefono" | "Otro";
  notas?: string;
  created_at?: string;
}

export default function ReunionesPage() {
  const [reuniones, setReuniones] = useState<Reunion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [currentReunion, setCurrentReunion] = useState<Reunion | null>(null);
  
  // Calendar state
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchReuniones();

    const channel = supabase
      .channel("reuniones-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reuniones" },
        () => {
          fetchReuniones();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchReuniones() {
    setLoading(true);
    const { data, error } = await supabase
      .from("reuniones")
      .select("*")
      .order("fecha_reunion", { ascending: true });

    if (error) {
      console.error("Error fetching reuniones:", error);
    } else {
      setReuniones(data || []);
    }
    setLoading(false);
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const reunionData: Reunion = {
      nombre_reunion: formData.get("nombre_reunion") as string,
      fecha_reunion: formData.get("fecha_reunion") as string,
      duracion: formData.get("duracion") as string,
      origen: formData.get("origen") as any,
      notas: formData.get("notas") as string,
    };

    if (currentReunion?.id) {
      const { error } = await supabase
        .from("reuniones")
        .update(reunionData)
        .eq("id", currentReunion.id);
      
      if (error) alert("Error al actualizar");
    } else {
      const { error } = await supabase
        .from("reuniones")
        .insert([reunionData]);
      
      if (error) alert("Error al crear");
    }

    setIsDrawerOpen(false);
    setCurrentReunion(null);
    fetchReuniones();
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Estás seguro de eliminar esta reunión?")) return;
    
    const { error } = await supabase
      .from("reuniones")
      .delete()
      .eq("id", id);
    
    if (error) alert("Error al eliminar");
    else {
      setIsDrawerOpen(false);
      setCurrentReunion(null);
      fetchReuniones();
    }
  }

  const openCreateDrawer = () => {
    setCurrentReunion({
      nombre_reunion: "",
      fecha_reunion: new Date().toISOString().slice(0, 16),
      duracion: "30 min",
      origen: "Calendly",
      notas: ""
    });
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (reunion: Reunion) => {
    setCurrentReunion(reunion);
    setIsDrawerOpen(true);
  };

  // Calendar Helpers
  const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const days = [];
  const totalDays = daysInMonth(year, month);
  const startingDay = firstDayOfMonth(year, month);

  // Fill empty days
  for (let i = 0; i < (startingDay === 0 ? 6 : startingDay - 1); i++) {
    days.push(null);
  }

  // Fill month days
  for (let i = 1; i <= totalDays; i++) {
    days.push(i);
  }

  const getReunionesForDay = (day: number) => {
    return reuniones.filter(r => {
      const d = new Date(r.fecha_reunion);
      return d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
    });
  };

  return (
    <div className="page-wrapper animate-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reuniones</h1>
          <p className="page-subtitle">Gestiona y visualiza tus próximas reuniones</p>
        </div>
        <button className="btn-primary" onClick={openCreateDrawer}>
          <Plus size={18} />
          Nueva Reunión
        </button>
      </div>

      <div className="card" style={{ padding: '2rem' }}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold">
            {monthNames[month]} {year}
          </h2>
          <div className="flex gap-2">
            <button className="btn-secondary" style={{ padding: '8px' }} onClick={prevMonth}>
              <ChevronLeft size={20} />
            </button>
            <button className="btn-secondary" style={{ padding: '8px' }} onClick={nextMonth}>
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="calendar-grid">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
            <div key={d} className="calendar-day-label">{d}</div>
          ))}
          {days.map((day, idx) => {
            const dayReuniones = day ? getReunionesForDay(day) : [];
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            
            return (
              <div 
                key={idx} 
                className={`calendar-day ${day ? '' : 'empty'} ${isToday ? 'today' : ''}`}
              >
                {day && (
                  <>
                    <span className="day-number">{day}</span>
                    <div className="day-reuniones">
                      {dayReuniones.map(r => (
                        <div 
                          key={r.id} 
                          className={`reunion-pill ${r.origen.toLowerCase()}`}
                          onClick={() => openEditDrawer(r)}
                        >
                          <span className="reunion-time">
                            {new Date(r.fecha_reunion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="reunion-name">{r.nombre_reunion}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Drawer / Modal */}
      {isDrawerOpen && (
        <div className="modal-overlay" onClick={() => setIsDrawerOpen(false)}>
          <div className="modal-content drawer-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-xl font-bold">{currentReunion?.id ? 'Editar Reunión' : 'Nueva Reunión'}</h2>
              <button onClick={() => setIsDrawerOpen(false)} className="btn-secondary" style={{ padding: '8px', border: 'none' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="form-group">
                <label>Nombre de la Reunión</label>
                <div className="relative">
                  <Video className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input 
                    name="nombre_reunion" 
                    defaultValue={currentReunion?.nombre_reunion} 
                    placeholder="Ej: Demo producto" 
                    required 
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Fecha y Hora</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input 
                    type="datetime-local" 
                    name="fecha_reunion" 
                    defaultValue={currentReunion?.fecha_reunion ? new Date(currentReunion.fecha_reunion).toISOString().slice(0, 16) : ''} 
                    required 
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Duración</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                  <input 
                    name="duracion" 
                    defaultValue={currentReunion?.duracion} 
                    placeholder="Ej: 30 min, 1 hora" 
                    required 
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Origen</label>
                <select name="origen" defaultValue={currentReunion?.origen} required>
                  <option value="Calendly">Calendly</option>
                  <option value="Telefono">Teléfono</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>

              <div className="form-group">
                <label>Notas (Opcional)</label>
                <textarea 
                  name="notas" 
                  defaultValue={currentReunion?.notas} 
                  placeholder="Añade detalles adicionales..." 
                  rows={4}
                />
              </div>

              <div className="flex gap-3 mt-8">
                <button type="submit" className="btn-primary flex-1">
                  <Save size={18} />
                  {currentReunion?.id ? 'Guardar Cambios' : 'Crear Reunión'}
                </button>
                {currentReunion?.id && (
                  <button 
                    type="button" 
                    className="btn-secondary" 
                    style={{ color: '#ef4444', borderColor: '#fecaca' }}
                    onClick={() => handleDelete(currentReunion.id!)}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 1px;
          background: var(--border-color);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          overflow: hidden;
        }
        .calendar-day-label {
          background: #f9fafb;
          padding: 1rem;
          text-align: center;
          font-size: 0.75rem;
          font-weight: 700;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .calendar-day {
          background: #fff;
          min-height: 120px;
          padding: 0.75rem;
          transition: background 0.2s;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .calendar-day.empty {
          background: #fdfdfd;
        }
        .calendar-day:not(.empty):hover {
          background: #fcfcfc;
        }
        .calendar-day.today {
          background: #f0f7ff;
        }
        .calendar-day.today .day-number {
          background: #000;
          color: #fff;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
        }
        .day-number {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }
        .day-reuniones {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .reunion-pill {
          padding: 4px 8px;
          border-radius: 6px;
          font-size: 0.7rem;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.1s;
          display: flex;
          flex-direction: column;
          border-left: 3px solid transparent;
        }
        .reunion-pill:hover {
          transform: scale(1.02);
        }
        .reunion-pill.calendly {
          background: #eef2ff;
          color: #4338ca;
          border-left-color: #4338ca;
        }
        .reunion-pill.telefono {
          background: #ecfdf5;
          color: #059669;
          border-left-color: #059669;
        }
        .reunion-pill.otro {
          background: #f3f4f6;
          color: #374151;
          border-left-color: #374151;
        }
        .reunion-time {
          font-size: 0.65rem;
          opacity: 0.8;
        }
        .reunion-name {
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .relative {
          position: relative;
        }
      `}</style>
    </div>
  );
}
