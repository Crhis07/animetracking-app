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
  STATUS_ORDER,
  STATUS_COLORS,
  getStatusLabel,
} from '@/lib/types';

type SortKey = 'updatedAt' | 'title' | 'score' | 'progress';

const SORT_LABELS: Record<SortKey, string> = {
  updatedAt: 'Recientes',
  title: 'Título A-Z',
  score: 'Mejor puntuados',
  progress: 'Mayor progreso',
};

type ViewFilter = 'all' | AnimeStatus | 'airing';

export default function ListPage() {
  const [items, setItems] = useState<TrackedAnime[]>([]);
  const [masterTab, setMasterTab] = useState<'anime' | 'manga'>('anime');
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

  const scopedItems = useMemo(() => {
    return masterTab === 'manga' ? mangaList : animeList;
  }, [masterTab, animeList, mangaList]);

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
        {/* Header Banner */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 className="page-title" style={{ fontSize: '2.2rem' }}>
                {masterTab === 'anime' ? 'Mis Animes' : 'Mis Mangas'}
              </h1>
              <p className="page-subtitle" style={{ fontSize: '0.95rem' }}>
                {masterTab === 'anime'
                  ? `${animeList.length} anime${animeList.length !== 1 ? 's' : ''} en seguimiento`
                  : `${mangaList.length} manga${mangaList.length !== 1 ? 's' : ''} en seguimiento`}
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link
                href={`/search?type=${masterTab}`}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 18px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                + Añadir nuevo {masterTab === 'manga' ? 'Manga' : 'Anime'}
              </Link>
              <button
                className="btn btn-ghost"
                onClick={() => setShowImport(true)}
                style={{ padding: '10px 16px' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Importar XML de MAL
              </button>
            </div>
          </div>

          {/* Master Panel Switcher (Sleek Segmented Control) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                gap: 6,
                background: 'rgba(15, 19, 32, 0.95)',
                padding: '5px',
                borderRadius: 'var(--r-full)',
                border: '1px solid var(--border)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
              }}
            >
              <button
                onClick={() => { setMasterTab('anime'); setActiveFilter('all'); }}
                className={`tab-btn ${masterTab === 'anime' ? 'active' : ''}`}
                style={{
                  padding: '9px 24px',
                  borderRadius: 'var(--r-full)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: masterTab === 'anime' ? 'var(--grad-accent)' : 'transparent',
                  color: masterTab === 'anime' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  boxShadow: masterTab === 'anime' ? '0 0 20px rgba(99, 102, 241, 0.4)' : 'none',
                }}
              >
                <span>🎬 ANIMES</span>
                <span className="tab-badge">{animeList.length}</span>
              </button>

              <button
                onClick={() => { setMasterTab('manga'); setActiveFilter('all'); }}
                className={`tab-btn ${masterTab === 'manga' ? 'active' : ''}`}
                style={{
                  padding: '9px 24px',
                  borderRadius: 'var(--r-full)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: masterTab === 'manga' ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : 'transparent',
                  color: masterTab === 'manga' ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  boxShadow: masterTab === 'manga' ? '0 0 20px rgba(236, 72, 153, 0.4)' : 'none',
                }}
              >
                <span>📖 MANGAS</span>
                <span className="tab-badge">{mangaList.length}</span>
              </button>
            </div>
          </div>

          {/* Missing covers banner if any */}
          {missingCoversCount > 0 && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 18px',
                background: 'rgba(99, 102, 241, 0.12)',
                border: '1px solid rgba(99, 102, 241, 0.35)',
                borderRadius: 'var(--r-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                ✨ Hay <strong>{missingCoversCount}</strong> títulos importados sin portada visible.
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
          <div className="tabs-container" style={{ marginTop: 20 }}>
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
                borderColor: activeFilter === 'watching' ? STATUS_COLORS.watching : undefined,
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
                borderColor: activeFilter === 'planned' ? STATUS_COLORS.planned : undefined,
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
                borderColor: activeFilter === 'completed' ? STATUS_COLORS.completed : undefined,
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
                  borderColor: activeFilter === 'airing' ? '#38bdf8' : undefined,
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
                borderColor: activeFilter === 'on_hold' ? STATUS_COLORS.on_hold : undefined,
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
                borderColor: activeFilter === 'dropped' ? STATUS_COLORS.dropped : undefined,
              }}
            >
              Dropeados
              <span className="tab-badge">{countByFilter.dropped}</span>
            </button>
          </div>

          {/* Search + Sort Bar */}
          <div style={{ display: 'flex', gap: 12, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="input-search"
                style={{ width: '100%', paddingLeft: 42 }}
                placeholder={`Buscar en tus ${masterTab === 'manga' ? 'mangas' : 'animes'} por título o género...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Sort */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Ordenar:</span>
              <select
                className="status-select"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
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
        ) : scopedItems.length === 0 ? (
          /* High-end Welcome Hero when the collection is empty */
          <div
            style={{
              marginTop: 32,
              padding: '48px 32px',
              borderRadius: 'var(--r-xl)',
              background: 'linear-gradient(145deg, rgba(21, 26, 43, 0.8) 0%, rgba(15, 19, 32, 0.9) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: 90,
                height: 90,
                borderRadius: '50%',
                overflow: 'hidden',
                border: '3px solid rgba(236, 72, 153, 0.7)',
                boxShadow: '0 0 30px rgba(236, 72, 153, 0.4), 0 0 50px rgba(99, 102, 241, 0.3)',
                marginBottom: 20,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.jpg" alt="AniTrack Mascot" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>

            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: 8, color: '#fff' }}>
              ¡Tu colección de {masterTab === 'manga' ? 'Manga' : 'Anime'} está lista!
            </h2>
            <p style={{ maxWidth: 480, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 28 }}>
              {masterTab === 'manga'
                ? 'Importa tu mangalist_...xml de MyAnimeList para cargar tus mangas con portadas y capítulos, o busca nuevos títulos.'
                : 'Importa tu animelist_...xml de MyAnimeList para cargar tus animes con portadas y episodios, o explora los estrenos.'}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, width: '100%', maxWidth: 580 }}>
              <div
                onClick={() => setShowImport(true)}
                style={{
                  background: 'rgba(99, 102, 241, 0.1)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 'var(--r-lg)',
                  padding: '20px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
                className="card-hover-effect"
              >
                <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>📥</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: 4 }}>
                  Importar de MyAnimeList
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Sube tu archivo .xml oficial y se descargarán todas tus portadas automáticamente.
                </div>
              </div>

              <Link
                href={`/search?type=${masterTab}`}
                style={{
                  background: 'rgba(236, 72, 153, 0.1)',
                  border: '1px solid rgba(236, 72, 153, 0.3)',
                  borderRadius: 'var(--r-lg)',
                  padding: '20px',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                  display: 'block',
                }}
                className="card-hover-effect"
              >
                <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>🔍</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: 4 }}>
                  Explorar {masterTab === 'manga' ? 'Mangas' : 'Animes'}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  Busca cualquier título o explora la temporada actual para añadir a tu lista.
                </div>
              </Link>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No se encontraron resultados</h3>
            <p style={{ marginTop: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              No hay {masterTab === 'manga' ? 'mangas' : 'animes'} que coincidan con la búsqueda o el filtro actual.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              style={{ marginTop: 14 }}
              onClick={() => { setSearch(''); setActiveFilter('all'); }}
            >
              Restablecer filtros
            </button>
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
