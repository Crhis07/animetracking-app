'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import SearchResultCard from '@/components/SearchResultCard';
import { searchAnime, getTopAnime, getSeasonalAnime } from '@/lib/jikan';
import { getAnimes } from '@/lib/store';
import { JikanAnime, TrackedAnime } from '@/lib/types';

type Tab = 'search' | 'trending' | 'seasonal';

export default function SearchPage() {
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JikanAnime[]>([]);
  const [featured, setFeatured] = useState<JikanAnime[]>([]);
  const [trackedMap, setTrackedMap] = useState<Map<number, TrackedAnime>>(new Map());
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshTracked = useCallback(() => {
    const animes = getAnimes();
    const map = new Map<number, TrackedAnime>();
    animes.forEach((a) => map.set(a.malId, a));
    setTrackedMap(map);
  }, []);

  useEffect(() => { refreshTracked(); }, [refreshTracked]);

  // Load featured (trending or seasonal) when tab changes
  useEffect(() => {
    if (tab === 'search') return;
    setLoading(true);
    setError(null);
    const fetcher = tab === 'trending' ? getTopAnime : getSeasonalAnime;
    fetcher()
      .then((data) => { setFeatured(data); setLoading(false); })
      .catch(() => { setError('Error al cargar datos. Intenta de nuevo.'); setLoading(false); });
  }, [tab]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setHasMore(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      setPage(1);
      try {
        const { data, hasMore: more } = await searchAnime(query, 1);
        setResults(data);
        setHasMore(more);
      } catch {
        setError('Error al buscar. La API de Jikan puede estar limitando peticiones, espera un momento.');
      }
      setLoading(false);
    }, 600);
  }, [query]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setLoading(true);
    try {
      const { data, hasMore: more } = await searchAnime(query, nextPage);
      setResults((prev) => [...prev, ...data]);
      setHasMore(more);
      setPage(nextPage);
    } catch {
      setError('Error al cargar más resultados.');
    }
    setLoading(false);
  };

  const displayList = tab === 'search' ? results : featured;

  return (
    <>
      <Navbar />
      <main className="page-wrapper">
        <div className="page-header">
          <h1 className="page-title">Buscar Anime</h1>
          <p className="page-subtitle">Encuentra animes para añadir a tu lista</p>
        </div>

        {/* Tabs */}
        <div className="filter-tabs" style={{ marginBottom: 24 }}>
          <button
            className={`filter-tab ${tab === 'search' ? 'active' : ''}`}
            onClick={() => setTab('search')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Buscar
          </button>
          <button
            className={`filter-tab ${tab === 'trending' ? 'active' : ''}`}
            onClick={() => setTab('trending')}
          >
            🔥 Populares
          </button>
          <button
            className={`filter-tab ${tab === 'seasonal' ? 'active' : ''}`}
            onClick={() => setTab('seasonal')}
          >
            📺 Temporada Actual
          </button>
        </div>

        {/* Search input */}
        {tab === 'search' && (
          <div className="search-bar" style={{ marginBottom: 24 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              className="search-input"
              placeholder="Busca por título, p.ej. Attack on Titan, Naruto..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="toast error" style={{ position: 'static', animation: 'none', marginBottom: 20, maxWidth: '100%' }}>
            ⚠️ {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && displayList.length === 0 && (
          <div className="search-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton" style={{ aspectRatio: '2/3', width: '100%', borderRadius: 'var(--r-lg)' }} />
                <div className="skeleton mt-2" style={{ height: 14, width: '80%' }} />
                <div className="skeleton mt-2" style={{ height: 10, width: '50%' }} />
              </div>
            ))}
          </div>
        )}

        {/* Results */}
        {!loading && displayList.length === 0 && tab === 'search' && query && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                <line x1="8" y1="11" x2="14" y2="11" />
              </svg>
            </div>
            <div className="empty-title">Sin resultados</div>
            <div className="empty-subtitle">No se encontraron animes para "{query}"</div>
          </div>
        )}

        {displayList.length > 0 && (
          <>
            <div className="search-grid">
              {displayList.map((anime) => (
                <SearchResultCard
                  key={anime.mal_id}
                  anime={anime}
                  tracked={trackedMap.get(anime.mal_id)}
                  onAdd={refreshTracked}
                />
              ))}
            </div>

            {/* Load more */}
            {hasMore && tab === 'search' && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
                <button
                  className="btn btn-ghost"
                  onClick={loadMore}
                  disabled={loading}
                >
                  {loading ? 'Cargando...' : 'Cargar más resultados'}
                </button>
              </div>
            )}
          </>
        )}

        {/* Empty state for tab without query */}
        {!loading && displayList.length === 0 && tab === 'search' && !query && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            <div className="empty-title">¿Qué quieres ver?</div>
            <div className="empty-subtitle">
              Escribe un título para buscar. También puedes explorar los populares o la temporada actual.
            </div>
          </div>
        )}
      </main>
    </>
  );
}
