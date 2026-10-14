'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import ImportModal from '@/components/ImportModal';
import { getAnimes, exportStoreJSON } from '@/lib/store';

export default function SettingsPage() {
  const [showImport, setShowImport] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const animeCount = typeof window !== 'undefined' ? getAnimes().length : 0;

  const handleExport = () => {
    const json = exportStoreJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `animelist-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
          <p className="page-subtitle">Gestiona tus datos y preferencias</p>
        </div>

        {/* Info card */}
        <div className="card" style={{ padding: 20, marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            Sobre AnimeTracker
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['Versión', '1.0.0'],
              ['Almacenamiento', 'localStorage del navegador'],
              ['Animes en lista', String(animeCount)],
              ['API de búsqueda', 'Jikan v4 (MyAnimeList)'],
              ['Importación', 'AniList GraphQL API'],
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
            Tus datos se almacenan únicamente en este navegador (localStorage).
            Exporta regularmente para no perder tu progreso si limpias la caché.
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={handleExport}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar backup
            </button>
            <button className="btn btn-ghost" onClick={() => setShowImport(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Importar / AniList
            </button>
          </div>
        </div>

        {/* Danger zone */}
        <div className="card" style={{ padding: 20, borderColor: 'rgba(248, 113, 113, 0.2)' }}>
          <div className="section-title" style={{ color: 'var(--status-dropped)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
            Zona de peligro
          </div>
          <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.6 }}>
            Esta acción eliminará permanentemente toda tu lista de anime del localStorage.
            Esta operación no se puede deshacer.
          </p>

          {cleared ? (
            <div className="toast success" style={{ position: 'static', animation: 'none', maxWidth: '100%' }}>
              ✓ Lista eliminada. Recargando...
            </div>
          ) : confirmClear ? (
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: '0.83rem', color: 'var(--status-dropped)' }}>¿Estás seguro? Perderás {animeCount} animes.</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmClear(false)}>Cancelar</button>
              <button className="btn btn-danger btn-sm" onClick={handleClearAll}>Sí, eliminar todo</button>
            </div>
          ) : (
            <button className="btn btn-danger" onClick={() => setConfirmClear(true)}>
              Eliminar toda mi lista
            </button>
          )}
        </div>

        {/* API info */}
        <div className="card" style={{ padding: 20, marginTop: 20 }}>
          <div className="section-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
            APIs utilizadas
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.83rem' }}>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Jikan API v4</div>
              <div style={{ color: 'var(--text-secondary)' }}>API no-oficial de MyAnimeList. Gratuita, sin API key. <a href="https://jikan.moe" target="_blank" rel="noopener" style={{ color: 'var(--text-accent)' }}>jikan.moe</a></div>
            </div>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>AniList GraphQL API</div>
              <div style={{ color: 'var(--text-secondary)' }}>API oficial de AniList. Gratuita, sin API key para datos públicos. <a href="https://anilist.co" target="_blank" rel="noopener" style={{ color: 'var(--text-accent)' }}>anilist.co</a></div>
            </div>
          </div>
        </div>
      </main>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => setShowImport(false)}
        />
      )}
    </>
  );
}
