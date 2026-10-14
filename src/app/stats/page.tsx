'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { computeStats } from '@/lib/store';
import { STATUS_LABELS, STATUS_ORDER, STATUS_COLORS } from '@/lib/types';
import type { AnimeStats, StatScope } from '@/lib/store';
import FavoritesSection from '@/components/FavoritesSection';

export default function StatsPage() {
  const [scope, setScope] = useState<StatScope>('all');
  const [stats, setStats] = useState<AnimeStats | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStats(computeStats(scope));
  }, [scope]);

  if (!mounted || !stats) return null;

  const maxGenreCount = stats.topGenres[0]?.count ?? 1;
  const maxScoreCount = Math.max(...stats.scoreDist.map((s) => s.count), 1);
  const totalTracked = stats.activeTotal;

  return (
    <>
      <Navbar />
      <main className="page-wrapper">
        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: 20 }}>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ background: 'linear-gradient(135deg, #a78bfa, #60a5fa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Panel de Estadísticas
            </span>
          </h1>
          <p className="page-subtitle">
            Análisis detallado de tu consumo, hábitos de visualización y biblioteca personal
          </p>
        </div>

        {stats.totalAnimes === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div className="empty-title">Aún no hay estadísticas registradas</div>
            <div className="empty-subtitle">Importa tu lista de MyAnimeList o añade títulos desde el buscador para desbloquear tu dashboard.</div>
            <a href="/search" className="btn btn-primary" style={{ marginTop: 14 }}>
              Buscar anime o manga
            </a>
          </div>
        ) : (
          <>
            {/* Otaku Profile Hero Banner */}
            <div className="stats-hero-banner">
              <div className="stats-hero-user">
                <div className="stats-hero-avatar">
                  <Image
                    src="/images/logo.png"
                    alt="AniTrack Avatar"
                    width={58}
                    height={58}
                    style={{ objectFit: 'cover' }}
                    priority
                  />
                </div>
                <div>
                  <div className="stats-hero-title">
                    {stats.otakuTitle}
                    <span className="stats-rank-tag">{stats.otakuRank}</span>
                  </div>
                  <div className="stats-hero-sub">
                    {scope === 'all' && `Biblioteca global: ${stats.totalAnimes.toLocaleString()} obras totales en tu registro`}
                    {scope === 'anime' && `Explorando tu catálogo de ${stats.totalAnime.toLocaleString()} series y películas de anime`}
                    {scope === 'manga' && `Explorando tu biblioteca de ${stats.totalManga.toLocaleString()} mangas y novelas ligeras`}
                  </div>
                </div>
              </div>

              <div className="stats-hero-pills">
                <div className="stats-hero-stat-pill">
                  <strong>{stats.totalDaysWatched}d</strong>
                  <span>Días de anime</span>
                </div>
                <div className="stats-hero-stat-pill">
                  <strong>{stats.averageScore ? `${stats.averageScore} ★` : '—'}</strong>
                  <span>Media general</span>
                </div>
                <div className="stats-hero-stat-pill">
                  <strong>{stats.completionRate}%</strong>
                  <span>Completado</span>
                </div>
              </div>
            </div>

            {/* Scope Switcher Tabs */}
            <div className="stats-scope-switcher">
              <button
                className={`stats-scope-btn ${scope === 'all' ? 'active' : ''}`}
                onClick={() => setScope('all')}
              >
                <span>🌟</span> Resumen Global
                <span style={{ opacity: 0.7, fontSize: '0.78rem' }}>({stats.totalAnimes})</span>
              </button>
              <button
                className={`stats-scope-btn ${scope === 'anime' ? 'active' : ''}`}
                onClick={() => setScope('anime')}
              >
                <span>🎬</span> Solo Anime
                <span style={{ opacity: 0.7, fontSize: '0.78rem' }}>({stats.totalAnime})</span>
              </button>
              <button
                className={`stats-scope-btn ${scope === 'manga' ? 'active' : ''}`}
                onClick={() => setScope('manga')}
              >
                <span>📖</span> Solo Manga
                <span style={{ opacity: 0.7, fontSize: '0.78rem' }}>({stats.totalManga})</span>
              </button>
            </div>

            {/* KPI Cards Grid */}
            <div className="stats-kpi-grid">
              {scope === 'all' ? (
                <>
                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #6366f1, #818cf8)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">🎬</div>
                      <span className="stats-kpi-badge">{stats.totalAnimes > 0 ? Math.round((stats.totalAnime / stats.totalAnimes) * 100) : 0}% biblioteca</span>
                    </div>
                    <div className="stats-kpi-value">{stats.totalAnime.toLocaleString()}</div>
                    <div className="stats-kpi-label">Animes en lista</div>
                    <div className="stats-kpi-sub">Series, películas y OVAs</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #ec4899, #f472b6)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">📖</div>
                      <span className="stats-kpi-badge">{stats.totalAnimes > 0 ? Math.round((stats.totalManga / stats.totalAnimes) * 100) : 0}% biblioteca</span>
                    </div>
                    <div className="stats-kpi-value">{stats.totalManga.toLocaleString()}</div>
                    <div className="stats-kpi-label">Mangas en lista</div>
                    <div className="stats-kpi-sub">Mangas, manhwas y novelas</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #38bdf8, #60a5fa)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">⏱️</div>
                      <span className="stats-kpi-badge">{stats.totalHoursWatched.toLocaleString()}h</span>
                    </div>
                    <div className="stats-kpi-value">{stats.totalDaysWatched} días</div>
                    <div className="stats-kpi-label">Tiempo invertido</div>
                    <div className="stats-kpi-sub">{stats.totalEpisodesWatched.toLocaleString()} episodios vistos</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #a78bfa, #c084fc)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">📑</div>
                      <span className="stats-kpi-badge">{stats.totalVolumesRead} vols</span>
                    </div>
                    <div className="stats-kpi-value">{stats.totalChaptersRead.toLocaleString()}</div>
                    <div className="stats-kpi-label">Capítulos leídos</div>
                    <div className="stats-kpi-sub">De tu colección manga</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #fbbf24, #f59e0b)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">⭐</div>
                      <span className="stats-kpi-badge">{stats.bestRatedCount} top (9-10)</span>
                    </div>
                    <div className="stats-kpi-value">{stats.averageScore ? `${stats.averageScore}/10` : '—'}</div>
                    <div className="stats-kpi-label">Puntuación media</div>
                    <div className="stats-kpi-sub">Moda: {stats.mostFrequentScore ? `${stats.mostFrequentScore.score} ★` : '—'}</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #34d399, #10b981)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">🎯</div>
                      <span className="stats-kpi-badge">{stats.byStatus.completed} obras</span>
                    </div>
                    <div className="stats-kpi-value">{stats.completionRate}%</div>
                    <div className="stats-kpi-label">Tasa de finalización</div>
                    <div className="stats-kpi-sub">Obras empezadas vs terminadas</div>
                  </div>
                </>
              ) : scope === 'anime' ? (
                <>
                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #6366f1, #818cf8)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">🎬</div>
                      <span className="stats-kpi-badge">Anime</span>
                    </div>
                    <div className="stats-kpi-value">{stats.totalAnime.toLocaleString()}</div>
                    <div className="stats-kpi-label">Animes registrados</div>
                    <div className="stats-kpi-sub">{stats.byStatus.watching} en emisión/viendo</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #38bdf8, #60a5fa)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">⏱️</div>
                      <span className="stats-kpi-badge">{stats.totalDaysWatched} días</span>
                    </div>
                    <div className="stats-kpi-value">{stats.totalHoursWatched.toLocaleString()}h</div>
                    <div className="stats-kpi-label">Horas reproducidas</div>
                    <div className="stats-kpi-sub">Equivale a {stats.totalDaysWatched} días completos</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #a78bfa, #8b5cf6)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">🍿</div>
                      <span className="stats-kpi-badge">Episodios</span>
                    </div>
                    <div className="stats-kpi-value">{stats.totalEpisodesWatched.toLocaleString()}</div>
                    <div className="stats-kpi-label">Episodios vistos</div>
                    <div className="stats-kpi-sub">~{stats.meanEpisodesPerAnime} eps de promedio por serie</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #fbbf24, #f59e0b)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">⭐</div>
                      <span className="stats-kpi-badge">{stats.bestRatedCount} joyas (9-10)</span>
                    </div>
                    <div className="stats-kpi-value">{stats.averageScore ? `${stats.averageScore}/10` : '—'}</div>
                    <div className="stats-kpi-label">Nota media anime</div>
                    <div className="stats-kpi-sub">Nota más común: {stats.mostFrequentScore?.score ?? '—'} ★</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #34d399, #10b981)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">🎯</div>
                      <span className="stats-kpi-badge">{stats.byStatus.completed} terminados</span>
                    </div>
                    <div className="stats-kpi-value">{stats.completionRate}%</div>
                    <div className="stats-kpi-label">Tasa de finalización</div>
                    <div className="stats-kpi-sub">{stats.byStatus.dropped} abandonados</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #f43f5e, #e11d48)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">📌</div>
                      <span className="stats-kpi-badge">Backlog</span>
                    </div>
                    <div className="stats-kpi-value">{stats.byStatus.planned.toLocaleString()}</div>
                    <div className="stats-kpi-label">Por ver (Planeados)</div>
                    <div className="stats-kpi-sub">En lista de espera</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #ec4899, #f472b6)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">📖</div>
                      <span className="stats-kpi-badge">Manga</span>
                    </div>
                    <div className="stats-kpi-value">{stats.totalManga.toLocaleString()}</div>
                    <div className="stats-kpi-label">Mangas registrados</div>
                    <div className="stats-kpi-sub">{stats.byStatus.watching} leyendo activamente</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #a78bfa, #c084fc)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">📑</div>
                      <span className="stats-kpi-badge">Capítulos</span>
                    </div>
                    <div className="stats-kpi-value">{stats.totalChaptersRead.toLocaleString()}</div>
                    <div className="stats-kpi-label">Capítulos leídos</div>
                    <div className="stats-kpi-sub">{stats.totalVolumesRead} volúmenes leídos</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #fbbf24, #f59e0b)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">⭐</div>
                      <span className="stats-kpi-badge">{stats.bestRatedCount} joyas (9-10)</span>
                    </div>
                    <div className="stats-kpi-value">{stats.averageScore ? `${stats.averageScore}/10` : '—'}</div>
                    <div className="stats-kpi-label">Nota media manga</div>
                    <div className="stats-kpi-sub">Nota más común: {stats.mostFrequentScore?.score ?? '—'} ★</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #34d399, #10b981)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">🎯</div>
                      <span className="stats-kpi-badge">{stats.byStatus.completed} terminados</span>
                    </div>
                    <div className="stats-kpi-value">{stats.completionRate}%</div>
                    <div className="stats-kpi-label">Tasa de finalización</div>
                    <div className="stats-kpi-sub">{stats.byStatus.dropped} abandonados</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #38bdf8, #60a5fa)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">📚</div>
                      <span className="stats-kpi-badge">Tomos</span>
                    </div>
                    <div className="stats-kpi-value">{stats.totalVolumesRead.toLocaleString()}</div>
                    <div className="stats-kpi-label">Volúmenes completados</div>
                    <div className="stats-kpi-sub">De tu colección manga</div>
                  </div>

                  <div className="stats-kpi-card" style={{ ['--card-accent' as string]: 'linear-gradient(90deg, #f43f5e, #e11d48)' }}>
                    <div className="stats-kpi-header">
                      <div className="stats-kpi-icon">📌</div>
                      <span className="stats-kpi-badge">Backlog</span>
                    </div>
                    <div className="stats-kpi-value">{stats.byStatus.planned.toLocaleString()}</div>
                    <div className="stats-kpi-label">Por leer (Planeados)</div>
                    <div className="stats-kpi-sub">En lista de pendientes</div>
                  </div>
                </>
              )}
            </div>

            {/* Status Distribution Section */}
            <div className="stats-section-block">
              <div className="stats-section-title">
                <div className="stats-section-title-left">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="8 12 12 16 16 12"/><line x1="12" y1="8" x2="12" y2="16"/>
                  </svg>
                  Distribución por Estado {scope === 'all' ? '(Global)' : scope === 'anime' ? '(Anime)' : '(Manga)'}
                </div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Total: <strong>{totalTracked.toLocaleString()}</strong> obras
                </span>
              </div>

              {/* Multi-segment visual bar */}
              <div className="stats-multi-bar" title="Distribución proporcional por estado">
                {STATUS_ORDER.map((s) => {
                  const count = stats.byStatus[s];
                  const pct = totalTracked > 0 ? (count / totalTracked) * 100 : 0;
                  if (pct <= 0) return null;
                  return (
                    <div
                      key={s}
                      className="stats-multi-segment"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: STATUS_COLORS[s],
                      }}
                      title={`${STATUS_LABELS[s]}: ${count} (${Math.round(pct)}%)`}
                    />
                  );
                })}
              </div>

              {/* Status Breakdown Grid */}
              <div className="stats-status-grid">
                {STATUS_ORDER.map((s) => {
                  const count = stats.byStatus[s];
                  const pct = totalTracked > 0 ? Math.round((count / totalTracked) * 100) : 0;
                  const label =
                    scope === 'manga' && s === 'watching'
                      ? 'Leyendo'
                      : STATUS_LABELS[s];

                  return (
                    <div key={s} className="stats-status-card">
                      <div className="stats-status-card-header">
                        <div className="stats-status-dot-label" style={{ color: STATUS_COLORS[s] }}>
                          <span className="stats-status-dot" style={{ backgroundColor: STATUS_COLORS[s], color: STATUS_COLORS[s] }} />
                          {label}
                        </div>
                        <span className="stats-status-pct">{pct}%</span>
                      </div>
                      <div className="stats-status-count">
                        {count.toLocaleString()}
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: STATUS_COLORS[s],
                            borderRadius: 99,
                            transition: 'width 0.4s ease',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Charts: Top Genres & Score Distribution */}
            <div className="stats-charts-row">
              {/* Top Genres Card */}
              <div className="stats-chart-card">
                <div className="stats-section-title" style={{ marginBottom: 4 }}>
                  <div className="stats-section-title-left">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
                    </svg>
                    Géneros Favoritos
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Top 8 más vistos</span>
                </div>

                {stats.topGenres.length > 0 ? (
                  <div className="stats-genres-list">
                    {stats.topGenres.map(({ genre, count, pct }, index) => {
                      const rankClass =
                        index === 0
                          ? 'stats-genre-rank-1'
                          : index === 1
                          ? 'stats-genre-rank-2'
                          : index === 2
                          ? 'stats-genre-rank-3'
                          : 'stats-genre-rank-other';

                      const barWidth = Math.round((count / maxGenreCount) * 100);

                      return (
                        <div key={genre} className="stats-genre-row">
                          <span className={`stats-genre-rank ${rankClass}`}>
                            #{index + 1}
                          </span>
                          <span className="stats-genre-name" title={genre}>
                            {genre}
                          </span>
                          <div className="stats-genre-track">
                            <div
                              className="stats-genre-bar"
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <div className="stats-genre-meta">
                            <span className="stats-genre-count">{count}</span>
                            <span className="stats-genre-pct">({pct}%)</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={{ padding: '36px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    Sin datos de géneros para este filtro.
                  </div>
                )}
              </div>

              {/* Score Distribution Card */}
              <div className="stats-chart-card">
                <div className="stats-section-title" style={{ marginBottom: 4 }}>
                  <div className="stats-section-title-left">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                    Distribución de Puntuaciones
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Escala 1 a 10</span>
                </div>

                {/* Score Summary Metrics */}
                <div className="stats-score-summary-bar">
                  <div className="stats-score-summary-item">
                    Media: <strong>{stats.averageScore ? `${stats.averageScore} ★` : '—'}</strong>
                  </div>
                  <div className="stats-score-summary-item">
                    Élite (9-10★): <strong>{stats.bestRatedCount}</strong>
                  </div>
                  <div className="stats-score-summary-item">
                    Pico: <strong>{stats.mostFrequentScore ? `${stats.mostFrequentScore.score}★ (${stats.mostFrequentScore.count})` : '—'}</strong>
                  </div>
                </div>

                {/* Vertical Bar Chart */}
                <div className="stats-score-chart-container">
                  {stats.scoreDist.map(({ score, count }) => {
                    const heightPct = count > 0 ? Math.max(10, Math.round((count / maxScoreCount) * 100)) : 3;
                    const isPeak = stats.mostFrequentScore?.score === score && count > 0;

                    return (
                      <div key={score} className="stats-score-col-wrapper">
                        {count > 0 ? (
                          <span className="stats-score-count-tag" style={{ color: isPeak ? '#f472b6' : '#cbd5e1' }}>
                            {count}
                          </span>
                        ) : (
                          <span style={{ height: 16 }} />
                        )}
                        <div
                          className={`stats-score-bar-visual ${isPeak ? 'stats-score-bar-peak' : ''}`}
                          style={{
                            height: `${heightPct}%`,
                            opacity: count > 0 ? 1 : 0.15,
                          }}
                          title={`Puntuación ${score}: ${count} obras`}
                        />
                        <span className={`stats-score-x-label ${isPeak ? 'peak' : ''}`}>
                          {score}{score === 10 ? '★' : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span>Poco valorado</span>
                  <span>Obras maestras</span>
                </div>
              </div>
            </div>

            {/* Favorites Section (Anime, Manga, Waifus) */}
            <FavoritesSection />

            {/* Fun Fact / Insights Banner */}
            <div className="stats-fun-facts">
              <div className="stats-fun-fact-icon">🌟</div>
              <div className="stats-fun-fact-text">
                Has dedicado el equivalente a <strong>{stats.totalDaysWatched} días ininterrumpidos</strong> ({stats.totalHoursWatched.toLocaleString()} horas) viendo anime. Tu género predilecto es <strong>{stats.topGenres[0]?.genre || 'desconocido'}</strong> con <strong>{stats.topGenres[0]?.count || 0}</strong> obras registradas, y has calificado <strong>{stats.bestRatedCount}</strong> títulos con nota sobresaliente (9 o 10 estrellas).
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
