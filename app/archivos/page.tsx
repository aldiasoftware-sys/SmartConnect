"use client";

import { DragEvent, useEffect, useRef, useState } from "react";
import { Folder, FolderOpen, ChevronRight, Upload, Trash2, Clock, HardDrive, RefreshCw, Film } from "lucide-react";
import { DIAS, fromISO, shortDate, today } from "@/lib/social";
import { KEEP_DAYS, PEOPLE, StoredFile, bucketExists, deletesOn, fmtSize, isVideo, listAll, remove, sweep, upload } from "@/lib/files";
import { FileCard, KitCard, groupKits } from "@/components/ArchivosKit";
import { CardMenu, Papelera, TrashItem, trashDrag } from "@/components/Papelera";
import { useSocial } from "@/lib/SocialContext";
import { useScope } from "@/lib/ScopeContext";

const dayLabel = (d: string) => `${DIAS[(fromISO(d).getDay() + 6) % 7]} ${shortDate(d)}`;

export default function ArchivosPage() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [swept, setSwept] = useState(0);
  const [person, setPerson] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);          // archivos del ordenador encima de la página (para subir)
  const [dragging, setDragging] = useState(false);  // una tarjeta arrastrándose (hacia la papelera)
  const input = useRef<HTMLInputElement>(null);

  const { refresh } = useSocial();
  const { me, scope } = useScope();
  useEffect(() => { if (scope === "yo" && me) { setPerson(me.folder); setDay(null); } }, [scope, me?.folder]); // eslint-disable-line react-hooks/exhaustive-deps
  const people = scope === "yo" && me ? ["Aldia", me.folder] : PEOPLE;   // al cambiar Archivos, el calendario se pone al día
  async function load(doSweep = false) {
    setLoading(true); setError("");
    try {
      if (!(await bucketExists())) { setError("missing"); setFiles([]); setLoading(false); return; }
      let all = await listAll();
      if (doSweep) { const n = await sweep(all); if (n) { setSwept(n); all = await listAll(); } }
      setFiles(all);
      refresh();
    } catch (e: any) {
      setError(e?.message?.includes("not found") || e?.statusCode === "404" ? "missing" : e?.message || "No se han podido leer los archivos.");
    }
    setLoading(false);
  }
  useEffect(() => { load(true); }, []);

  async function send(list: FileList | File[]) {
    if (!person) return;
    const d = day || today();
    setBusy(true); setError("");
    try { for (const f of Array.from(list)) await upload(person, d, f); setDay(d); await load(); }
    catch (e: any) { setError(e?.message || "No se ha podido subir."); }
    setBusy(false);
  }

  /** Borrar desde el menú «⋯» o soltando en la papelera: siempre con confirmación. */
  async function askDelete(item: TrashItem) {
    setDragging(false);
    if (!item.paths.length || !confirm(`¿Borrar ${item.label}? No se puede deshacer.`)) return;
    setError("");
    try { await remove(item.paths); await load(); }
    catch (e: any) { setError(e?.message || "No se ha podido borrar."); }
  }
  const dragTo = (item: TrashItem) => trashDrag(item, () => setDragging(true), () => setDragging(false));
  const hasFiles = (e: DragEvent) => e.dataTransfer.types.includes("Files");

  const days = person ? Array.from(new Set(files.filter((f) => f.person === person).map((f) => f.date))).sort().reverse() : [];
  const inDay = files.filter((f) => f.person === person && f.date === day).sort((a, b) => a.name.localeCompare(b.name));
  const used = files.reduce((s, f) => s + f.size, 0);

  return (
    <div className="page-wrapper" onDragOver={(e) => { if (person && hasFiles(e)) { e.preventDefault(); setDrag(true); } }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { if (!hasFiles(e)) return; e.preventDefault(); setDrag(false); if (person && e.dataTransfer.files.length) send(e.dataTransfer.files); }}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Aldia · Guille · Alejandro</div>
          <h2 className="page-title">Archivos</h2>
          <p className="page-subtitle">Lo que dejan listas las skills: vídeo, miniatura y los textos de LinkedIn, TikTok e Instagram. Cada archivo se borra solo cuando pasan {KEEP_DAYS} días desde que se sube.</p>
        </div>
        <div className="flex gap-3 items-center">
          <button className="btn-secondary" onClick={() => load(true)} disabled={loading}><RefreshCw style={{ width: 15, height: 15 }} /> Actualizar</button>
          {person && <button className="btn-primary" onClick={() => input.current?.click()} disabled={busy}><Upload style={{ width: 16, height: 16 }} /> {busy ? "Subiendo…" : `Subir a ${day ? dayLabel(day) : "hoy"}`}</button>}
          <input ref={input} type="file" multiple hidden onChange={(e) => e.target.files && send(e.target.files)} />
        </div>
      </div>

      {error === "missing" ? (
        <div className="banner"><HardDrive /><div><b>Falta crear el espacio de archivos.</b> Ejecuta <code>archivos_setup.sql</code> en el SQL Editor de Supabase y pulsa «Actualizar».</div></div>
      ) : error ? <div className="banner"><HardDrive /><div>{error}</div></div> : null}
      {swept > 0 && <div className="banner" style={{ background: "var(--ok-soft)", borderColor: "#bfe9d3", color: "#0b6b47" }}><Trash2 /><div>Barrido hecho: {swept} {swept === 1 ? "archivo tenía" : "archivos tenían"} {KEEP_DAYS} días o más y se {swept === 1 ? "ha" : "han"} borrado.</div></div>}

      <div className="flex items-center gap-2" style={{ marginBottom: "1.25rem", fontSize: "0.9375rem", flexWrap: "wrap" }}>
        <button className="btn-secondary" style={{ padding: "0.4rem 0.75rem" }} onClick={() => { setPerson(null); setDay(null); }}><FolderOpen style={{ width: 15, height: 15 }} /> Archivos</button>
        {person && <><ChevronRight style={{ width: 15, height: 15, color: "var(--text-muted)" }} /><button className="btn-secondary" style={{ padding: "0.4rem 0.75rem" }} onClick={() => setDay(null)}>{person}</button></>}
        {day && <><ChevronRight style={{ width: 15, height: 15, color: "var(--text-muted)" }} /><b>{day}</b></>}
        <span className="text-xs text-muted" style={{ marginLeft: "auto" }}>{files.length} archivos · {fmtSize(used)} en uso</span>
      </div>

      {drag && <div className="banner" style={{ background: "#fff", borderStyle: "dashed", color: "var(--ink)" }}><Upload /><div>Suelta para subir a <b>{person} / {day || today()}</b></div></div>}

      {!person ? (
        <div className="grid-3">
          {people.map((p) => {
            const mine = files.filter((f) => f.person === p);
            const last = mine.map((f) => f.date).sort().pop();
            return (
              <button key={p} className="card folder-card" onClick={() => setPerson(p)}>
                <span className="person-ini">{p[0]}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: "1.25rem", fontWeight: 500, letterSpacing: "-0.03em" }}>{p}</div>
                  <div className="section-sub">
                    {mine.length ? `${groupKits(mine).kits.length} ${groupKits(mine).kits.length === 1 ? "vídeo" : "vídeos"} · ${fmtSize(mine.reduce((s, f) => s + f.size, 0))}` : "Vacío"}
                    {last ? ` · último ${dayLabel(last)}` : ""}
                  </div>
                </div>
                <ChevronRight style={{ width: 18, height: 18, marginLeft: "auto", color: "var(--text-muted)" }} />
              </button>
            );
          })}
        </div>
      ) : !day ? (
        days.length === 0 ? (
          <div className="card empty" style={{ padding: "3rem 1rem" }}>
            <Folder style={{ width: 28, height: 28 }} />
            {loading ? "Cargando…" : <>Todavía no hay nada de {person}. Lo que suban las skills aparecerá aquí, en una carpeta por día. También puedes arrastrar archivos aquí.</>}
          </div>
        ) : (
          <div className="grid-4">
            {days.map((d) => {
              const fs = files.filter((f) => f.person === person && f.date === d);
              const first = fs.map((f) => f.created).sort()[0];
              const item = { paths: fs.map((f) => f.path), label: `la carpeta del ${dayLabel(d)} (${fs.length} ${fs.length === 1 ? "archivo" : "archivos"})` };
              return (
                // no es <button> porque lleva dentro el botón «⋯»
                <div key={d} role="button" tabIndex={0} className="card day-card" onClick={() => setDay(d)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDay(d); } }} {...dragTo(item)}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                    <Folder style={{ width: 24, height: 24 }} />
                    <div className="flex items-center gap-2">
                      <span className="chip"><Clock style={{ width: 12, height: 12 }} /> {shortDate(deletesOn(first, d))}</span>
                      <CardMenu onDelete={() => askDelete(item)} />
                    </div>
                  </div>
                  <div className="day-big">{fromISO(d).getDate()} <span>{shortDate(d).split(" ")[1]}</span></div>
                  <div className="section-sub" style={{ textTransform: "capitalize" }}>{dayLabel(d).split(" ")[0]}</div>
                  <div className="flex items-center gap-2 text-sm" style={{ marginTop: 10, color: "var(--text-secondary)" }}>
                    <Film style={{ width: 14, height: 14 }} /> {groupKits(fs).kits.length} {groupKits(fs).kits.length === 1 ? "vídeo" : "vídeos"}{groupKits(fs).loose.length ? ` · ${groupKits(fs).loose.length} sueltos` : ""}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        <div className="flex flex-col gap-4">
          {groupKits(inDay).kits.map((k) => {
            const item = { paths: k.files.map((f) => f.path), label: `«${k.name}» y sus ${k.files.length} archivos` };
            return <KitCard key={k.name} kit={k} onDelete={() => askDelete(item)} drag={dragTo(item)} />;
          })}
          {groupKits(inDay).loose.length > 0 && (
            <>
              {groupKits(inDay).kits.length > 0 && <div className="eyebrow" style={{ marginTop: "0.5rem" }}>Otros archivos</div>}
              <div className="file-grid">
                {groupKits(inDay).loose.map((f) => {
                  const item = { paths: [f.path], label: `«${f.name}»` };
                  return <FileCard key={f.path} f={f} onDelete={() => askDelete(item)} drag={dragTo(item)} />;
                })}
              </div>
            </>
          )}
          {inDay.length === 0 && <div className="card empty">Carpeta vacía.</div>}
        </div>
      )}

      {person && <Papelera dragging={dragging} onDrop={askDelete} />}
    </div>
  );
}
