'use client';

import { useState, useEffect, useRef } from 'react';
import { importFromAniList } from '@/lib/anilist';
import { parseMALXML, enrichWithJikan } from '@/lib/mal-import';
import { upsertAnime, exportStoreJSON, importStoreJSON, getAnimes } from '@/lib/store';

interface Props {
  onClose: () => void;
  onImported: () => void;
}

type Tab = 'mal' | 'anilist' | 'json';

export default function ImportModal({ onClose, onImported }: Props) {
  const [tab, setTab] = useState<Tab>('mal');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [malFile, setMalFile] = useState<File | null>(null);
  const [enrichProgress, setEnrichProgress] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const malFileRef = useRef<HTMLInputElement>(null);

  // Prevent background scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // ─── MAL XML Import ───
  const handleMALImport = async () => {
    if (!malFile) return;
    setLoading(true);
    setResult(null);
    setEnrichProgress(null);

    const text = await malFile.text();
    const { entries, total, userInfo, error } = parseMALXML(text);

    if (error) {
      setResult({ type: 'error', msg: error });
      setLoading(false);
      return;
    }

    if (entries.length === 0) {
      setResult({ type: 'error', msg: 'No se encontraron animes en el archivo.' });
      setLoading(false);
      return;
    }

    // Save all entries immediately (with basic data)
    const existing = getAnimes();
    let added = 0;
    for (const entry of entries) {
      const alreadyExists = existing.find((a) => a.malId === entry.malId);
      if (!alreadyExists) {
        upsertAnime(entry);
        added++;
      } else {
        // Update score/status/episodes from MAL but keep local notes/cover
        upsertAnime({ ...alreadyExists, ...entry, notes: alreadyExists.notes, coverImage: alreadyExists.coverImage });
      }
    }

    setResult({
      type: 'info',
      msg: `✓ ${total} animes importados de ${userInfo?.username ?? 'MAL'} (${added} nuevos). Enriqueciendo con portadas...`,
    });
    onImported();

    // Enrich first 30 entries with Jikan (cover images, genres, etc.)
    setEnrichProgress({ done: 0, total: Math.min(entries.length, 30) });
    const enriched = await enrichWithJikan(entries, 30, (done, total) => {
      setEnrichProgress({ done, total });
    });

    // Save enriched entries
    for (const entry of enriched) {
      upsertAnime(entry);
    }

    onImported();
    setEnrichProgress(null);
    setResult({
      type: 'success',
      msg: `✅ Lista de MAL importada: ${total} animes (${added} nuevos). Portadas descargadas para los primeros ${Math.min(entries.length, 30)}.`,
    });
    setLoading(false);
  };

  // ─── AniList Import ───
  const handleAnilistImport = async () => {
    if (!username.trim()) return;
    setLoading(true);
    setResult(null);
    setPage(0);

    const { entries, error } = await importFromAniList(username.trim(), setPage);

    if (error) {
      setResult({ type: 'error', msg: error });
    } else {
      let added = 0;
      const existing = getAnimes();
      for (const entry of entries) {
        const alreadyExists = existing.find((a) => a.malId === entry.malId);
        if (!alreadyExists) {
          upsertAnime(entry);
          added++;
        }
      }
      setResult({
        type: 'success',
        msg: `✅ Importados ${entries.length} animes de AniList (${added} nuevos, ${entries.length - added} ya existían).`,
      });
      onImported();
    }
    setLoading(false);
  };

  // ─── JSON Import ───
  const handleJsonImport = async () => {
    if (!jsonFile) return;
    setLoading(true);
    const text = await jsonFile.text();
    const res = importStoreJSON(text);
    if (res.success) {
      setResult({ type: 'success', msg: `✅ Importados ${res.count} animes nuevos del archivo.` });
      onImported();
    } else {
      setResult({ type: 'error', msg: res.error ?? 'Error al importar.' });
    }
    setLoading(false);
  };

  const handleExport = () => {
    const json = exportStoreJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `animelist-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setResult({ type: 'success', msg: '✅ Backup exportado correctamente.' });
  };

  const tabStyle = (t: Tab) => ({ borderColor: tab === t ? 'var(--accent)' : undefined, color: tab === t ? 'var(--text-accent)' : undefined });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Importar / Exportar</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div className="filter-tabs" style={{ marginBottom: 24 }}>
            <button className={`filter-tab ${tab === 'mal' ? 'active' : ''}`} style={tabStyle('mal')} onClick={() => { setTab('mal'); setResult(null); }}>
              🎌 MyAnimeList
            </button>
            <button className={`filter-tab ${tab === 'anilist' ? 'active' : ''}`} style={tabStyle('anilist')} onClick={() => { setTab('anilist'); setResult(null); }}>
              📋 AniList
            </button>
            <button className={`filter-tab ${tab === 'json' ? 'active' : ''}`} style={tabStyle('json')} onClick={() => { setTab('json'); setResult(null); }}>
              💾 Backup JSON
            </button>
          </div>

          {/* ─── MAL XML Tab ─── */}
          {tab === 'mal' && (
            <div>
              {/* Step by step guide */}
              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--r-md)', padding: 16, marginBottom: 20, fontSize: '0.83rem', lineHeight: 1.8 }}>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>📥</span> Cómo exportar tu lista de MyAnimeList:
                </div>
                <ol style={{ paddingLeft: 20, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>Ve a <a href="https://myanimelist.net/panel.php?go=export" target="_blank" rel="noopener" style={{ color: 'var(--text-accent)' }}>myanimelist.net/panel.php?go=export</a></li>
                  <li>Haz click en <strong style={{ color: 'var(--text-primary)' }}>"Export Anime List"</strong></li>
                  <li>Descarga el archivo <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4 }}>.xml</code> o <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4 }}>.xml.gz</code></li>
                  <li>Si es <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4 }}>.gz</code>, extráelo primero (7-Zip o similar)</li>
                  <li>Sube el <code style={{ background: 'var(--bg-card)', padding: '1px 5px', borderRadius: 4 }}>.xml</code> aquí ↓</li>
                </ol>
              </div>

              <input
                ref={malFileRef}
                type="file"
                accept=".xml,.xml.gz"
                style={{ display: 'none' }}
                onChange={(e) => { setMalFile(e.target.files?.[0] ?? null); setResult(null); }}
              />

              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <button className="btn btn-ghost" onClick={() => malFileRef.current?.click()} disabled={loading}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
                    <polyline points="14 2 14 8 20 8"/>
                  </svg>
                  {malFile ? `📄 ${malFile.name}` : 'Elegir archivo XML'}
                </button>
                {malFile && (
                  <button
                    className="btn btn-primary"
                    onClick={handleMALImport}
                    disabled={loading}
                  >
                    {loading ? 'Importando...' : '🚀 Importar mi lista'}
                  </button>
                )}
              </div>

              {/* Enrich progress */}
              {enrichProgress && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Descargando portadas e info adicional... ({enrichProgress.done}/{enrichProgress.total})
                  </div>
                  <div className="ep-track" style={{ height: 6 }}>
                    <div
                      className="ep-fill"
                      style={{ width: `${(enrichProgress.done / enrichProgress.total) * 100}%`, transition: 'width 0.3s' }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── AniList Tab ─── */}
          {tab === 'anilist' && (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
                Importa tu lista completa de AniList. Solo necesitas tu nombre de usuario público.
                Los animes que ya están en tu lista local no se duplicarán.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="Tu usuario de AniList..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnilistImport()}
                  disabled={loading}
                  style={{ flex: 1 }}
                />
                <button
                  className="btn btn-primary"
                  onClick={handleAnilistImport}
                  disabled={loading || !username.trim()}
                >
                  {loading ? `Página ${page}...` : 'Importar'}
                </button>
              </div>
              {loading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
                  <div className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                  <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)' }}>
                    Descargando página {page}...
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ─── JSON Backup Tab ─── */}
          {tab === 'json' && (
            <div>
              <div className="section-title" style={{ fontSize: '0.9rem', marginBottom: 8 }}>Exportar backup</div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                Descarga un JSON con toda tu lista para hacer backup o migrar de dispositivo.
              </p>
              <button className="btn btn-primary btn-sm" onClick={handleExport}>
                📥 Exportar mi lista
              </button>

              <div className="divider" />

              <div className="section-title" style={{ fontSize: '0.9rem', marginBottom: 8 }}>Importar desde backup</div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                Carga un JSON exportado previamente.
              </p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".json"
                  style={{ display: 'none' }}
                  onChange={(e) => setJsonFile(e.target.files?.[0] ?? null)}
                />
                <button className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()}>
                  {jsonFile ? `📄 ${jsonFile.name}` : '📂 Elegir archivo JSON'}
                </button>
                {jsonFile && (
                  <button className="btn btn-primary btn-sm" onClick={handleJsonImport} disabled={loading}>
                    {loading ? 'Importando...' : 'Importar'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Result message */}
          {result && (
            <div
              className={`toast ${result.type === 'info' ? 'info' : result.type}`}
              style={{ marginTop: 16, animation: 'none', position: 'static', maxWidth: '100%' }}
            >
              <span style={{ fontSize: '0.83rem' }}>{result.msg}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
