'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import SearchResultCard from '@/components/SearchResultCard';
import { searchAnime, searchManga, getTopAnime, getTopManga, getSeasonalAnime } from '@/lib/jikan';
import { getAnimes } from '@/lib/store';
import { JikanAnime, TrackedAnime, MediaKind } from '@/lib/types';

type Tab = 'search' | 'trending' | 'seasonal';

export default function SearchPage() {
  const [mediaKind, setMediaKind] = useState<MediaKind>('anime');
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<JikanAnime[]>([]);
  const [featured, setFeatured] = useState<JikanAnime[]>([]);
  const [trackedMap, setTrackedMap] = useState<Map<string, TrackedAnime>>(new Map());
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshTracked = useCallback(() => {
    const items = getAnimes();
    const map = new Map<string, TrackedAnime>();
    items.forEach((a) => map.set(`${a.kind ?? 'anime'}-${a.malId}`, a));
    setTrackedMap(map);
  }, []);

  useEffect(() => {
    refreshTracked();
    if (typeof window !== 'undefined') {
      const p = new URLSearchParams(window.location.search).get('type');
      if (p === 'manga' || p === 'anime') {
        setMediaKind(p);
      }
    }
  }, [refreshTracked]);

  // Reset or load featured when mediaKind or tab changes
  useEffect(() => {
    if (tab === 'search') return;
    setLoading(true);
    setError(null);

    const fetcher =
      mediaKind === 'manga'
        ? getTopManga
        : tab === 'trending'
        ? getTopAnime
        : getSeasonalAnime;

    fetcher()
      .then((data) => { setFeatured(data); setLoading(false); })
      .catch(() => { setError('Error al cargar datos. Intenta de nuevo.'); setLoading(false); });
  }, [tab, mediaKind]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); setHasMore(false); return; }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      setPage(1);
      try {
        const fetcher = mediaKind === 'manga' ? searchManga : searchAnime;
        const { data, hasMore: more } = await fetcher(query, 1);
        setResults(data);
        setHasMore(more);
      } catch {
        setError('Error al buscar. La API puede estar limitando peticiones temporalmente, espera unos segundos.');
      }
      setLoading(false);
    }, 600);
  }, [query, mediaKind]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setLoading(true);
    try {
      const fetcher = mediaKind === 'manga' ? searchManga : searchAnime;
      const { data, hasMore: more } = await fetcher(query, nextPage);
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
          <h1 className="page-title">Buscar {mediaKind === 'manga' ? 'Manga' : 'Anime'}</h1>
          <p className="page-subtitle">Encuentra animes y mangas para añadir a tu lista de seguimiento</p>

          {/* Media kind switcher */}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              onClick={() => { setMediaKind('anime'); if (tab === 'seasonal' && mediaKind === 'manga') setTab('trending'); }}
              className={`tab-btn ${mediaKind === 'anime' ? 'active' : ''}`}
              style={{ fontWeight: 600, padding: '8px 16px' }}
            >
              🎬 Anime
            </button>
            <button
              onClick={() => { setMediaKind('manga'); if (tab === 'seasonal') setTab('trending'); }}
              className={`tab-btn ${mediaKind === 'manga' ? 'active' : ''}`}
              style={{ fontWeight: 600, padding: '8px 16px' }}
            >
              📖 Manga
            </button>
          </div>
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
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Más Populares
          </button>
          {mediaKind === 'anime' && (
            <button
              className={`filter-tab ${tab === 'seasonal' ? 'active' : ''}`}
              onClick={() => setTab('seasonal')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Temporada Actual
            </button>
          )}
        </div>

        {/* Search input if on search tab */}
        {tab === 'search' && (
          <div style={{ position: 'relative', marginBottom: 28, maxWidth: 520 }}>
            <svg
              width="18"
              height="18"
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
              style={{ width: '100%', paddingLeft: 44, fontSize: '0.95rem', height: 44 }}
              placeholder={mediaKind === 'manga' ? "Buscar manga (ej: Berserk, One Piece, Chainsaw Man)..." : "Buscar anime (ej: Frieren, Jujutsu Kaisen, Shingeki)..."}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Error notice */}
        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: 'var(--radius-sm)', color: '#f87171', fontSize: '0.85rem', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && displayList.length === 0 && (
          <div className="search-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton" style={{ height: 260, borderRadius: 'var(--radius-md)' }} />
            ))}
          </div>
        )}

        {/* Grid of Results */}
        {!loading && displayList.length === 0 && tab === 'search' && query.trim() && (
          <div className="empty-state">
            <p>No se encontraron resultados para &quot;{query}&quot;.</p>
          </div>
        )}

        {displayList.length > 0 && (
          <>
            <div className="search-grid">
              {displayList.map((item) => (
                <SearchResultCard
                  key={`${mediaKind}-${item.mal_id}`}
                  anime={item}
                  kind={mediaKind}
                  tracked={trackedMap.get(`${mediaKind}-${item.mal_id}`)}
                  onAdd={refreshTracked}
                />
              ))}
            </div>

            {/* Load more button */}
            {tab === 'search' && hasMore && (
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <button className="btn btn-secondary" onClick={loadMore} disabled={loading}>
                  {loading ? 'Cargando más...' : 'Cargar más resultados'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </>
  );
}
