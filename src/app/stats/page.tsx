'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import { computeStats } from '@/lib/store';
import { STATUS_LABELS, STATUS_ORDER, STATUS_COLORS } from '@/lib/types';
import type { AnimeStats } from '@/lib/store';

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="stat-card">
      <div className="stat-icon">{icon}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<AnimeStats | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStats(computeStats());
  }, []);

  if (!mounted || !stats) return null;

  const maxGenre = stats.topGenres[0]?.count ?? 1;
  const maxScore = Math.max(...stats.scoreDist.map((s) => s.count), 1);

  const totalTracked = STATUS_ORDER.reduce((sum, s) => sum + stats.byStatus[s], 0);

  return (
    <>
      <Navbar />
      <main className="page-wrapper">
        <div className="page-header">
          <h1 className="page-title">Mis Estadísticas</h1>
          <p className="page-subtitle">Un vistazo a tu actividad de anime</p>
        </div>

        {stats.totalAnimes === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div className="empty-title">Aún no hay estadísticas</div>
            <div className="empty-subtitle">Añade animes a tu lista para ver tus estadísticas aquí.</div>
            <a href="/search" className="btn btn-primary">Buscar anime</a>
          </div>
        ) : (
          <>
            {/* Overview stats */}
            <div className="stats-grid">
              <StatCard
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>}
                value={String(stats.totalAnimes)}
                label="Animes en lista"
              />
              <StatCard
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>}
                value={stats.totalEpisodesWatched.toLocaleString()}
                label="Episodios vistos"
              />
              <StatCard
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                value={`${stats.totalHoursWatched.toLocaleString()}h`}
                label="Horas vistas"
              />
              <StatCard
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                value={stats.averageScore !== null ? `${stats.averageScore}/10` : '—'}
                label="Puntuación media"
              />
              <StatCard
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>}
                value={`${stats.completionRate}%`}
                label="Tasa de completado"
              />
              <StatCard
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>}
                value={String(stats.meanEpisodesPerAnime)}
                label="Media eps/anime"
              />
            </div>

            {/* Status distribution */}
            <div className="divider" />
            <div>
              <div className="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/>
                </svg>
                Distribución por estado
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {STATUS_ORDER.map((s) => {
                  const count = stats.byStatus[s] ?? 0;
                  const pct = totalTracked > 0 ? (count / totalTracked) * 100 : 0;
                  return (
                    <div key={s} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 60px', gap: 12, alignItems: 'center' }}>
                      <span className="status-badge" data-status={s}>{STATUS_LABELS[s]}</span>
                      <div className="ep-track" style={{ height: 10 }}>
                        <div
                          className="ep-fill"
                          style={{ width: `${pct}%`, background: STATUS_COLORS[s], transition: 'width 0.8s var(--ease-out)' }}
                        />
                      </div>
                      <span style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', textAlign: 'right' }}>
                        {count} <span style={{ color: 'var(--text-muted)' }}>({Math.round(pct)}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Top genres */}
            {stats.topGenres.length > 0 && (
              <>
                <div className="divider" />
                <div>
                  <div className="section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/>
                    </svg>
                    Géneros favoritos
                  </div>
                  <div className="genre-bar-wrap">
                    {stats.topGenres.map(({ genre, count }) => (
                      <div className="genre-bar-row" key={genre}>
                        <span className="genre-name truncate">{genre}</span>
                        <div className="genre-bar-track">
                          <div
                            className="genre-bar-fill"
                            style={{ width: `${(count / maxGenre) * 100}%` }}
                          />
                        </div>
                        <span className="genre-count">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Score distribution */}
            {stats.averageScore !== null && (
              <>
                <div className="divider" />
                <div>
                  <div className="section-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    Distribución de puntuaciones
                  </div>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: 20 }}>
                    <div className="score-bars">
                      {stats.scoreDist.map(({ score, count }) => (
                        <div className="score-bar-col" key={score}>
                          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>
                            {count > 0 ? count : ''}
                          </span>
                          <div
                            className="score-bar-fill"
                            style={{
                              height: `${Math.max((count / maxScore) * 80, count > 0 ? 8 : 2)}px`,
                              opacity: count > 0 ? 1 : 0.2,
                            }}
                          />
                          <span className="score-bar-label">{score}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Puntuación (1–10)
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}
