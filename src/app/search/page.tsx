'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import Navbar from '@/components/Navbar';
import SearchResultCard from '@/components/SearchResultCard';
import { searchAnime, searchManga, getTopAnime, getTopManga, getSeasonalAnime } from '@/lib/jikan';
import { getAnimes } from '@/lib/store';
import { JikanAnime, TrackedAnime, MediaKind } from '@/lib/types';

type Tab = 'search' | 'trending' | 'seasonal';

const QUICK_SUGGESTIONS_ANIME = ['Frieren', 'Dandadan', 'Solo Leveling', 'Jujutsu Kaisen', 'Shingeki no Kyojin', 'Monster'];
const QUICK_SUGGESTIONS_MANGA = ['Berserk', 'Chainsaw Man', 'One Piece', 'Vagabond', 'Monster', 'Tokyo Ghoul'];

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

  // Load featured (trending or seasonal) when tab changes
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
      .then((data) => {
        setFeatured(data);
      })
      .catch(() => {
        setError('Error al cargar datos. Intenta de nuevo.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [tab, mediaKind]);

  // Fast debounced search (350ms) with guaranteed finally cleanup
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      setHasMore(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const fetcher = mediaKind === 'manga' ? searchManga : searchAnime;
        const { data, hasMore: more } = await fetcher(query.trim(), 1);
        setResults(data);
        setHasMore(more);
        setPage(1);
      } catch (e) {
        console.error('Search error:', e);
        setError('No se pudo conectar con el servidor de búsqueda. Intenta con otro término.');
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, mediaKind]);

  const loadMore = async () => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setLoading(true);
    try {
      const fetcher = mediaKind === 'manga' ? searchManga : searchAnime;
      const { data, hasMore: more } = await fetcher(query.trim(), nextPage);
      setResults((prev) => [...prev, ...data]);
      setHasMore(more);
      setPage(nextPage);
    } catch {
      setError('Error al cargar más resultados.');
    } finally {
      setLoading(false);
    }
  };

  const displayList = tab === 'search' ? results : featured;
  const suggestions = mediaKind === 'manga' ? QUICK_SUGGESTIONS_MANGA : QUICK_SUGGESTIONS_ANIME;

  return (
    <>
      <Navbar />
      <main className="page-wrapper">
        <div className="page-header" style={{ marginBottom: 20 }}>
          <h1 className="page-title">
            Buscar {mediaKind === 'manga' ? 'Manga' : 'Anime'}
          </h1>
          <p className="page-subtitle">
            Encuentra cualquier anime o manga con portadas oficiales y añádelo en 1 clic
          </p>

          {/* Media kind switcher */}
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button
              onClick={() => {
                setMediaKind('anime');
                if (tab === 'seasonal' && mediaKind === 'manga') setTab('trending');
              }}
              className={`tab-btn ${mediaKind === 'anime' ? 'active' : ''}`}
              style={{
                fontWeight: 700,
                padding: '9px 22px',
                background: mediaKind === 'anime' ? 'var(--grad-accent)' : undefined,
                color: mediaKind === 'anime' ? '#fff' : undefined,
                border: 'none',
              }}
            >
              🎬 Anime
            </button>
            <button
              onClick={() => {
                setMediaKind('manga');
                if (tab === 'seasonal') setTab('trending');
              }}
              className={`tab-btn ${mediaKind === 'manga' ? 'active' : ''}`}
              style={{
                fontWeight: 700,
                padding: '9px 22px',
                background: mediaKind === 'manga' ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : undefined,
                color: mediaKind === 'manga' ? '#fff' : undefined,
                border: 'none',
              }}
            >
              📖 Manga
            </button>
          </div>
        </div>

        {/* Discovery Tabs */}
        <div className="tabs-container" style={{ marginBottom: 20 }}>
          <button
            className={`tab-btn ${tab === 'search' ? 'active' : ''}`}
            onClick={() => setTab('search')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Buscador
          </button>
          <button
            className={`tab-btn ${tab === 'trending' ? 'active' : ''}`}
            onClick={() => setTab('trending')}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
            Más Populares
          </button>
          {mediaKind === 'anime' && (
            <button
              className={`tab-btn ${tab === 'seasonal' ? 'active' : ''}`}
              onClick={() => setTab('seasonal')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Temporada Actual
            </button>
          )}
        </div>

        {/* Search Input Bar */}
        {tab === 'search' && (
          <div style={{ marginBottom: 24, maxWidth: 600 }}>
            <div style={{ position: 'relative' }}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              >
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                className="input-search"
                style={{ width: '100%', paddingLeft: 44, fontSize: '0.95rem', height: 46 }}
                placeholder={mediaKind === 'manga' ? "Buscar manga por título en japonés o inglés..." : "Buscar anime por título en japonés o inglés..."}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              {query && (
                <button
                  onClick={() => setQuery('')}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Quick Suggestion Chips */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Sugerencias:</span>
              {suggestions.map((name) => (
                <button
                  key={name}
                  onClick={() => setQuery(name)}
                  style={{
                    fontSize: '0.72rem',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: 'var(--text-secondary)',
                    padding: '3px 9px',
                    borderRadius: 9999,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div style={{ padding: '12px 18px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', borderRadius: 'var(--r-md)', color: '#f87171', fontSize: '0.85rem', marginBottom: 20 }}>
            {error}
          </div>
        )}

        {/* Loading Skeletons */}
        {loading && displayList.length === 0 && (
          <div className="anime-grid">
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                style={{
                  aspectRatio: '2/3',
                  borderRadius: 'var(--r-lg)',
                  background: 'linear-gradient(90deg, rgba(21, 26, 43, 0.6) 25%, rgba(30, 37, 64, 0.8) 50%, rgba(21, 26, 43, 0.6) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }}
              />
            ))}
          </div>
        )}

        {/* Empty state when no results for typed query */}
        {!loading && displayList.length === 0 && tab === 'search' && query.trim() && (
          <div className="empty-state">
            <h3 style={{ color: '#fff', fontSize: '1.1rem', marginBottom: 6 }}>No encontramos resultados para &quot;{query}&quot;</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Prueba buscando el título en inglés o con menos palabras.</p>
          </div>
        )}

        {/* Empty state when landing on search with empty query */}
        {!loading && displayList.length === 0 && tab === 'search' && !query.trim() && (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: 8 }}>Escribe el nombre de tu {mediaKind === 'manga' ? 'manga' : 'anime'} favorito</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: 450, margin: '0 auto 18px auto' }}>
              Puedes buscar títulos como <em>Frieren, Shingeki no Kyojin, Jujutsu Kaisen, Berserk o One Piece</em>.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => setTab('trending')}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              🌟 Explorar los más populares de todos los tiempos
            </button>
          </div>
        )}

        {/* Results Grid */}
        {displayList.length > 0 && (
          <>
            <div className="anime-grid">
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
                <button className="btn btn-secondary" onClick={loadMore} disabled={loading} style={{ padding: '10px 24px' }}>
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
