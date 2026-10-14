'use client';

import { useState, useRef } from 'react';
import { TrackedAnime, MediaKind, JikanAnime } from '@/lib/types';
import { upsertAnime } from '@/lib/store';
import { jikanToTracked, jikanMangaToTracked } from '@/lib/jikan';

interface Props {
  anime: JikanAnime;
  tracked: TrackedAnime | undefined;
  kind?: MediaKind;
  onAdd: () => void;
}

export default function SearchResultCard({ anime, tracked, kind = 'anime', onAdd }: Props) {
  const [adding, setAdding] = useState(false);
  const addedRef = useRef(false);

  const isManga = kind === 'manga' || anime.chapters !== undefined;

  const handleAdd = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (adding || addedRef.current) return;
    addedRef.current = true;
    setAdding(true);

    const entry = isManga ? jikanMangaToTracked(anime) : jikanToTracked(anime);
    entry.status = 'planned';
    upsertAnime(entry);
    onAdd();

    setTimeout(() => setAdding(false), 600);
  };

  const displayTitle = anime.title_english || anime.title;
  const cover = anime.images?.webp?.large_image_url ?? anime.images?.jpg?.large_image_url ?? '';

  return (
    <div className="search-card">
      {/* Cover */}
      {cover ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={cover} alt={displayTitle} className="search-card-cover" loading="lazy" />
      ) : (
        <div className="search-card-cover" style={{ background: 'var(--bg-elevated)' }} />
      )}

      {/* Kind badge */}
      <span
        style={{
          position: 'absolute',
          top: 6,
          left: 6,
          fontSize: '0.65rem',
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 4,
          background: isManga ? 'rgba(236, 72, 153, 0.9)' : 'rgba(99, 102, 241, 0.9)',
          color: '#fff',
          zIndex: 2,
        }}
      >
        {isManga ? 'Manga' : 'Anime'}
      </span>

      {/* Already in list badge */}
      {tracked && (
        <div className="search-card-in-list" title={`En tu lista: ${tracked.status}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Overlay on hover */}
      <div className="search-card-overlay">
        {anime.score && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
            <span style={{ color: '#fbbf24', fontSize: '0.75rem' }}>★</span>
            <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 700 }}>{anime.score}</span>
          </div>
        )}
        {anime.genres?.slice(0, 2).map((g) => (
          <span key={g.mal_id} className="chip" style={{ fontSize: '0.65rem', marginBottom: 4 }}>{g.name}</span>
        ))}
        <button
          className={`btn ${tracked ? 'btn-ghost' : 'btn-primary'} btn-sm`}
          style={{ width: '100%', marginTop: 8 }}
          onClick={tracked ? undefined : handleAdd}
          disabled={adding}
        >
          {adding ? '✓ Añadido' : tracked ? `✓ En lista` : '+ Añadir a lista'}
        </button>
      </div>

      {/* Body */}
      <div className="search-card-body">
        <div className="search-card-title">{displayTitle}</div>
        <div className="search-card-sub">
          {[
            anime.type,
            isManga
              ? (anime.chapters ? `${anime.chapters} caps` : null)
              : (anime.episodes ? `${anime.episodes} eps` : null),
            anime.year ?? anime.aired?.from?.slice(0, 4) ?? anime.published?.from?.slice(0, 4),
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>
    </div>
  );
}
