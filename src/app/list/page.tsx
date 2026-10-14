'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import AnimeCard from '@/components/AnimeCard';
import ImportModal from '@/components/ImportModal';
import { getAnimes, upsertAnime } from '@/lib/store';
import { batchFetchCovers } from '@/lib/covers';
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

type ViewFilter = 'all' | AnimeStatus | 'airing';

export default function ListPage() {
  const [items, setItems] = useState<TrackedAnime[]>([]);
  // Default master tab is 'anime', cleanly separating anime and manga
  const [masterTab, setMasterTab] = useState<'anime' | 'manga' | 'all'>('anime');
  const [activeFilter, setActiveFilter] = useState<ViewFilter>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [showImport, setShowImport] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [fetchingCovers, setFetchingCovers] = useState(false);
  const [coverProgress, setCoverProgress] = useState<{ done: number; total: number } | null>(null);

  const refresh = useCallback(() => {
    setItems(getAnimes());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  const animeList = useMemo(() => items.filter((a) => (a.kind ?? 'anime') === 'anime'), [items]);
  const mangaList = useMemo(() => items.filter((a) => a.kind === 'manga'), [items]);

  // Current scope according to master tab
  const scopedItems = useMemo(() => {
    if (masterTab === 'anime') return animeList;
    if (masterTab === 'manga') return mangaList;
    return items;
  }, [items, masterTab, animeList, mangaList]);

  // Missing covers count
  const missingCoversCount = useMemo(() => {
    return items.filter((a) => !a.coverImage).length;
  }, [items]);

  const handleDownloadMissingCovers = async () => {
    const missing = items.filter((a) => !a.coverImage);
    if (missing.length === 0 || fetchingCovers) return;
    setFetchingCovers(true);
    setCoverProgress({ done: 0, total: missing.length });

    const coverMap = await batchFetchCovers(missing, (done, total) => {
      setCoverProgress({ done, total });
    });

    for (const item of missing) {
      const key = `${item.kind ?? 'anime'}-${item.malId}`;
      const meta = coverMap.get(key);
      if (meta && meta.cover) {
        upsertAnime({
          ...item,
          coverImage: meta.cover,
          genres: meta.genres.length > 0 ? meta.genres : item.genres,
          synopsis: meta.synopsis || item.synopsis,
          airingStatus: meta.status || item.airingStatus,
        });
      }
    }

    refresh();
    setCoverProgress(null);
    setFetchingCovers(false);
  };

  const isAiringItem = (a: TrackedAnime) => {
    const s = (a.airingStatus || '').toLowerCase();
    return s.includes('airing') || s.includes('releasing') || s.includes('publishing');
  };

  const countByFilter = useMemo(() => {
    const counts: Record<string, number> = { all: scopedItems.length };
    for (const s of STATUS_ORDER) {
      counts[s] = scopedItems.filter((a) => a.status === s).length;
    }
    counts['airing'] = scopedItems.filter(isAiringItem).length;
    return counts;
  }, [scopedItems]);

  const filtered = useMemo(() => {
    let list = [...scopedItems];

    if (activeFilter === 'airing') {
      list = list.filter(isAiringItem);
    } else if (activeFilter !== 'all') {
      list = list.filter((a) => a.status === activeFilter);
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
        default:
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return list;
  }, [scopedItems, activeFilter, search, sortKey]);

  if (!mounted) return null;

  return (
    <>
      <Navbar />
      <main className="page-wrapper">
        {/* Header */}
        <div className="page-header">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 className="page-title">
                {masterTab === 'anime' ? 'Mis Animes' : masterTab === 'manga' ? 'Mis Mangas' : 'Mi Lista Completa'}
              </h1>
              <p className="page-subtitle">
                {masterTab === 'anime'
                  ? `${animeList.length} anime${animeList.length !== 1 ? 's' : ''} en seguimiento`
                  : masterTab === 'manga'
                  ? `${mangaList.length} manga${mangaList.length !== 1 ? 's' : ''} en seguimiento`
                  : `${items.length} títulos totales`}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link
                href={`/search?type=${masterTab === 'manga' ? 'manga' : 'anime'}`}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                + Añadir nuevo {masterTab === 'manga' ? 'Manga' : 'Anime'}
              </Link>
              <button className="btn btn-ghost" onClick={() => setShowImport(true)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Importar de MyAnimeList
              </button>
            </div>
          </div>

          {/* Master Panel Switcher (ANIMES vs MANGAS) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginTop: 20 }}>
            <div style={{ display: 'flex', gap: 8, background: 'var(--bg-elevated)', padding: 4, borderRadius: 'var(--radius-md)' }}>
              <button
                onClick={() => { setMasterTab('anime'); setActiveFilter('all'); }}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: masterTab === 'anime' ? 'var(--primary)' : 'transparent',
                  color: masterTab === 'anime' ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                <span>🎬 ANIMES</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.85, background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: 99 }}>
                  {animeList.length}
                </span>
              </button>

              <button
                onClick={() => { setMasterTab('manga'); setActiveFilter('all'); }}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: masterTab === 'manga' ? '#ec4899' : 'transparent',
                  color: masterTab === 'manga' ? '#fff' : 'var(--text-secondary)',
                  transition: 'all 0.2s',
                }}
              >
                <span>📖 MANGAS</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.85, background: 'rgba(0,0,0,0.2)', padding: '1px 6px', borderRadius: 99 }}>
                  {mangaList.length}
                </span>
              </button>

              <button
                onClick={() => { setMasterTab('all'); setActiveFilter('all'); }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '0.82rem',
                  background: masterTab === 'all' ? 'var(--bg-glass)' : 'transparent',
                  color: masterTab === 'all' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
                title="Ver animes y mangas juntos"
              >
                Ambos ({items.length})
              </button>
            </div>
          </div>

          {/* Missing covers banner if any */}
          {missingCoversCount > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 16px',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                ℹ️ Hay <strong>{missingCoversCount}</strong> títulos importados sin portada visible.
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={handleDownloadMissingCovers}
                disabled={fetchingCovers}
              >
                {fetchingCovers
                  ? `Descargando portadas (${coverProgress?.done ?? 0}/${coverProgress?.total ?? missingCoversCount})...`
                  : '🎨 Descargar todas las portadas automáticamente'}
              </button>
            </div>
          )}

          {/* Status and Airing Tabs */}
          <div className="tabs-container" style={{ marginTop: 16 }}>
            <button
              onClick={() => setActiveFilter('all')}
              className={`tab-btn ${activeFilter === 'all' ? 'active' : ''}`}
            >
              Todos <span className="tab-badge">{countByFilter.all}</span>
            </button>

            {/* Watching / Reading */}
            <button
              onClick={() => setActiveFilter('watching')}
              className={`tab-btn ${activeFilter === 'watching' ? 'active' : ''}`}
              style={{
                color: activeFilter === 'watching' ? STATUS_COLORS.watching : undefined,
                borderBottomColor: activeFilter === 'watching' ? STATUS_COLORS.watching : 'transparent',
              }}
            >
              {masterTab === 'manga' ? 'Leyendo' : 'Viendo'}
              <span className="tab-badge">{countByFilter.watching}</span>
            </button>

            {/* Planned / To Read */}
            <button
              onClick={() => setActiveFilter('planned')}
              className={`tab-btn ${activeFilter === 'planned' ? 'active' : ''}`}
              style={{
                color: activeFilter === 'planned' ? STATUS_COLORS.planned : undefined,
                borderBottomColor: activeFilter === 'planned' ? STATUS_COLORS.planned : 'transparent',
              }}
            >
              {masterTab === 'manga' ? 'Por Leer' : 'Por Ver'}
              <span className="tab-badge">{countByFilter.planned}</span>
            </button>

            {/* Completed */}
            <button
              onClick={() => setActiveFilter('completed')}
              className={`tab-btn ${activeFilter === 'completed' ? 'active' : ''}`}
              style={{
                color: activeFilter === 'completed' ? STATUS_COLORS.completed : undefined,
                borderBottomColor: activeFilter === 'completed' ? STATUS_COLORS.completed : 'transparent',
              }}
            >
              Completados
              <span className="tab-badge">{countByFilter.completed}</span>
            </button>

            {/* Airing / Publishing */}
            {countByFilter.airing > 0 && (
              <button
                onClick={() => setActiveFilter('airing')}
                className={`tab-btn ${activeFilter === 'airing' ? 'active' : ''}`}
                style={{
                  color: activeFilter === 'airing' ? '#38bdf8' : undefined,
                  borderBottomColor: activeFilter === 'airing' ? '#38bdf8' : 'transparent',
                }}
              >
                {masterTab === 'manga' ? 'En Publicación' : 'En Emisión'}
                <span className="tab-badge">{countByFilter.airing}</span>
              </button>
            )}

            {/* On-Hold */}
            <button
              onClick={() => setActiveFilter('on_hold')}
              className={`tab-btn ${activeFilter === 'on_hold' ? 'active' : ''}`}
              style={{
                color: activeFilter === 'on_hold' ? STATUS_COLORS.on_hold : undefined,
                borderBottomColor: activeFilter === 'on_hold' ? STATUS_COLORS.on_hold : 'transparent',
              }}
            >
              En Pausa
              <span className="tab-badge">{countByFilter.on_hold}</span>
            </button>

            {/* Dropped */}
            <button
              onClick={() => setActiveFilter('dropped')}
              className={`tab-btn ${activeFilter === 'dropped' ? 'active' : ''}`}
              style={{
                color: activeFilter === 'dropped' ? STATUS_COLORS.dropped : undefined,
                borderBottomColor: activeFilter === 'dropped' ? STATUS_COLORS.dropped : 'transparent',
              }}
            >
              Dropeados
              <span className="tab-badge">{countByFilter.dropped}</span>
            </button>
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
                placeholder={`Buscar en tus ${masterTab === 'manga' ? 'mangas' : masterTab === 'anime' ? 'animes' : 'títulos'}...`}
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
            <h3>No hay {masterTab === 'manga' ? 'mangas' : 'animes'} en esta vista</h3>
            <p>
              {search || activeFilter !== 'all'
                ? 'No se encontraron resultados con los filtros actuales.'
                : masterTab === 'manga'
                ? 'Aún no has subido tu mangalist_...xml de MyAnimeList.'
                : 'Aún no tienes animes en esta sección.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 12 }}>
              <button className="btn btn-primary" onClick={() => setShowImport(true)}>
                {masterTab === 'manga' ? 'Importar lista de Mangas' : 'Importar lista de Animes'}
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
