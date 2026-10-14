'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from '@/components/Navbar';
import AnimeCard from '@/components/AnimeCard';
import ImportModal from '@/components/ImportModal';
import { getAnimes } from '@/lib/store';
import { TrackedAnime, AnimeStatus, STATUS_LABELS, STATUS_ORDER, STATUS_COLORS } from '@/lib/types';

type SortKey = 'updatedAt' | 'title' | 'score' | 'progress';

const SORT_LABELS: Record<SortKey, string> = {
  updatedAt: 'Actualización',
  title: 'Título',
  score: 'Puntuación',
  progress: 'Progreso',
};

export default function ListPage() {
  const [animes, setAnimes] = useState<TrackedAnime[]>([]);
  const [activeStatus, setActiveStatus] = useState<AnimeStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('updatedAt');
  const [showImport, setShowImport] = useState(false);
  const [mounted, setMounted] = useState(false);

  const refresh = useCallback(() => {
    setAnimes(getAnimes());
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
  }, [refresh]);

  const countByStatus = useMemo(() => {
    const counts: Record<string, number> = { all: animes.length };
    for (const s of STATUS_ORDER) {
      counts[s] = animes.filter((a) => a.status === s).length;
    }
    return counts;
  }, [animes]);

  const filtered = useMemo(() => {
    let list = [...animes];

    if (activeStatus !== 'all') {
      list = list.filter((a) => a.status === activeStatus);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          (a.titleEnglish?.toLowerCase().includes(q)) ||
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
          const aPct = a.totalEpisodes ? a.currentEpisode / a.totalEpisodes : 0;
          const bPct = b.totalEpisodes ? b.currentEpisode / b.totalEpisodes : 0;
          return bPct - aPct;
        }
        default: // updatedAt
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
    });

    return list;
  }, [animes, activeStatus, search, sortKey]);

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
                {animes.length} anime{animes.length !== 1 ? 's' : ''} en seguimiento
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
        </div>

        {/* Filters row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24, alignItems: 'center' }}>
          {/* Status tabs */}
          <div className="filter-tabs" style={{ flex: 1 }}>
            <button
              className={`filter-tab ${activeStatus === 'all' ? 'active' : ''}`}
              onClick={() => setActiveStatus('all')}
            >
              Todos <span className="count">{countByStatus.all}</span>
            </button>
            {STATUS_ORDER.map((s) => (
              <button
                key={s}
                className={`filter-tab ${activeStatus === s ? 'active' : ''}`}
                onClick={() => setActiveStatus(s)}
                style={activeStatus === s ? { borderColor: STATUS_COLORS[s], color: STATUS_COLORS[s] } : {}}
              >
                {STATUS_LABELS[s]} <span className="count">{countByStatus[s] ?? 0}</span>
              </button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Ordenar:</span>
            <select
              className="form-select"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <option key={k} value={k}>{SORT_LABELS[k]}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="search-bar" style={{ marginBottom: 20 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            className="search-input"
            placeholder="Filtrar por título o género..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* List */}
        {animes.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <polyline points="14 2 14 8 20 8" /><line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
            </div>
            <div className="empty-title">Tu lista está vacía</div>
            <div className="empty-subtitle">
              Importa tu lista de AniList o empieza buscando animes para añadir.
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setShowImport(true)}>
                Importar de AniList
              </button>
              <a href="/search" className="btn btn-ghost">Buscar anime</a>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state" style={{ padding: 40 }}>
            <div className="empty-title" style={{ fontSize: '1rem' }}>Sin resultados</div>
            <div className="empty-subtitle">Prueba con otro filtro o término de búsqueda.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((anime) => (
              <AnimeCard key={anime.malId} anime={anime} onUpdate={refresh} />
            ))}
          </div>
        )}
      </main>

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onImported={() => { refresh(); setShowImport(false); }}
        />
      )}
    </>
  );
}
