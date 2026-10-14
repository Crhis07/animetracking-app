'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import AnimeCard from '@/components/AnimeCard';
import ImportModal from '@/components/ImportModal';
import { getAnimes } from '@/lib/store';
import {
  TrackedAnime,
  AnimeStatus,
  MediaKind,
  STATUS_ORDER,
  STATUS_COLORS,
  getStatusLabel,
} from '@/lib/types';

type SortKey = 'updatedAt' | 'title' | 'score' | 'progress';

const SORT_LABELS: Record<SortKey, string> = {
  updatedAt: 'Actualización',
  title: 'Título',
  score: 'Puntuación',
  progress: 'Progreso',
};

export default function ListPage() {
  const [items, setItems] = useState<TrackedAnime[]>([]);
  const [mediaTab, setMediaTab] = useState<'all' | 'anime' | 'manga'>('all');
  const [activeStatus, setActiveStatus] = useState<AnimeStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [showImport, setShowImport] = useState(false);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    setItems(getAnimes());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  const animeCount = useMemo(() => items.filter((a) => (a.kind ?? 'anime') === 'anime').length, [items]);
  const mangaCount = useMemo(() => items.filter((a) => a.kind === 'manga').length, [items]);

  // Items filtered by mediaTab first
  const tabItems = useMemo(() => {
    if (mediaTab === 'all') return items;
    return items.filter((a) => (a.kind ?? 'anime') === mediaTab);
  }, [items, mediaTab]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: tabItems.length };
    for (const s of STATUS_ORDER) {
      counts[s] = tabItems.filter((a) => a.status === s).length;
    }
    return counts;
  }, [tabItems]);

  const filtered = useMemo(() => {
    let list = [...tabItems];

    if (activeStatus !== 'all') {
      list = list.filter((a) => a.status === activeStatus);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.titleEnglish?.toLowerCase().includes(q) ||
          a.genres.some((g) => g.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      switch (sortKey) {
        case 'title':
          return (a.titleEnglish || a.title).localeCompare(b.titleEnglish || b.title);
        case 'score':
          return (b.score ?? 0) - (a.score ?? 0);
        case 'progress': {
          const aTotal = a.kind === 'manga' ? a.totalChapters : a.totalEpisodes;
          const aCurr = a.kind === 'manga' ? (a.currentChapter ?? 0) : a.currentEpisode;
          const aPct = aTotal ? aCurr / aTotal : 0;

          const bTotal = b.kind === 'manga' ? b.totalChapters : b.totalEpisodes;
          const bCurr = b.kind === 'manga' ? (b.currentChapter ?? 0) : b.currentEpisode;
          const bPct = bTotal ? bCurr / bTotal : 0;

          return bPct - aPct;
        }
        default: // updatedAt
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return list;
  }, [tabItems, activeStatus, search, sortKey]);

  if (!mounted) return null;

  return (
    <>
      <Navbar />
      <main className="page-wrapper">
        {/* Header */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 className="page-title">Mi Lista</h1>
              <p className="page-subtitle">
                {animeCount} animes y {mangaCount} mangas en seguimiento
              </p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowImport(true)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Importar / Exportar
            </button>
          </div>

          {/* Media Kind Selector (Todo / Anime / Manga) */}
          <div style={{ display: 'flex', gap: 8, marginTop: 18, borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
            <button
              onClick={() => { setMediaTab('all'); setActiveStatus('all'); }}
              className={`tab-btn ${mediaTab === 'all' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <span>🌟 Todo</span>
              <span className="tab-badge">{items.length}</span>
            </button>
            <button
              onClick={() => { setMediaTab('anime'); setActiveStatus('all'); }}
              className={`tab-btn ${mediaTab === 'anime' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <span>🎬 Anime</span>
              <span className="tab-badge">{animeCount}</span>
            </button>
            <button
              onClick={() => { setMediaTab('manga'); setActiveStatus('all'); }}
              className={`tab-btn ${mediaTab === 'manga' ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <span>📖 Manga</span>
              <span className="tab-badge">{mangaCount}</span>
            </button>
          </div>

          {/* Status Tabs */}
          <div className="tabs-container" style={{ marginTop: 12 }}>
            <button
              onClick={() => setActiveStatus('all')}
              className={`tab-btn ${activeStatus === 'all' ? 'active' : ''}`}
            >
              Todos <span className="tab-badge">{countByStatus.all}</span>
            </button>
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                onClick={() => setActiveStatus(s)}
                className={`tab-btn ${activeStatus === s ? 'active' : ''}`}
                style={{
                  color: activeStatus === s ? STATUS_COLORS[s] : undefined,
                  borderBottomColor: activeStatus === s ? STATUS_COLORS[s] : 'transparent',
                }}
              >
                {getStatusLabel(s, mediaTab === 'manga' ? 'manga' : 'anime')}
                <span className="tab-badge">{countByStatus[s]}</span>
              </button>
            ))}
          </div>

          {/* Search + Sort Bar */}
          <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="input-search"
                style={{ paddingLeft: 38, width: '100%' }}
                placeholder={`Buscar en tus ${mediaTab === 'all' ? 'animes y mangas' : mediaTab === 'manga' ? 'mangas' : 'animes'}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ordenar:</span>
              <select
                className="status-select"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                style={{ padding: '7px 12px' }}
              >
                {Object.entries(SORT_LABELS).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {filtered.length > 0 ? (
          <div className="anime-grid">
            {filtered.map((item) => (
              <AnimeCard key={`${item.kind ?? 'anime'}-${item.malId}`} anime={item} onUpdate={refresh} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <h3>No hay {mediaTab === 'all' ? 'títulos' : mediaTab === 'manga' ? 'mangas' : 'animes'} aquí</h3>
            <p>
              {search || activeStatus !== 'all'
                ? 'No se encontraron resultados con los filtros actuales.'
                : 'Aún no tienes elementos guardados en esta sección.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setShowImport(true)}>
                Importar de MyAnimeList
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Import Modal */}
      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImportSuccess={() => {
            refresh();
            setShowImport(false);
          }}
        />
      )}
    </>
  );
}
