'use client';

import { useState } from 'react';
import { TrackedAnime, AnimeStatus, STATUS_ORDER, getStatusLabel, STATUS_COLORS } from '@/lib/types';
import {
  updateEpisode,
  updateChapter,
  updateVolume,
  updateScore,
  updateStatus,
  updateNotes,
  removeAnime,
  toggleFavoriteMedia,
  isFavoriteMedia,
} from '@/lib/store';

interface Props {
  anime: TrackedAnime;
  onUpdate: () => void;
}

const SCORE_LABELS: Record<number, string> = {
  10: 'Obra maestra (10)',
  9: 'Increíble (9)',
  8: 'Muy bueno (8)',
  7: 'Bueno (7)',
  6: 'Decente (6)',
  5: 'Regular (5)',
  4: 'Malo (4)',
  3: 'Muy malo (3)',
  2: 'Horrible (2)',
  1: 'Desastroso (1)',
};

function StarRatingWidget({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const currentVal = hovered ?? value ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onChange(value === n ? null : n)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 2px',
              color: currentVal >= n ? '#fbbf24' : 'rgba(255, 255, 255, 0.2)',
              transition: 'transform 0.15s, color 0.15s',
              transform: currentVal >= n ? 'scale(1.15)' : 'scale(1)',
            }}
            title={`${n}/10 - ${SCORE_LABELS[n]}`}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={currentVal >= n ? '#fbbf24' : 'none'} stroke="currentColor" strokeWidth="2">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
        ))}

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            style={{
              marginLeft: 8,
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              padding: '2px 8px',
              borderRadius: 4,
              cursor: 'pointer',
            }}
          >
            Quitar
          </button>
        )}
      </div>

      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: currentVal > 0 ? '#fbbf24' : 'var(--text-muted)' }}>
        {currentVal > 0 ? `★ ${SCORE_LABELS[currentVal]}` : 'Sin puntuar — Selecciona de 1 a 10 estrellas'}
      </div>
    </div>
  );
}

export default function AnimeCard({ anime, onUpdate }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const [notes, setNotes] = useState(anime.notes);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const kind = anime.kind ?? 'anime';
  const isManga = kind === 'manga';
  const [isFav, setIsFav] = useState(() => isFavoriteMedia(anime.malId, isManga ? 'manga' : 'anime'));

  const totalUnits = isManga ? anime.totalChapters : anime.totalEpisodes;
  const currentUnits = isManga ? (anime.currentChapter ?? 0) : anime.currentEpisode;
  const progressPct = totalUnits ? Math.min(100, Math.round((currentUnits / totalUnits) * 100)) : 0;

  const handleStepProgress = (e: React.MouseEvent, delta: number) => {
    e.stopPropagation();
    if (isManga) {
      const next = Math.max(0, currentUnits + delta);
      if (totalUnits && next > totalUnits) return;
      updateChapter(anime.malId, next);
    } else {
      const next = Math.max(0, currentUnits + delta);
      if (totalUnits && next > totalUnits) return;
      updateEpisode(anime.malId, next, 'anime');
    }
    onUpdate();
  };

  const handleSetExactProgress = (val: number) => {
    const next = Math.max(0, val);
    if (isManga) {
      updateChapter(anime.malId, next);
    } else {
      updateEpisode(anime.malId, next, 'anime');
    }
    onUpdate();
  };

  const handleQuickComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (totalUnits) {
      handleSetExactProgress(totalUnits);
    } else {
      updateStatus(anime.malId, 'completed', kind);
      onUpdate();
    }
  };

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

  const statusColor = STATUS_COLORS[anime.status] || '#6366f1';

  return (
    <>
      {/* ─── POSTER GRID CARD (Modern Anime Tracker Style) ─── */}
      <div
        className="poster-card"
        onClick={() => setShowDetail(true)}
        style={{
          background: 'rgba(21, 26, 43, 0.75)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          cursor: 'pointer',
          transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.2s, box-shadow 0.2s',
          position: 'relative',
        }}
      >
        {/* Cover Poster with Overlay */}
        <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', background: '#0d111d', overflow: 'hidden' }}>
          {anime.coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={anime.coverImage}
              alt={anime.title}
              loading="lazy"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.3s ease',
              }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <span style={{ fontSize: '2.5rem', marginBottom: 4 }}>{isManga ? '📖' : '🎬'}</span>
              <span style={{ fontSize: '0.75rem' }}>Sin portada</span>
            </div>
          )}

          {/* Top Status Pill */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: 8,
              background: 'rgba(10, 13, 20, 0.85)',
              backdropFilter: 'blur(8px)',
              border: `1px solid ${statusColor}`,
              color: statusColor,
              borderRadius: 9999,
              padding: '3px 9px',
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.03em',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            }}
          >
            {getStatusLabel(anime.status, kind)}
          </div>

          {/* Top Score Badge if rated or community */}
          {(anime.score || anime.malScore) && (
            <div
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                background: 'rgba(10, 13, 20, 0.85)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                color: '#fbbf24',
                borderRadius: 9999,
                padding: '3px 8px',
                fontSize: '0.72rem',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              }}
            >
              <span>★</span>
              <span>{anime.score ? `${anime.score}/10` : (anime.malScore?.toFixed(1) ?? '')}</span>
            </div>
          )}

          {/* Bottom Shadow Gradient */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '45%',
              background: 'linear-gradient(to top, rgba(15, 19, 32, 0.95) 0%, transparent 100%)',
            }}
          />

          {/* Media format chip on cover */}
          <div
            style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              background: isManga ? 'rgba(236, 72, 153, 0.85)' : 'rgba(99, 102, 241, 0.85)',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 700,
              padding: '2px 7px',
              borderRadius: 4,
            }}
          >
            {isManga ? 'MANGA' : (anime.type || 'TV')}
          </div>
        </div>

        {/* Info & Controls Body */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          <h3
            title={anime.title}
            style={{
              fontSize: '0.9rem',
              fontWeight: 700,
              color: '#fff',
              lineHeight: 1.3,
              marginBottom: 8,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              minHeight: '2.4em',
            }}
          >
            {anime.title}
          </h3>

          {/* Progress Section */}
          <div style={{ marginTop: 'auto', paddingTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                {isManga ? 'Capítulos:' : 'Episodios:'}
              </span>

              {/* Progress Stepper Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  className="ep-btn"
                  onClick={(e) => handleStepProgress(e, -1)}
                  disabled={currentUnits <= 0}
                  title="Restar 1"
                  style={{ width: 24, height: 24, borderRadius: 4 }}
                >
                  −
                </button>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#fff', minWidth: 42, textAlign: 'center' }}>
                  {currentUnits} / {totalUnits ?? '?'}
                </span>
                <button
                  type="button"
                  className="ep-btn"
                  onClick={(e) => handleStepProgress(e, 1)}
                  disabled={!!totalUnits && currentUnits >= totalUnits}
                  title="Sumar 1"
                  style={{ width: 24, height: 24, borderRadius: 4, background: 'var(--primary)', color: '#fff', border: 'none' }}
                >
                  +
                </button>
              </div>
            </div>

            {/* Progress track */}
            <div style={{ width: '100%', height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: isManga ? 'linear-gradient(90deg, #ec4899, #f43f5e)' : 'var(--grad-accent)',
                  borderRadius: 99,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── REAL FIXED CENTERED MODAL DIALOG ─── */}
      {showDetail && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetail(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            className="modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#131728',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              borderRadius: 'var(--r-xl)',
              width: '100%',
              maxWidth: 580,
              maxHeight: '88vh',
              overflowY: 'auto',
              boxShadow: '0 25px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(99, 102, 241, 0.2)',
              padding: 24,
              color: 'var(--text-primary)',
            }}
          >
            {/* Header with Cover & Title */}
            <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              {anime.coverImage && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={anime.coverImage}
                  alt={anime.title}
                  style={{
                    width: 110,
                    height: 155,
                    objectFit: 'cover',
                    borderRadius: 'var(--r-md)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                    flexShrink: 0,
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: 4,
                        background: isManga ? '#ec4899' : '#6366f1',
                        color: '#fff',
                      }}
                    >
                      {isManga ? 'MANGA' : 'ANIME'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      MAL #{anime.malId}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {/* Favorite Heart Toggle */}
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = toggleFavoriteMedia({
                          id: anime.id,
                          malId: anime.malId,
                          title: anime.title,
                          image: anime.coverImage,
                          kind: isManga ? 'manga' : 'anime',
                          score: anime.score,
                        });
                        setIsFav(nextState);
                      }}
                      style={{
                        background: isFav ? 'rgba(236, 72, 153, 0.25)' : 'rgba(255, 255, 255, 0.08)',
                        border: isFav ? '1px solid #ec4899' : '1px solid rgba(255, 255, 255, 0.18)',
                        color: isFav ? '#f472b6' : '#cbd5e1',
                        borderRadius: 8,
                        padding: '4px 10px',
                        cursor: 'pointer',
                        fontSize: '0.76rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        transition: 'all 0.2s',
                      }}
                      title={isFav ? 'Quitar de Favoritos (Top 10)' : 'Marcar como Favorito (Top 10)'}
                    >
                      <span>{isFav ? '💖' : '🤍'}</span>
                      <span>{isFav ? 'En Favoritos' : 'Añadir a Favoritos'}</span>
                    </button>

                    {/* High Contrast Close "X" Button */}
                    <button
                      type="button"
                      onClick={() => setShowDetail(false)}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: '#ffffff',
                        borderRadius: '50%',
                        width: 32,
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        fontSize: '1rem',
                        fontWeight: 700,
                        transition: 'all 0.2s',
                      }}
                      title="Cerrar ventana"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#fff', lineHeight: 1.3, marginBottom: 4 }}>
                  {anime.title}
                </h2>
                {anime.titleEnglish && anime.titleEnglish !== anime.title && (
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
                    {anime.titleEnglish}
                  </p>
                )}

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
                  {anime.genres.slice(0, 4).map((g) => (
                    <span
                      key={g}
                      style={{
                        fontSize: '0.7rem',
                        background: 'rgba(255, 255, 255, 0.07)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        padding: '2px 8px',
                        borderRadius: 9999,
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Separator */}
            <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.08)', margin: '18px 0' }} />

            {/* Controls Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Status Picker Pills */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  Estado de seguimiento
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {STATUS_ORDER.map((s) => {
                    const isActive = anime.status === s;
                    const c = STATUS_COLORS[s];
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleStatusChange(s)}
                        style={{
                          padding: '7px 14px',
                          borderRadius: 'var(--r-full)',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          border: `1.5px solid ${isActive ? c : 'rgba(255,255,255,0.12)'}`,
                          background: isActive ? `${c}22` : 'rgba(255,255,255,0.04)',
                          color: isActive ? c : 'var(--text-secondary)',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {getStatusLabel(s, kind)}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Progress Stepper & Direct Input */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>
                  {isManga ? 'Capítulos leídos' : 'Episodios vistos'}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ width: 36, height: 36, padding: 0, fontSize: '1.2rem', fontWeight: 700 }}
                    onClick={(e) => handleStepProgress(e, -1)}
                    disabled={currentUnits <= 0}
                  >
                    −
                  </button>

                  <input
                    type="number"
                    min="0"
                    max={totalUnits ?? 9999}
                    value={currentUnits}
                    onChange={(e) => handleSetExactProgress(parseInt(e.target.value) || 0)}
                    style={{
                      width: 80,
                      height: 38,
                      textAlign: 'center',
                      fontSize: '1rem',
                      fontWeight: 700,
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 'var(--r-md)',
                      color: '#fff',
                    }}
                  />

                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                    de {totalUnits ?? '∞'} {isManga ? 'capítulos' : 'episodios'}
                  </span>

                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ width: 36, height: 36, padding: 0, fontSize: '1.2rem', fontWeight: 700 }}
                    onClick={(e) => handleStepProgress(e, 1)}
                    disabled={!!totalUnits && currentUnits >= totalUnits}
                  >
                    +
                  </button>

                  {totalUnits && currentUnits < totalUnits && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={handleQuickComplete}
                      style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: '0.78rem' }}
                    >
                      ✓ Marcar todo visto
                    </button>
                  )}
                </div>
              </div>

              {/* Personal Score Rating Widget */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Mi calificación
                </label>
                <StarRatingWidget value={anime.score} onChange={handleScoreChange} />
              </div>

              {/* Personal Notes */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>
                  Notas / Reseña personal
                </label>
                <textarea
                  className="input-search"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={handleNotesSave}
                  rows={3}
                  placeholder="Escribe tus impresiones, capítulos favoritos o recordatorios..."
                  style={{ width: '100%', height: 'auto', padding: '10px 14px', resize: 'vertical' }}
                />
              </div>

              {/* Synopsis if present */}
              {anime.synopsis && (
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    Sinopsis
                  </label>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5, maxHeight: 90, overflowY: 'auto' }}>
                    {anime.synopsis}
                  </p>
                </div>
              )}

              {/* Modal Footer with High-Contrast Action Buttons */}
              <div
                style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                  paddingTop: 16,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                {!confirmDelete ? (
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--status-dropped)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      opacity: 0.8,
                    }}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Eliminar de mi lista
                  </button>
                ) : (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}>
                      Confirmar
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
                      Cancelar
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#ffffff',
                      border: '1px solid rgba(255, 255, 255, 0.25)',
                      padding: '8px 20px',
                      fontWeight: 600,
                    }}
                    onClick={() => setShowDetail(false)}
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '8px 22px' }}
                    onClick={() => {
                      handleNotesSave();
                      setShowDetail(false);
                    }}
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
