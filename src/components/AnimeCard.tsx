'use client';

import { useState, useCallback } from 'react';
import { TrackedAnime, AnimeStatus, STATUS_LABELS, STATUS_ORDER } from '@/lib/types';
import { updateEpisode, updateScore, updateStatus, updateNotes, removeAnime } from '@/lib/store';

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

function EpisodeControl({ anime, onUpdate }: { anime: TrackedAnime; onUpdate: () => void }) {
  const total = anime.totalEpisodes;
  const current = anime.currentEpisode;
  const pct = total ? Math.min(100, (current / total) * 100) : 0;

  const handleChange = useCallback(
    (delta: number) => {
      const next = Math.max(0, current + delta);
      if (total && next > total) return;
      updateEpisode(anime.malId, next);
      onUpdate();
    },
    [anime.malId, current, total, onUpdate]
  );

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

  const handleStatusChange = (status: AnimeStatus) => {
    updateStatus(anime.malId, status);
    onUpdate();
  };

  const handleScoreChange = (score: number | null) => {
    updateScore(anime.malId, score);
    onUpdate();
  };

  const handleNotesSave = () => {
    updateNotes(anime.malId, notes);
    onUpdate();
  };

  const handleDelete = () => {
    removeAnime(anime.malId);
    setShowDetail(false);
    onUpdate();
  };

  const displayTitle = anime.titleEnglish || anime.title;

  return (
    <>
      <div className="anime-card" data-status={anime.status}>
        {/* Cover */}
        {anime.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={anime.coverImage}
            alt={displayTitle}
            className="anime-card-cover"
            onClick={() => setShowDetail(true)}
            style={{ cursor: 'pointer' }}
          />
        ) : (
          <div className="anime-card-cover" style={{ background: 'var(--bg-elevated)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }} onClick={() => setShowDetail(true)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}

        {/* Info */}
        <div style={{ overflow: 'hidden' }}>
          <div
            className="anime-card-title"
            onClick={() => setShowDetail(true)}
            style={{ cursor: 'pointer' }}
          >
            {displayTitle}
          </div>
          {anime.title !== displayTitle && (
            <div className="text-xs text-muted" style={{ marginBottom: 4 }}>{anime.title}</div>
          )}
          <div className="anime-card-meta">
            <span className="status-badge" data-status={anime.status}>
              {STATUS_LABELS[anime.status]}
            </span>
            {anime.type && <span className="chip">{anime.type}</span>}
            {anime.year && <span className="chip">{anime.year}</span>}
            {anime.malScore && (
              <span className="chip" title="Puntuación de MyAnimeList">
                ⭐ {anime.malScore.toFixed(1)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="anime-card-actions">
          {/* Status select */}
          <select
            className="form-select"
            value={anime.status}
            onChange={(e) => handleStatusChange(e.target.value as AnimeStatus)}
            title="Cambiar estado"
          >
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </select>

          {/* Episode control */}
          <EpisodeControl anime={anime} onUpdate={onUpdate} />

          {/* Score */}
          <StarRating value={anime.score} onChange={handleScoreChange} />
        </div>
      </div>

      {/* Detail Modal */}
      {showDetail && (
        <div className="modal-backdrop" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title" style={{ fontSize: '1rem' }}>{displayTitle}</div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDetail(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                {/* Cover */}
                <div>
                  {anime.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={anime.coverImage} alt={displayTitle} className="detail-cover" />
                  ) : (
                    <div className="detail-cover" style={{ background: 'var(--bg-elevated)' }} />
                  )}
                </div>

                {/* Meta */}
                <div>
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">Estado</span>
                    <select
                      className="form-select"
                      value={anime.status}
                      onChange={(e) => handleStatusChange(e.target.value as AnimeStatus)}
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">Tipo</span>
                    <span className="detail-meta-value">{anime.type || '—'}</span>
                  </div>
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">Episodios</span>
                    <span className="detail-meta-value">{anime.currentEpisode} / {anime.totalEpisodes ?? '?'}</span>
                  </div>
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">Año</span>
                    <span className="detail-meta-value">{anime.year ?? '—'}</span>
                  </div>
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">Duración</span>
                    <span className="detail-meta-value">{anime.duration ? `${anime.duration} min` : '—'}</span>
                  </div>
                  <div className="detail-meta-row">
                    <span className="detail-meta-label">Score MAL</span>
                    <span className="detail-meta-value">{anime.malScore ? `${anime.malScore.toFixed(1)} / 10` : '—'}</span>
                  </div>
                  <div className="detail-meta-row" style={{ borderBottom: 'none' }}>
                    <span className="detail-meta-label">Mi puntuación</span>
                    <div>
                      <StarRating value={anime.score} onChange={handleScoreChange} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Genres */}
              {anime.genres.length > 0 && (
                <div className="mt-4">
                  <div className="text-xs text-muted" style={{ marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Géneros</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {anime.genres.map((g) => <span key={g} className="chip">{g}</span>)}
                  </div>
                </div>
              )}

              {/* Synopsis */}
              {anime.synopsis && (
                <div className="mt-4">
                  <div className="text-xs text-muted" style={{ marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sinopsis</div>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxHeight: 120, overflow: 'auto' }}>
                    {anime.synopsis.replace(/<[^>]+>/g, '')}
                  </p>
                </div>
              )}

              {/* Notes */}
              <div className="mt-4">
                <div className="text-xs text-muted" style={{ marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Mis notas</div>
                <textarea
                  className="form-input form-textarea"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Agrega notas personales..."
                  rows={3}
                />
                <button className="btn btn-ghost btn-sm mt-2" onClick={handleNotesSave}>
                  Guardar notas
                </button>
              </div>

              {/* Episode control */}
              <div className="mt-4">
                <div className="text-xs text-muted" style={{ marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progreso</div>
                <EpisodeControl anime={anime} onUpdate={onUpdate} />
              </div>
            </div>

            <div className="modal-footer">
              {confirmDelete ? (
                <>
                  <span style={{ fontSize: '0.83rem', color: 'var(--status-dropped)', flex: 1 }}>¿Eliminar de tu lista?</span>
                  <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Cancelar</button>
                  <button className="btn btn-danger btn-sm" onClick={handleDelete}>Sí, eliminar</button>
                </>
              ) : (
                <>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(true)}>
                    Eliminar
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowDetail(false)}>Cerrar</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
