"use client";

import { useEffect, useState } from "react";
import { Download, Trash2, Copy, Check, FileText, Film, Image as ImageIcon, File as FileIcon, Clock, Linkedin } from "lucide-react";
import { fromISO, shortDate, today } from "@/lib/social";
import { Kit, StoredFile, deletesOn, fmtSize, isImage, isText, isVideo, readText, signedUrl } from "@/lib/files";
export { groupKits } from "@/lib/files";

const daysLeft = (created: string) => Math.max(0, Math.round((fromISO(deletesOn(created)).getTime() - fromISO(today()).getTime()) / 86400000));

function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button className={`copy-btn ${ok ? "ok" : ""}`} onClick={async () => { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1600); }}>
      {ok ? <Check /> : <Copy />} {ok ? "Copiado" : label}
    </button>
  );
}

const Expiry = ({ created }: { created: string }) => {
  const left = daysLeft(created);
  return <span className={`chip ${left <= 2 ? "chip-bad" : ""}`}><Clock style={{ width: 12, height: 12 }} /> {left === 0 ? "Se borra hoy" : `Se borra el ${shortDate(deletesOn(created))}`}</span>;
};

async function download(f: StoredFile) { window.open(await signedUrl(f.path, true), "_blank"); }

/** Un vídeo listo para publicar: vídeo/miniatura a la izquierda y los textos de cada red a la derecha. */
export function KitCard({ kit, onDelete }: { kit: Kit; onDelete: (paths: string[]) => void }) {
  const [tab, setTab] = useState<"video" | "thumb">(kit.video ? "video" : "thumb");
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [li, setLi] = useState<{ title: string; desc: string } | null>(null);
  const [tt, setTt] = useState<string | null>(null);

  useEffect(() => {
    for (const f of [kit.video, kit.thumb]) if (f) signedUrl(f.path).then((u) => setUrls((x) => ({ ...x, [f.path]: u }))).catch(() => {});
    if (kit.linkedin) readText(kit.linkedin.path).then((t) => {
      const m = t.match(/T[IÍ]TULO\s*\n([\s\S]*?)\n\s*\nDESCRIPCI[OÓ]N\s*\n([\s\S]*)/i);
      setLi(m ? { title: m[1].trim(), desc: m[2].trim() } : { title: "", desc: t.trim() });
    }).catch(() => setLi({ title: "", desc: "(no se ha podido leer)" }));
    if (kit.tiktok) readText(kit.tiktok.path).then((t) => setTt(t.trim())).catch(() => setTt("(no se ha podido leer)"));
  }, [kit.name]); // eslint-disable-line react-hooks/exhaustive-deps

  const media = tab === "video" ? kit.video : kit.thumb;
  const first = kit.files.map((f) => f.created).sort()[0];

  return (
    <div className="kit">
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
            <Expiry created={first} />
            <button className="icon-btn" title="Borrar este vídeo y sus textos" onClick={() => { if (confirm(`¿Borrar «${kit.name}» y todos sus archivos?`)) onDelete(kit.files.map((f) => f.path)); }}><Trash2 /></button>
          </div>
        </div>

        {kit.linkedin && (
          <section className="net net-li">
            <header><span className="net-ico" style={{ background: "#0a66c2" }}><Linkedin /></span> LinkedIn</header>
            {li === null ? <p className="text-muted text-sm">Cargando…</p> : (
              <>
                {li.title && (
                  <div className="field">
                    <div className="field-top"><span>Título</span><CopyButton text={li.title} /></div>
                    <p className="field-title">{li.title}</p>
                  </div>
                )}
                <div className="field">
                  <div className="field-top"><span>Descripción</span><CopyButton text={li.desc} /></div>
                  <p className="field-desc">{li.desc}</p>
                </div>
              </>
            )}
          </section>
        )}

        {kit.tiktok && (
          <section className="net net-tt">
            <header>
              <span className="net-ico" style={{ background: "#0e0e0e" }}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden><path d="M14.5 3c.4 2.3 1.9 3.8 4.5 4v3.1c-1.7 0-3.2-.5-4.5-1.4v6.4a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v3.2a2.5 2.5 0 1 0 1.6 2.3V3h3.1z" fill="#fff" /></svg>
              </span> TikTok
            </header>
            <div className="field">
              <div className="field-top"><span>Título</span>{tt && <CopyButton text={tt} />}</div>
              <p className="field-title">{tt ?? "Cargando…"}</p>
            </div>
          </section>
        )}

        <div className="kit-files">
          {[kit.video, kit.thumb].filter(Boolean).map((f) => (
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
export function FileCard({ f, onDelete }: { f: StoredFile; onDelete: () => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  useEffect(() => {
    if (isText(f)) readText(f.path).then(setText).catch(() => setText("(no se ha podido leer)"));
    else if (isImage(f) || isVideo(f)) signedUrl(f.path).then(setUrl).catch(() => {});
  }, [f.path]); // eslint-disable-line react-hooks/exhaustive-deps
  const Icon = isVideo(f) ? Film : isImage(f) ? ImageIcon : isText(f) ? FileText : FileIcon;
  return (
    <div className="file-card">
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
          <Expiry created={f.created} /><span className="text-xs text-muted">{fmtSize(f.size)}</span>
        </div>
        <div className="flex gap-2" style={{ marginTop: 10 }}>
          {isText(f) && text !== null && <CopyButton text={text} />}
          <button className="copy-btn" onClick={() => download(f)}><Download /> Descargar</button>
          <button className="icon-btn" style={{ marginLeft: "auto" }} onClick={() => { if (confirm(`¿Borrar «${f.name}»?`)) onDelete(); }} aria-label={`Borrar ${f.name}`}><Trash2 /></button>
        </div>
      </div>
    </div>
  );
}
