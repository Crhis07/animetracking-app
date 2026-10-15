'use client';

import { useState, useEffect, useRef } from 'react';
import { importFromAniList } from '@/lib/anilist';
import { parseMALXML } from '@/lib/mal-import';
import { batchFetchCovers } from '@/lib/covers';
import {
  upsertAnime,
  exportStoreJSON,
  importStoreJSON,
  getAnimes,
  getMALProfile,
  saveMALProfile,
  saveFavorites,
  mergeFromMALSync,
} from '@/lib/store';

interface Props {
  onClose: () => void;
  onImported?: () => void;
  onImportSuccess?: () => void;
}

type Tab = 'mal' | 'anilist' | 'json';

export default function ImportModal({ onClose, onImported, onImportSuccess }: Props) {
  const [tab, setTab] = useState<Tab>('mal');
  const [username, setUsername] = useState('');
  const [malDirectUser, setMalDirectUser] = useState('');
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [malFile, setMalFile] = useState<File | null>(null);
  const [enrichProgress, setEnrichProgress] = useState<{ done: number; total: number } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const malFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const existing = getMALProfile();
    if (existing?.username) {
      setMalDirectUser(existing.username);
    }
  }, []);

  const notifySuccess = () => {
    onImported?.();
    onImportSuccess?.();
  };

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
    const { entries, total, detectedKind, userInfo, error } = parseMALXML(text);

    if (error) {
      setResult({ type: 'error', msg: error });
      setLoading(false);
      return;
    }

    if (entries.length === 0) {
      setResult({ type: 'error', msg: 'No se encontraron registros en el archivo.' });
      setLoading(false);
      return;
    }

    // Save initial items
    const existing = getAnimes();
    let added = 0;
    for (const entry of entries) {
      const alreadyExists = existing.find(
        (a) => a.malId === entry.malId && (a.kind ?? 'anime') === (entry.kind ?? 'anime')
      );
      if (!alreadyExists) {
        upsertAnime(entry);
        added++;
      } else {
        upsertAnime({ ...alreadyExists, ...entry, notes: alreadyExists.notes, coverImage: alreadyExists.coverImage });
      }
    }

    const kindLabel = detectedKind === 'manga' ? 'mangas' : detectedKind === 'both' ? 'títulos' : 'animes';

    setResult({
      type: 'info',
      msg: `Descargando portadas en alta definición para tus ${total} ${kindLabel}...`,
    });
    notifySuccess();

    // Fast batch fetch of all covers via AniList API
    setEnrichProgress({ done: 0, total: entries.length });
    const coverMap = await batchFetchCovers(entries, (done, totalItems) => {
      setEnrichProgress({ done, total: totalItems });
    });

    // Apply covers to store
    for (const entry of entries) {
      const key = `${entry.kind ?? 'anime'}-${entry.malId}`;
      const meta = coverMap.get(key);
      if (meta) {
        upsertAnime({
          ...entry,
          coverImage: meta.cover || entry.coverImage,
          genres: meta.genres.length > 0 ? meta.genres : entry.genres,
          synopsis: meta.synopsis || entry.synopsis,
          airingStatus: meta.status || entry.airingStatus,
        });
      }
    }

    if (userInfo?.username) {
      try {
        const favRes = await fetch(`/api/mal/profile?username=${encodeURIComponent(userInfo.username)}`);
        if (favRes.ok) {
          const favData = await favRes.json();
          if (favData.favorites) {
            saveFavorites(favData.favorites);
          }
          if (favData.avatar) {
            saveMALProfile({ username: userInfo.username, avatar: favData.avatar, lastSyncedAt: new Date().toISOString() });
          }
        }
      } catch (e) {
        console.warn('Could not auto-fetch favorites from XML user:', e);
      }
    }

    notifySuccess();
    setEnrichProgress(null);
    setResult({
      type: 'success',
      msg: `✅ ¡Lista de ${kindLabel} importada exitosamente! ${total} ${kindLabel} registrados con sus portadas e información.`,
    });
    setLoading(false);
  };

  // ─── Direct MAL Sync ───
  const handleDirectMALSync = async () => {
    if (!malDirectUser.trim()) return;
    setLoading(true);
    setResult({
      type: 'info',
      msg: `Conectando con MyAnimeList para sincronizar catálogo y favoritos de @${malDirectUser.trim()}...`,
    });

    try {
      const res = await fetch(`/api/mal/sync?username=${encodeURIComponent(malDirectUser.trim())}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setResult({ type: 'error', msg: data.error || 'Error al sincronizar con MyAnimeList.' });
        setLoading(false);
        return;
      }

      const { added, updated } = mergeFromMALSync(data.entries || [], data.favorites, data.profile);
      setResult({
        type: 'success',
        msg: `✅ ¡Sincronizado! ${data.totalAnime} animes, ${data.totalManga} mangas y favoritos cargados (${added} nuevos, ${updated} actualizados).`,
      });
      notifySuccess();
    } catch (err) {
      console.error(err);
      setResult({ type: 'error', msg: 'Error al conectar con el servidor de sincronización.' });
    } finally {
      setLoading(false);
    }
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
        const alreadyExists = existing.find(
          (a) => a.malId === entry.malId && (a.kind ?? 'anime') === (entry.kind ?? 'anime')
        );
        if (!alreadyExists) {
          upsertAnime(entry);
          added++;
        }
      }
      setResult({
        type: 'success',
        msg: `✅ Importados ${entries.length} animes de AniList (${added} nuevos, ${entries.length - added} ya existían).`,
      });
      notifySuccess();
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
      setResult({ type: 'success', msg: `✅ Importados ${res.count} títulos nuevos del backup.` });
      notifySuccess();
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
    a.download = `animetrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setResult({ type: 'success', msg: '✅ Backup exportado correctamente.' });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Importar / Exportar</div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Tabs */}
          <div className="filter-tabs" style={{ marginBottom: 20 }}>
            <button className={`filter-tab ${tab === 'mal' ? 'active' : ''}`} onClick={() => { setTab('mal'); setResult(null); }}>
              🎌 MyAnimeList (Anime o Manga)
            </button>
            <button className={`filter-tab ${tab === 'anilist' ? 'active' : ''}`} onClick={() => { setTab('anilist'); setResult(null); }}>
              📋 AniList
            </button>
            <button className={`filter-tab ${tab === 'json' ? 'active' : ''}`} onClick={() => { setTab('json'); setResult(null); }}>
              💾 Backup JSON
            </button>
          </div>

          {/* ─── MAL Tab ─── */}
          {tab === 'mal' && (
            <div>
              {/* Direct Username Sync Block */}
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(46, 81, 162, 0.2) 0%, rgba(99, 102, 241, 0.15) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  borderRadius: 'var(--radius-md)',
                  padding: 16,
                  marginBottom: 18,
                }}
              >
                <div style={{ fontWeight: 700, color: '#fff', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>⚡</span> Sincronización Directa (Recomendado - Sin archivos)
                </div>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.5 }}>
                  Escribe tu usuario público de MyAnimeList. Se sincronizarán todos tus animes, mangas y tus 4 categorías de favoritos (Anime, Manga, Waifus/Personajes y Seiyuus) de forma instantánea.
                </p>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    type="text"
                    className="input"
                    placeholder="Tu usuario en MyAnimeList..."
                    value={malDirectUser}
                    onChange={(e) => setMalDirectUser(e.target.value)}
                    style={{ flex: 1, minWidth: 200 }}
                    disabled={loading}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleDirectMALSync}
                    disabled={!malDirectUser.trim() || loading}
                  >
                    {loading ? 'Sincronizando...' : '🔄 Sincronizar Todo'}
                  </button>
                </div>
              </div>

              {/* Manual XML Option Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 10px' }}>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  O subir archivo XML manual
                </span>
                <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              </div>

              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 14, fontSize: '0.81rem', lineHeight: 1.6 }}>
                <ol style={{ paddingLeft: 18, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>Descarga tu respaldo en <a href="https://myanimelist.net/panel.php?go=export" target="_blank" rel="noopener" style={{ color: 'var(--primary)' }}>myanimelist.net/panel.php?go=export</a></li>
                  <li>Si se descarga como <code style={{ background: 'var(--bg-glass)', padding: '1px 5px', borderRadius: 4 }}>.xml.gz</code>, descomprímelo para obtener el <code style={{ background: 'var(--bg-glass)', padding: '1px 5px', borderRadius: 4 }}>.xml</code></li>
                  <li>Sube el archivo abajo: detectaremos automáticamente tu usuario e importaremos tus favoritos.</li>
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
                  {malFile ? `📄 ${malFile.name}` : 'Elegir archivo animelist o mangalist (.xml)'}
                </button>
                {malFile && (
                  <button
                    className="btn btn-primary"
                    onClick={handleMALImport}
                    disabled={loading}
                  >
                    {loading ? 'Importando...' : '🚀 Importar a mi lista'}
                  </button>
                )}
              </div>

              {/* Progress */}
              {enrichProgress && (
                <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    Descargando portadas e información... ({enrichProgress.done} de {enrichProgress.total})
                  </div>
                  <div className="ep-track" style={{ height: 6 }}>
                    <div
                      className="ep-fill"
                      style={{ width: `${enrichProgress.total ? (enrichProgress.done / enrichProgress.total) * 100 : 0}%`, transition: 'width 0.3s' }}
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
                Importa tu lista de AniList ingresando tu nombre de usuario público.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="input-search"
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
            </div>
          )}

          {/* ─── JSON Backup Tab ─── */}
          {tab === 'json' && (
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>Exportar backup completo</div>
              <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 12, lineHeight: 1.6 }}>
                Descarga un archivo JSON con todos tus animes y mangas para respaldo.
              </p>
              <button className="btn btn-primary btn-sm" onClick={handleExport}>
                📥 Exportar mi lista completa
              </button>

              <div className="divider" style={{ margin: '18px 0' }} />

              <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 8 }}>Restaurar desde backup</div>
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

        <div className="modal-footer" style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}
