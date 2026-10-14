'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import ImportModal from '@/components/ImportModal';
import { getAnimes, exportStoreJSON } from '@/lib/store';

export default function SettingsPage() {
  const [showImport, setShowImport] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const items = typeof window !== 'undefined' ? getAnimes() : [];
  const animeCount = items.filter((a) => (a.kind ?? 'anime') === 'anime').length;
  const mangaCount = items.filter((a) => a.kind === 'manga').length;

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
          <p className="page-subtitle">Gestiona tus datos y preferencias</p>
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
