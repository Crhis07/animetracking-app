'use client';

import { useState, useCallback } from 'react';
import { TrackedAnime, AnimeStatus, STATUS_ORDER, getStatusLabel, STATUS_COLORS } from '@/lib/types';
import {
  updateEpisode,
  updateChapter,
  updateVolume,
  updateScore,
  updateStatus,
  updateNotes,
  removeAnime,
} from '@/lib/store';

interface Props {
  anime: TrackedAnime;
  onUpdate: () => void;
}

function StarRating({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);

  return (
    <div className="star-rating" title={value ? `Puntuación: ${value}/10` : 'Sin puntuar'}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <svg
          key={n}
          className={`star ${(hovered ?? value ?? 0) >= n ? (hovered ? 'hovered' : 'filled') : ''}`}
          viewBox="0 0 24 24"
          fill={(hovered ?? value ?? 0) >= n ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(value === n ? null : n)}
          style={{ cursor: 'pointer' }}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
      {value && (
        <span style={{ fontSize: '0.8rem', color: 'var(--status-on_hold)', fontWeight: 700, marginLeft: 4 }}>
          {value}/10
        </span>
      )}
    </div>
  );
}

function ProgressControl({ anime, onUpdate }: { anime: TrackedAnime; onUpdate: () => void }) {
  const isManga = anime.kind === 'manga';

  if (isManga) {
    const totalCaps = anime.totalChapters;
    const currentCap = anime.currentChapter ?? 0;
    const pctCap = totalCaps ? Math.min(100, (currentCap / totalCaps) * 100) : 0;

    const handleCapChange = (delta: number) => {
      const next = Math.max(0, currentCap + delta);
      if (totalCaps && next > totalCaps) return;
      updateChapter(anime.malId, next);
      onUpdate();
    };

    const handleVolChange = (delta: number) => {
      const currentVol = anime.currentVolume ?? 0;
      const next = Math.max(0, currentVol + delta);
      updateVolume(anime.malId, next);
      onUpdate();
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
        <div className="ep-controls">
          <button className="ep-btn" onClick={() => handleCapChange(-1)} disabled={currentCap <= 0} title="Capítulo anterior">−</button>
          <span className="ep-number">{currentCap}</span>
          <button className="ep-btn" onClick={() => handleCapChange(1)} disabled={!!totalCaps && currentCap >= totalCaps} title="Siguiente capítulo">+</button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>
            / {totalCaps ?? '?'} caps
          </span>
          {/* Quick volume indicator */}
          <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Vol. {anime.currentVolume ?? 0}{anime.totalVolumes ? `/${anime.totalVolumes}` : ''}
          </span>
        </div>
        {(totalCaps || currentCap > 0) && (
          <div className="ep-track">
            <div className="ep-fill" style={{ width: `${pctCap}%`, background: 'linear-gradient(90deg, #ec4899, #8b5cf6)' }} />
          </div>
        )}
      </div>
    );
  }

  // Anime Episode Control
  const total = anime.totalEpisodes;
  const current = anime.currentEpisode;
  const pct = total ? Math.min(100, (current / total) * 100) : 0;

  const handleChange = (delta: number) => {
    const next = Math.max(0, current + delta);
    if (total && next > total) return;
    updateEpisode(anime.malId, next, 'anime');
    onUpdate();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%' }}>
      <div className="ep-controls">
        <button className="ep-btn" onClick={() => handleChange(-1)} disabled={current <= 0} title="Episodio anterior">−</button>
        <span className="ep-number">{current}</span>
        <button className="ep-btn" onClick={() => handleChange(1)} disabled={!!total && current >= total} title="Siguiente episodio">+</button>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 4 }}>
          / {total ?? '?'} eps
        </span>
      </div>
      {(total || current > 0) && (
        <div className="ep-track">
          <div className="ep-fill" style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

export default function AnimeCard({ anime, onUpdate }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const [notes, setNotes] = useState(anime.notes);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const kind = anime.kind ?? 'anime';
  const isManga = kind === 'manga';

  const handleStatusChange = (status: AnimeStatus) => {
    updateStatus(anime.malId, status, kind);
    onUpdate();
  };

  const handleScoreChange = (score: number | null) => {
    updateScore(anime.malId, score, kind);
    onUpdate();
  };

  const handleNotesSave = () => {
    updateNotes(anime.malId, notes, kind);
    onUpdate();
  };

  const handleDelete = () => {
    removeAnime(anime.malId, kind);
    setShowDetail(false);
    onUpdate();
  };

  return (
    <>
      <div className="anime-card">
        {/* Cover */}
        <div className="card-cover-wrapper" onClick={() => setShowDetail(true)}>
          {anime.coverImage ? (
            <img src={anime.coverImage} alt={anime.title} className="card-cover-img" loading="lazy" />
          ) : (
            <div className="card-cover-placeholder">
              <span>{isManga ? '📖' : '🎌'}</span>
            </div>
          )}

          {/* Type / Kind badge */}
          <span
            className="card-type-badge"
            style={{
              background: isManga ? 'rgba(236, 72, 153, 0.85)' : 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {isManga ? '📖 Manga' : (anime.type || '🎬 Anime')}
          </span>

          {/* Status pill on cover */}
          <span
            className="status-badge"
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              fontSize: '0.68rem',
              padding: '2px 7px',
              backgroundColor: `rgba(0,0,0,0.65)`,
              border: `1px solid ${STATUS_COLORS[anime.status]}`,
              color: STATUS_COLORS[anime.status],
            }}
          >
            {getStatusLabel(anime.status, kind)}
          </span>

          {anime.malScore && (
            <div className="card-score-badge">
              ★ {anime.malScore.toFixed(1)}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="card-info">
          <h3
            className="card-title"
            title={anime.title}
            onClick={() => setShowDetail(true)}
            style={{ cursor: 'pointer' }}
          >
            {anime.title}
          </h3>

          {/* Quick status selector */}
          <select
            className="status-select"
            value={anime.status}
            onChange={(e) => handleStatusChange(e.target.value as AnimeStatus)}
            style={{ color: STATUS_COLORS[anime.status], borderColor: `${STATUS_COLORS[anime.status]}40` }}
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>
                {getStatusLabel(s, kind)}
              </option>
            ))}
          </select>

          {/* Episode / Chapter control */}
          <ProgressControl anime={anime} onUpdate={onUpdate} />

          {/* Star rating */}
          <div style={{ marginTop: 'auto', paddingTop: 4 }}>
            <StarRating value={anime.score} onChange={handleScoreChange} />
          </div>
        </div>
      </div>

      {/* Detail / Edit Modal */}
      {showDetail && (
        <div className="modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 540 }}>
            <div style={{ display: 'flex', gap: 16 }}>
              {anime.coverImage && (
                <img
                  src={anime.coverImage}
                  alt={anime.title}
                  style={{ width: 100, height: 140, objectFit: 'cover', borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isManga ? '#ec4899' : '#6366f1',
                      color: '#fff',
                    }}
                  >
                    {isManga ? 'Manga' : 'Anime'}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    MAL ID #{anime.malId}
                  </span>
                </div>
                <h2 style={{ fontSize: '1.05rem', fontWeight: 700, lineHeight: 1.3, marginBottom: 4 }}>
                  {anime.title}
                </h2>
                {anime.titleEnglish && anime.titleEnglish !== anime.title && (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 8 }}>
                    {anime.titleEnglish}
                  </p>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {anime.genres.map((g) => (
                    <span key={g} className="genre-tag">
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Status & Progress Form */}
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Estado
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {STATUS_ORDER.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleStatusChange(s)}
                      className="tab-btn"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        borderColor: anime.status === s ? STATUS_COLORS[s] : 'transparent',
                        color: anime.status === s ? STATUS_COLORS[s] : 'var(--text-secondary)',
                        background: anime.status === s ? `${STATUS_COLORS[s]}15` : 'var(--bg-glass)',
                      }}
                    >
                      {getStatusLabel(s, kind)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Progress */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  {isManga ? 'Progreso de Capítulos' : 'Progreso de Episodios'}
                </label>
                <ProgressControl anime={anime} onUpdate={onUpdate} />
              </div>

              {/* Personal Score */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Puntuación personal
                </label>
                <StarRating value={anime.score} onChange={handleScoreChange} />
              </div>

              {/* Notes */}
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                  Notas / Reseña personal
                </label>
                <textarea
                  className="input-search"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesSave}
                  rows={3}
                  placeholder="Escribe tus impresiones o comentarios..."
                  style={{ width: '100%', resize: 'vertical' }}
                />
              </div>

              {/* Synopsis if available */}
              {anime.synopsis && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Sinopsis
                  </label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, maxHeight: 100, overflowY: 'auto' }}>
                    {anime.synopsis}
                  </p>
                </div>
              )}

              {/* Danger Zone */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {!confirmDelete ? (
                  <button
                    className="btn btn-ghost"
                    style={{ color: 'var(--status-dropped)', fontSize: '0.8rem' }}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Eliminar de mi lista
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-danger" style={{ fontSize: '0.8rem', padding: '6px 12px' }} onClick={handleDelete}>
                      Confirmar eliminar
                    </button>
                    <button className="btn btn-ghost" style={{ fontSize: '0.8rem' }} onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </button>
                  </div>
                )}
                <button className="btn btn-secondary" onClick={() => setShowDetail(false)}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
