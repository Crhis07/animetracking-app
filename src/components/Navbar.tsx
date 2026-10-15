'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getMALProfile, mergeFromMALSync } from '@/lib/store';
import { MALProfile } from '@/lib/types';

const NAV_ITEMS = [
  {
    href: '/list',
    label: 'Mi Lista',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
      </svg>
    ),
  },
  {
    href: '/search',
    label: 'Buscar',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    href: '/stats',
    label: 'Stats',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    href: '/settings',
    label: 'Ajustes',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function Navbar() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<MALProfile | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    setProfile(getMALProfile());
  }, [pathname]);

  const handleQuickSync = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!profile?.username || isSyncing) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`/api/mal/sync?username=${encodeURIComponent(profile.username)}`);
      if (res.ok) {
        const data = await res.json();
        mergeFromMALSync(data.entries || [], data.favorites, data.profile);
        setProfile(data.profile);
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <nav className="navbar">
      {/* Brand with Waifu Logo */}
      <Link href="/list" className="navbar-brand" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.jpg"
            alt="AniTrack Waifu Logo"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(236, 72, 153, 0.8)',
              boxShadow: '0 0 16px rgba(236, 72, 153, 0.5), 0 0 25px rgba(99, 102, 241, 0.35)',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span
            style={{
              fontWeight: 800,
              fontSize: '1.05rem',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #ffffff 0%, #e0e7ff 60%, #f472b6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            AniTrack
          </span>
          <span style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.04em' }}>
            Anime & Manga Tracker
          </span>
        </div>
      </Link>

      {/* Nav links & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div className="navbar-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname.startsWith(item.href) ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* MAL Profile Pill */}
        {profile ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '4px 10px 4px 6px',
              background: 'rgba(46, 81, 162, 0.2)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              borderRadius: 30,
            }}
            title={`Cuenta vinculada: @${profile.username}. Clic para sincronizar.`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profile.avatar || '/logo.jpg'}
              alt={profile.username}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                objectFit: 'cover',
              }}
            />
            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#e0e7ff', maxWidth: 90, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {profile.username}
            </span>
            <button
              onClick={handleQuickSync}
              disabled={isSyncing}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#a5b4fc',
                display: 'flex',
                alignItems: 'center',
                padding: 2,
                fontSize: '0.85rem',
              }}
              title="Sincronizar ahora con MyAnimeList"
            >
              <span style={{ display: 'inline-block', animation: isSyncing ? 'spin 1s linear infinite' : 'none' }}>
                🔄
              </span>
            </button>
          </div>
        ) : (
          <Link
            href="/settings"
            style={{
              fontSize: '0.75rem',
              padding: '5px 10px',
              borderRadius: 20,
              background: 'rgba(46, 81, 162, 0.2)',
              border: '1px solid rgba(46, 81, 162, 0.4)',
              color: '#c7d2fe',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span>🎌</span> Vincular MAL
          </Link>
        )}
      </div>
    </nav>
  );
}
