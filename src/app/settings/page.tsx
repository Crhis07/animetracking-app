'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import ImportModal from '@/components/ImportModal';
import { getAnimes, exportStoreJSON, getMALProfile, saveMALProfile, mergeFromMALSync } from '@/lib/store';
import { MALProfile } from '@/lib/types';

export default function SettingsPage() {
  const [showImport, setShowImport] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  // MAL link state
  const [malProfile, setMalProfile] = useState<MALProfile | null>(null);
  const [malInput, setMalInput] = useState('');
  const [isSyncingMAL, setIsSyncingMAL] = useState(false);
  const [malMessage, setMalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setMalProfile(getMALProfile());
  }, []);

  const items = typeof window !== 'undefined' ? getAnimes() : [];
  const animeCount = items.filter((a) => (a.kind ?? 'anime') === 'anime').length;
  const mangaCount = items.filter((a) => a.kind === 'manga').length;

  const handleMALSync = async (userToSync: string) => {
    if (!userToSync.trim()) return;
    setIsSyncingMAL(true);
    setMalMessage(null);

    try {
      const res = await fetch(`/api/mal/sync?username=${encodeURIComponent(userToSync.trim())}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setMalMessage({ type: 'error', text: data.error || 'Error al sincronizar con MyAnimeList.' });
        setIsSyncingMAL(false);
        return;
      }

      const { added, updated } = mergeFromMALSync(data.entries || [], data.favorites, data.profile);
      setMalProfile(data.profile);
      setMalInput('');
      setMalMessage({
        type: 'success',
        text: `✅ ¡Sincronización exitosa! ${data.totalAnime} animes, ${data.totalManga} mangas y todos tus favoritos vinculados (${added} nuevos, ${updated} actualizados).`,
      });
    } catch (err) {
      console.error(err);
      setMalMessage({ type: 'error', text: 'Error de conexión con el servidor de sincronización.' });
    } finally {
      setIsSyncingMAL(false);
    }
  };

  const handleUnlinkMAL = () => {
    saveMALProfile(null);
    setMalProfile(null);
    setMalMessage({ type: 'success', text: 'Cuenta de MyAnimeList desvinculada.' });
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
  };

  const handleClearAll = () => {
    localStorage.removeItem('animelist_v1');
    setCleared(true);
    setConfirmClear(false);
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <>
      <Navbar />
      <main className="page-wrapper" style={{ maxWidth: 640 }}>
        <div className="page-header">
          <h1 className="page-title">Ajustes</h1>
          <p className="page-subtitle">Gestiona tu vinculación con MyAnimeList y tus datos</p>
        </div>

        {/* MyAnimeList Direct Link Card */}
        <div
          className="card"
          style={{
            padding: 22,
            marginBottom: 20,
            background: 'linear-gradient(135deg, rgba(18, 19, 31, 0.95) 0%, rgba(30, 41, 75, 0.5) 100%)',
            borderColor: malProfile ? 'rgba(99, 102, 241, 0.4)' : 'rgba(255, 255, 255, 0.1)',
            boxShadow: malProfile ? '0 8px 32px rgba(99, 102, 241, 0.15)' : 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div className="section-title" style={{ margin: 0, gap: 10 }}>
              <span
                style={{
                  background: '#2e51a2',
                  color: '#fff',
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  padding: '3px 8px',
                  borderRadius: 6,
                  letterSpacing: '0.04em',
                }}
              >
                MAL
              </span>
              <span>Vinculación con MyAnimeList</span>
            </div>
            {malProfile && (
              <span
                style={{
                  fontSize: '0.75rem',
                  color: '#4ade80',
                  background: 'rgba(74, 222, 128, 0.15)',
                  padding: '3px 10px',
                  borderRadius: 20,
                  fontWeight: 600,
                  border: '1px solid rgba(74, 222, 128, 0.3)',
                }}
              >
                ● Vinculado
              </span>
            )}
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            {malProfile
              ? `Tu cuenta pública de MyAnimeList está vinculada. Puedes sincronizar tus animes, mangas y las 4 categorías de favoritos con 1 solo clic en cualquier dispositivo.`
              : `Vincula tu usuario público de MyAnimeList. Se sincronizarán automáticamente todos tus animes, mangas, tu foto de perfil y tus favoritos (animes, mangas, waifus/personajes y seiyuus) sin necesidad de subir archivos de respaldo.`}
          </p>

          {malProfile ? (
            <div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  borderRadius: 12,
                  marginBottom: 16,
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={malProfile.avatar || '/logo.jpg'}
                  alt={malProfile.username}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    objectFit: 'cover',
                    border: '2px solid #6366f1',
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>
                    @{malProfile.username}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {malProfile.lastSyncedAt
                      ? `Última sincronización: ${new Date(malProfile.lastSyncedAt).toLocaleString('es-ES')}`
                      : 'Vinculado'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  className="btn btn-primary"
                  onClick={() => handleMALSync(malProfile.username)}
                  disabled={isSyncingMAL}
                  style={{ flex: 1, minWidth: 200, justifyContent: 'center' }}
                >
                  <span style={{ display: 'inline-block', animation: isSyncingMAL ? 'spin 1s linear infinite' : 'none' }}>
                    🔄
                  </span>
                  <span>{isSyncingMAL ? 'Sincronizando con MyAnimeList...' : 'Sincronizar Todo Ahora'}</span>
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={handleUnlinkMAL}
                  disabled={isSyncingMAL}
                  style={{ color: '#f87171', borderColor: 'rgba(248, 113, 113, 0.3)' }}
                >
                  Desvincular
                </button>
              </div>
            </div>
          ) : (
            <div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleMALSync(malInput);
                }}
                style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}
              >
                <input
                  type="text"
                  className="input"
                  placeholder="Tu nombre de usuario en MyAnimeList..."
                  value={malInput}
                  onChange={(e) => setMalInput(e.target.value)}
                  style={{ flex: 1, minWidth: 220 }}
                  disabled={isSyncingMAL}
                />
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!malInput.trim() || isSyncingMAL}
                  style={{ minWidth: 160 }}
                >
                  <span style={{ display: 'inline-block', animation: isSyncingMAL ? 'spin 1s linear infinite' : 'none' }}>
                    🔄
                  </span>
                  <span>{isSyncingMAL ? 'Sincronizando...' : 'Vincular y Sincronizar'}</span>
                </button>
              </form>
            </div>
          )}

          {malMessage && (
            <div
              style={{
                marginTop: 14,
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: '0.84rem',
                background: malMessage.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: malMessage.type === 'success' ? '#86efac' : '#fca5a5',
                border: `1px solid ${malMessage.type === 'success' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              }}
            >
              {malMessage.text}
            </div>
          )}
        </div>

        {/* Info card */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Sobre Anime & Manga Tracker
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Versión', '1.1.0 (Anime + Manga Unified)'],
              ['Almacenamiento', 'localStorage local privado'],
              ['Animes en lista', String(animeCount)],
              ['Mangas en lista', String(mangaCount)],
              ['Búsqueda y Metadatos', 'Jikan API v4 (MyAnimeList)'],
              ['Importación soportada', 'MyAnimeList XML (Anime y Manga) + AniList'],
            ].map(([label, value]) => (
              <div key={label} className="detail-meta-row">
                <span className="detail-meta-label">{label}</span>
                <span className="detail-meta-value">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Data management */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div className="section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/>
              <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
            Gestión de datos
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Tus datos se guardan de forma 100% privada en tu navegador.
            Exporta un backup de vez en cuando para mantener una copia de seguridad o transferirlo a otro dispositivo.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleExport}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar backup completo
            </button>
            <button className="btn btn-ghost" onClick={() => setShowImport(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Importar / Sincronizar
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="card" style={{ padding: 20, borderColor: 'rgba(248, 113, 113, 0.2)' }}>
          <div className="section-title" style={{ color: 'var(--status-dropped)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            Zona de peligro
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 14 }}>
            Borrar toda la lista de animes y mangas almacenada en este navegador. Esta acción es irreversible.
          </p>
          {!confirmClear ? (
            <button
              className="btn btn-ghost"
              style={{ color: 'var(--status-dropped)', borderColor: 'rgba(248, 113, 113, 0.3)' }}
              onClick={() => setConfirmClear(true)}
            >
              Borrar todos mis datos
            </button>
          ) : (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button className="btn btn-danger" onClick={handleClearAll}>
                ⚠️ Sí, borrar todo definitivamente
              </button>
              <button className="btn btn-ghost" onClick={() => setConfirmClear(false)}>
                Cancelar
              </button>
            </div>
          )}
          {cleared && (
            <p style={{ marginTop: 10, fontSize: '0.83rem', color: 'var(--status-watching)' }}>
              ✓ Datos borrados. Reiniciando...
            </p>
          )}
        </div>
      </main>

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => setShowImport(false)}
        />
      )}
    </>
  );
}
