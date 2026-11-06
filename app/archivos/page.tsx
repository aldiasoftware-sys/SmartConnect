"use client";

import { useEffect, useRef, useState } from "react";
import { Folder, FolderOpen, ChevronRight, Upload, Download, Trash2, Copy, Check, FileText, Film, Image as ImageIcon, File as FileIcon, Clock, HardDrive, RefreshCw } from "lucide-react";
import { DIAS, fromISO, shortDate, today } from "@/lib/social";
import { KEEP_DAYS, PEOPLE, StoredFile, bucketExists, deletesOn, fmtSize, isImage, isText, isVideo, listAll, readText, remove, signedUrl, sweep, upload } from "@/lib/files";

const dayLabel = (d: string) => `${DIAS[(fromISO(d).getDay() + 6) % 7]} ${shortDate(d)}`;
const daysLeft = (created: string) => Math.max(0, Math.round((fromISO(deletesOn(created)).getTime() - fromISO(today()).getTime()) / 86400000));

function FileCard({ f, onDelete }: { f: StoredFile; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (isText(f)) readText(f.path).then(setText).catch(() => setText("(no se ha podido leer)"));
    else if (isImage(f) || isVideo(f)) signedUrl(f.path).then(setUrl).catch(() => {});
  }, [f.path]); // eslint-disable-line react-hooks/exhaustive-deps

  const left = daysLeft(f.created);
  const Icon = isVideo(f) ? Film : isImage(f) ? ImageIcon : isText(f) ? FileText : FileIcon;
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#0e0e0e", aspectRatio: isText(f) ? undefined : "9 / 12", display: "flex", alignItems: "center", justifyContent: "center", minHeight: isText(f) ? 0 : 160 }}>
        {isVideo(f) && url && <video src={url} controls preload="metadata" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
        {isImage(f) && url && <img src={url} alt={f.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
        {!isText(f) && !url && <Icon style={{ width: 28, height: 28, color: "#6b6f78" }} />}
      </div>
      {isText(f) && (
        <div style={{ padding: "1rem 1.125rem 0", flex: 1 }}>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: "0.8125rem", lineHeight: 1.5, maxHeight: 260, overflow: "auto", color: "var(--ink)" }}>{text ?? "Cargando…"}</pre>
        </div>
      )}
      <div style={{ padding: "0.875rem 1.125rem 1rem" }}>
        <div className="flex items-center gap-2" style={{ marginBottom: 6, minWidth: 0 }}>
          <Icon style={{ width: 15, height: 15, flexShrink: 0, color: "var(--text-muted)" }} />
          <b style={{ fontSize: "0.8125rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={f.name}>{f.name}</b>
        </div>
        <div className="flex items-center justify-between" style={{ gap: 8 }}>
          <span className={`chip ${left <= 2 ? "chip-bad" : ""}`} title={`Se borra el ${shortDate(deletesOn(f.created))}`}>
            <Clock style={{ width: 12, height: 12 }} /> {left === 0 ? "Se borra hoy" : `Se borra el ${shortDate(deletesOn(f.created))}`}
          </span>
          <span className="text-xs text-muted">{fmtSize(f.size)}</span>
        </div>
        <div className="flex gap-2" style={{ marginTop: 10 }}>
          {isText(f) && text !== null && (
            <button className="btn-secondary" style={{ padding: "0.4rem 0.7rem", fontSize: "0.75rem" }} onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
              {copied ? <Check style={{ width: 14, height: 14 }} /> : <Copy style={{ width: 14, height: 14 }} />} {copied ? "Copiado" : "Copiar"}
            </button>
          )}
          <button className="btn-secondary" style={{ padding: "0.4rem 0.7rem", fontSize: "0.75rem" }} onClick={async () => window.open(await signedUrl(f.path, true), "_blank")}>
            <Download style={{ width: 14, height: 14 }} /> Descargar
          </button>
          <button className="icon-btn" style={{ marginLeft: "auto" }} onClick={onDelete} aria-label={`Borrar ${f.name}`}><Trash2 /></button>
        </div>
      </div>
    </div>
  );
}

export default function ArchivosPage() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [swept, setSwept] = useState(0);
  const [person, setPerson] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  async function load(doSweep = false) {
    setLoading(true); setError("");
    try {
      if (!(await bucketExists())) { setError("missing"); setFiles([]); setLoading(false); return; }
      let all = await listAll();
      if (doSweep) { const n = await sweep(all); if (n) { setSwept(n); all = await listAll(); } }
      setFiles(all);
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

  const days = person ? Array.from(new Set(files.filter((f) => f.person === person).map((f) => f.date))).sort().reverse() : [];
  const inDay = files.filter((f) => f.person === person && f.date === day).sort((a, b) => a.name.localeCompare(b.name));
  const used = files.reduce((s, f) => s + f.size, 0);

  return (
    <div className="page-wrapper" onDragOver={(e) => { if (person) { e.preventDefault(); setDrag(true); } }} onDragLeave={() => setDrag(false)}
      onDrop={(e) => { e.preventDefault(); setDrag(false); if (person && e.dataTransfer.files.length) send(e.dataTransfer.files); }}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Guille · Alejandro</div>
          <h2 className="page-title">Archivos</h2>
          <p className="page-subtitle">Lo que dejan listas las skills: vídeo, miniatura, título y descripción de LinkedIn y título de TikTok. Cada archivo se borra solo a los {KEEP_DAYS} días.</p>
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
      {swept > 0 && <div className="banner" style={{ background: "var(--ok-soft)", borderColor: "#bfe9d3", color: "#0b6b47" }}><Trash2 /><div>Barrido hecho: {swept} {swept === 1 ? "archivo tenía" : "archivos tenían"} más de {KEEP_DAYS} días y se {swept === 1 ? "ha" : "han"} borrado.</div></div>}

      <div className="flex items-center gap-2" style={{ marginBottom: "1.25rem", fontSize: "0.9375rem", flexWrap: "wrap" }}>
        <button className="btn-secondary" style={{ padding: "0.4rem 0.75rem" }} onClick={() => { setPerson(null); setDay(null); }}><FolderOpen style={{ width: 15, height: 15 }} /> Archivos</button>
        {person && <><ChevronRight style={{ width: 15, height: 15, color: "var(--text-muted)" }} /><button className="btn-secondary" style={{ padding: "0.4rem 0.75rem" }} onClick={() => setDay(null)}>{person}</button></>}
        {day && <><ChevronRight style={{ width: 15, height: 15, color: "var(--text-muted)" }} /><b>{day}</b></>}
        <span className="text-xs text-muted" style={{ marginLeft: "auto" }}>{files.length} archivos · {fmtSize(used)} en uso</span>
      </div>

      {drag && <div className="banner" style={{ background: "#fff", borderStyle: "dashed", color: "var(--ink)" }}><Upload /><div>Suelta para subir a <b>{person} / {day || today()}</b></div></div>}

      {!person ? (
        <div className="grid-3">
          {PEOPLE.map((p) => {
            const mine = files.filter((f) => f.person === p);
            const last = mine.map((f) => f.date).sort().pop();
            return (
              <button key={p} className="card" style={{ textAlign: "left", cursor: "pointer", fontFamily: "inherit" }} onClick={() => setPerson(p)}>
                <Folder style={{ width: 30, height: 30, marginBottom: 12 }} />
                <div style={{ fontSize: "1.25rem", fontWeight: 800, letterSpacing: "-0.03em" }}>{p}</div>
                <div className="section-sub">{mine.length} archivos{last ? ` · último: ${dayLabel(last)}` : ""}</div>
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
              return (
                <button key={d} className="card" style={{ textAlign: "left", cursor: "pointer", fontFamily: "inherit" }} onClick={() => setDay(d)}>
                  <Folder style={{ width: 26, height: 26, marginBottom: 10 }} />
                  <div style={{ fontWeight: 800, letterSpacing: "-0.02em" }}>{d}</div>
                  <div className="section-sub" style={{ textTransform: "capitalize" }}>{dayLabel(d)} · {fs.length} archivos</div>
                  <span className="chip" style={{ marginTop: 10 }}><Clock style={{ width: 12, height: 12 }} /> Se borra el {shortDate(deletesOn(first))}</span>
                </button>
              );
            })}
          </div>
        )
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1.25rem", alignItems: "start" }}>
          {inDay.map((f) => <FileCard key={f.path} f={f} onDelete={async () => { await remove([f.path]); load(); }} />)}
          {inDay.length === 0 && <div className="card empty">Carpeta vacía.</div>}
        </div>
      )}
    </div>
  );
}
