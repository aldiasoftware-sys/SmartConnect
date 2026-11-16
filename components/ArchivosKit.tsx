"use client";

import { HTMLAttributes, useEffect, useState } from "react";
import { Download, Copy, Check, FileText, Film, Image as ImageIcon, File as FileIcon, Clock, FolderOpen, Pencil, X } from "lucide-react";
import { fromISO, shortDate, today } from "@/lib/social";
import { Kit, StoredFile, deletesOn, fmtSize, isImage, isText, isVideo, readText, signedUrl, writeText } from "@/lib/files";
import { BrandLogo } from "./AccountIcon";
import { CardMenu } from "./Papelera";
export { groupKits } from "@/lib/files";

const daysLeft = (created: string, date?: string) => Math.max(0, Math.round((fromISO(deletesOn(created, date)).getTime() - fromISO(today()).getTime()) / 86400000));

/** Una línea por red: logo, texto en una línea, Editar (guarda en Archivos) y Copiar. */
function NetRow({ platform, label, path, text, onSaved }: { platform: string; label: string; path: string; text: string | null; onSaved: (t: string) => void }) {
  const [edit, setEdit] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  async function guardar() {
    if (edit === null) return; setBusy(true);
    try { await writeText(path, edit.trim() + "\n"); onSaved(edit.trim()); setEdit(null); } catch (e: any) { alert(e?.message || "No se ha podido guardar"); }
    setBusy(false);
  }
  return (
    <div className={`net-row ${edit !== null ? "editing" : ""}`}>
      <BrandLogo platform={platform} size={26} />
      {edit === null ? (
        <>
          <div className="net-row-text" title={text || ""}><small>{label}</small><span>{text ?? "Cargando…"}</span></div>
          <button className="icon-btn sm" onClick={() => setEdit(text || "")} title="Editar" aria-label={`Editar ${label}`}><Pencil /></button>
          <button className={`icon-btn sm ${ok ? "ok" : ""}`} disabled={!text} title={ok ? "Copiado" : "Copiar"} aria-label={`Copiar ${label}`}
            onClick={async () => { await navigator.clipboard.writeText(text || ""); setOk(true); setTimeout(() => setOk(false), 1500); }}>{ok ? <Check /> : <Copy />}</button>
        </>
      ) : (
        <>
          <textarea autoFocus value={edit} onChange={(e) => setEdit(e.target.value)} rows={Math.min(6, Math.max(2, Math.ceil(edit.length / 70)))}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) guardar(); if (e.key === "Escape") setEdit(null); }} />
          <button className="icon-btn sm ok" onClick={guardar} disabled={busy} title="Guardar (Ctrl+Enter)" aria-label="Guardar"><Check /></button>
          <button className="icon-btn sm" onClick={() => setEdit(null)} title="Cancelar" aria-label="Cancelar"><X /></button>
        </>
      )}
    </div>
  );
}

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button className={`copy-btn ${ok ? "ok" : ""}`} onClick={async () => { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1600); }}>
      {ok ? <Check /> : <Copy />} {ok ? "Copiado" : label}
    </button>
  );
}

const Expiry = ({ created, date }: { created: string; date?: string }) => {
  const left = daysLeft(created, date);
  return <span className={`chip ${left <= 1 ? "chip-bad" : ""}`}><Clock style={{ width: 12, height: 12 }} /> {left === 0 ? "Se borra hoy" : `Se borra el ${shortDate(deletesOn(created, date))}`}</span>;
};

/** Del texto de «ruta 4K.txt» (p. ej. C:\Users\Alejandro\Videos\TikTok 4K\2026-11-15 pieza 4K.mp4): el archivo y de quién es el PC. */
const nombreArchivo = (ruta: string) => ruta.split(/[\\/]/).pop() || ruta;
const pcDe = (ruta: string) => {
  const u = ruta.match(/^[a-z]:[\\/]users[\\/]([^\\/]+)/i)?.[1];
  const quien = u ? ({ alejandro: "Millán" } as Record<string, string>)[u.toLowerCase()] || u : "";
  return quien ? `en el ordenador de ${quien}` : "en el ordenador que lo hizo";
};

async function download(f: StoredFile) { window.open(await signedUrl(f.path, true), "_blank"); }

/** «Abrir en la carpeta». Primero le pide al ayudante local de la skill (abrir4k.pyw --servidor, solo en 127.0.0.1) que abra
 *  el Explorador con el vídeo seleccionado: funciona en cualquier navegador, también en el de la app de Claude. Si el ayudante
 *  no contesta (PC sin la skill), prueba el enlace aldia4k:// y, si en ~2,5 s no se ha abierto nada, lo explica. */
const AYUDANTE = "http://127.0.0.1:47321";
function AbrirCarpeta({ ruta }: { ruta: string }) {
  const [nota, setNota] = useState<"" | "abierto" | "no_esta" | "sin_ayudante">("");
  const nombre = nombreArchivo(ruta);
  const enlace = `aldia4k://abrir/${encodeURIComponent(nombre)}`;

  function porEnlace() {
    // se lanza desde aquí (no con el clic del enlace): algunas extensiones de Chrome se meten en los clics de los enlaces
    window.location.href = enlace;
    let salio = false;
    const marca = () => { salio = true; };
    window.addEventListener("blur", marca, { once: true });
    document.addEventListener("visibilitychange", marca, { once: true });
    setTimeout(() => {
      window.removeEventListener("blur", marca); document.removeEventListener("visibilitychange", marca);
      if (!salio) setNota("sin_ayudante");
    }, 2500);
  }

  async function abrir(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault(); setNota("");
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 1500);
      const r = await fetch(`${AYUDANTE}/abrir?f=${encodeURIComponent(nombre)}`, { signal: ctl.signal, cache: "no-store" });
      clearTimeout(t);
      const j = await r.json();
      setNota(j.abierto ? "abierto" : "no_esta");
      if (j.abierto) setTimeout(() => setNota(""), 2500);
    } catch { porEnlace(); }
  }

  return (
    <>
      <a className="copy-btn" href={enlace} onClick={abrir}>{nota === "abierto" ? <Check /> : <FolderOpen />} {nota === "abierto" ? "Abierto" : "Carpeta"}</a>
      {nota === "no_esta" && (
        <p className="kit-ruta-nota">Este vídeo no está en este ordenador: su máster en 4K se quedó en el PC que lo renderizó ({pcDe(ruta).replace(/^en el /, "el ")}). Pídeselo o súbelo desde allí.</p>
      )}
      {nota === "sin_ayudante" && (
        <p className="kit-ruta-nota">
          ¿No se ha abierto? Este ordenador necesita la skill aldia-viral instalada (<code>abrir4k.pyw --registrar</code>), que deja el
          ayudante que abre la carpeta. Mientras, usa «Copiar ruta».
        </p>
      )}
    </>
  );
}

/** Un vídeo listo para publicar: vídeo/miniatura a la izquierda y los textos de cada red a la derecha.
 *  `onDelete` pide borrarlo (la página confirma); `drag` lo hace arrastrable a la papelera. */
export function KitCard({ kit, onDelete, drag }: { kit: Kit; onDelete: () => void; drag?: HTMLAttributes<HTMLDivElement> }) {
  const [tab, setTab] = useState<"video" | "thumb">(kit.video ? "video" : "thumb");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [tt, setTt] = useState<string | null>(null);
  const [ig, setIg] = useState<string | null>(null);
  const [ruta, setRuta] = useState<string | null>(null);

  useEffect(() => {
    if (kit.ruta) readText(kit.ruta.path).then((t) => setRuta(t.trim() || null)).catch(() => setRuta(null));
    for (const f of [kit.video, kit.thumb]) if (f) signedUrl(f.path).then((u) => setUrls((x) => ({ ...x, [f.path]: u }))).catch(() => {});
    if (kit.tiktok) readText(kit.tiktok.path).then((t) => setTt(t.trim())).catch(() => setTt("(no se ha podido leer)"));
    if (kit.instagram) readText(kit.instagram.path).then((t) => setIg(t.trim())).catch(() => setIg("(no se ha podido leer)"));
  }, [kit.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const media = tab === "video" ? kit.video : kit.thumb;
  const first = kit.files.map((f) => f.created).sort()[0];

  return (
    <div className="kit" {...drag}>
      <div className="kit-media">
        <div className="kit-frame">
          {media && urls[media.path] ? (tab === "video"
            ? <video key={media.path} src={urls[media.path]} controls preload="metadata" />
            : <img src={urls[media.path]} alt="Miniatura de LinkedIn" />)
            : <div className="kit-empty">{tab === "video" ? <Film /> : <ImageIcon />}</div>}
        </div>
        {kit.video && kit.thumb && (
          <div className="seg kit-tabs">
            <button className={tab === "video" ? "on" : ""} onClick={() => setTab("video")}><Film /> Vídeo</button>
            <button className={tab === "thumb" ? "on" : ""} onClick={() => setTab("thumb")}><ImageIcon /> Miniatura</button>
          </div>
        )}
      </div>

      <div className="kit-body">
        <div className="kit-head">
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Listo para publicar</div>
            <h3>{kit.name}</h3>
          </div>
          <div className="flex items-center gap-2" style={{ flexShrink: 0 }}>
            <Expiry created={first} date={kit.files[0]?.date} />
            <CardMenu onDelete={onDelete} />
          </div>
        </div>

        {/* LinkedIn en pausa: su texto sigue en Archivos, pero no se enseña */}
        <div className="net-rows">
          {kit.tiktok && <NetRow platform="tiktok" label="TikTok" path={kit.tiktok.path} text={tt} onSaved={setTt} />}
          {kit.instagram && <NetRow platform="instagram" label="Instagram" path={kit.instagram.path} text={ig} onSaved={setIg} />}
          {ruta && (
            <div className="net-row">
              <span className="net-4k">4K</span>
              <div className="net-row-text" title={ruta}><small>Máster {pcDe(ruta)}</small><span>{nombreArchivo(ruta)}</span></div>
              <CopyButton text={ruta} label="Ruta" />
              <AbrirCarpeta ruta={ruta} />
            </div>
          )}
        </div>

        <div className="kit-files">
          {[ruta ? undefined : kit.video, kit.thumb].filter(Boolean).map((f) => (
            <button key={f!.path} className="kit-file" onClick={() => download(f!)}>
              {isVideo(f!) ? <Film /> : <ImageIcon />}<span>{isVideo(f!) ? "Vídeo" : "Miniatura"}</span><small>{fmtSize(f!.size)}</small><Download />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Archivo suelto (subido a mano). */
export function FileCard({ f, onDelete, drag }: { f: StoredFile; onDelete: () => void; drag?: HTMLAttributes<HTMLDivElement> }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (isText(f)) readText(f.path).then(setText).catch(() => setText("(no se ha podido leer)"));
    else if (isImage(f) || isVideo(f)) signedUrl(f.path).then(setUrl).catch(() => {});
  }, [f.path]); // eslint-disable-line react-hooks/exhaustive-deps
  const Icon = isVideo(f) ? Film : isImage(f) ? ImageIcon : isText(f) ? FileText : FileIcon;
  return (
    <div className="file-card" {...drag}>
      <div className="file-prev">
        {isVideo(f) && url && <video src={url} controls preload="metadata" />}
        {isImage(f) && url && <img src={url} alt={f.name} />}
        {isText(f) && <pre>{text ?? "Cargando…"}</pre>}
        {!isText(f) && !url && <Icon className="file-ico" />}
      </div>
      <div className="file-meta">
        <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
          <Icon style={{ width: 15, height: 15, flexShrink: 0, color: "var(--text-muted)" }} />
          <b title={f.name}>{f.name}</b>
        </div>
        <div className="flex items-center justify-between" style={{ gap: 8, marginTop: 8 }}>
          <Expiry created={f.created} date={f.date} /><span className="text-xs text-muted">{fmtSize(f.size)}</span>
        </div>
        <div className="flex gap-2" style={{ marginTop: 10 }}>
          {isText(f) && text !== null && <CopyButton text={text} />}
          <button className="copy-btn" onClick={() => download(f)}><Download /> Descargar</button>
          <div style={{ marginLeft: "auto" }}><CardMenu onDelete={onDelete} /></div>
        </div>
      </div>
    </div>
  );
}
