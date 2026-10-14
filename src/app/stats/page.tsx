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
  const totalTracked = stats.totalAnimes;

  return (
    <>
      <Navbar />
      <main className="page-wrapper">
        <div className="page-header">
          <h1 className="page-title">Mis Estadísticas</h1>
          <p className="page-subtitle">Un vistazo a tu actividad de anime y manga</p>
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
            <div className="empty-subtitle">Añade o importa animes y mangas para ver tus métricas completas aquí.</div>
            <a href="/search" className="btn btn-primary" style={{ marginTop: 12 }}>Buscar anime o manga</a>
          </div>
        ) : (
          <>
            {/* Overview stats */}
            <div className="stats-grid">
              <StatCard
                icon={<span style={{ fontSize: '1.2rem' }}>🎬</span>}
                value={String(stats.totalAnime)}
                label="Animes en lista"
              />
              <StatCard
                icon={<span style={{ fontSize: '1.2rem' }}>📖</span>}
                value={String(stats.totalManga)}
                label="Mangas en lista"
              />
              <StatCard
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>}
                value={stats.totalEpisodesWatched.toLocaleString()}
                label="Episodios vistos"
              />
              <StatCard
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>}
                value={`${stats.totalHoursWatched.toLocaleString()}h`}
                label="Horas de anime"
              />
              <StatCard
                icon={<span style={{ fontSize: '1.2rem' }}>📑</span>}
                value={stats.totalChaptersRead.toLocaleString()}
                label="Capítulos leídos"
              />
              <StatCard
                icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>}
                value={stats.averageScore !== null ? `${stats.averageScore}/10` : '—'}
                label="Puntuación media"
              />
            </div>

            {/* Status distribution */}
            <div className="divider" />
            <div>
              <div className="section-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/>
                </svg>
                Distribución por estado (Global)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {STATUS_ORDER.map((s) => {
                  const count = stats.byStatus[s];
                  const pct = totalTracked > 0 ? Math.round((count / totalTracked) * 100) : 0;
                  return (
                    <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ width: 90, fontSize: '0.85rem', color: STATUS_COLORS[s], fontWeight: 600 }}>
                        {STATUS_LABELS[s]}
                      </span>
                      <div style={{ flex: 1, height: 8, background: 'var(--bg-glass)', borderRadius: 99, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: STATUS_COLORS[s],
                            borderRadius: 99,
                            transition: 'width 0.5s ease',
                          }}
                        />
                      </div>
                      <span style={{ width: 60, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                        {count} ({pct}%)
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Score distribution + Top genres */}
            <div className="divider" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
              {/* Top Genres */}
              <div>
                <div className="section-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                  </svg>
                  Géneros favoritos
                </div>
                {stats.topGenres.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {stats.topGenres.map(({ genre, count }) => {
                      const pct = Math.round((count / maxGenre) * 100);
                      return (
                        <div key={genre} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{ width: 110, fontSize: '0.82rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {genre}
                          </span>
                          <div style={{ flex: 1, height: 6, background: 'var(--bg-glass)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', width: 24, textAlign: 'right' }}>
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sin datos de géneros todavía.</p>
                )}
              </div>

              {/* Score Distribution */}
              <div>
                <div className="section-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                  </svg>
                  Distribución de puntuaciones
                </div>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120, paddingTop: 10 }}>
                  {stats.scoreDist.map(({ score, count }) => {
                    const heightPct = count > 0 ? Math.max(12, Math.round((count / maxScore) * 100)) : 4;
                    return (
                      <div key={score} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: '0.68rem', color: count > 0 ? 'var(--text-primary)' : 'transparent' }}>
                          {count}
                        </span>
                        <div
                          style={{
                            width: '100%',
                            height: `${heightPct}%`,
                            background: count > 0 ? 'var(--primary)' : 'var(--bg-glass)',
                            borderRadius: '3px 3px 0 0',
                            transition: 'height 0.3s ease',
                          }}
                        />
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {score}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
