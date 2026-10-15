'use client';

import { useState, useEffect } from 'react';
import { UserFavorites, MALProfile } from '@/lib/types';
import {
  getFavorites,
  saveFavorites,
  removeFavoriteMedia,
  removeFavoriteCharacter,
  removeFavoritePerson,
  getMALProfile,
  saveMALProfile,
} from '@/lib/store';
import FavoritesModal from './FavoritesModal';

export default function FavoritesSection() {
  const [favorites, setFavorites] = useState<UserFavorites>({ animes: [], mangas: [], characters: [], people: [] });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'anime' | 'manga' | 'character' | 'people'>('anime');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isSyncingMAL, setIsSyncingMAL] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [showMALPrompt, setShowMALPrompt] = useState(false);
  const [malUserInput, setMalUserInput] = useState('');

  const refreshFavorites = () => {
    setFavorites(getFavorites());
  };

  useEffect(() => {
    const cur = getFavorites();
    setFavorites(cur);
    const hasAny =
      (cur.animes?.length || 0) > 0 ||
      (cur.mangas?.length || 0) > 0 ||
      (cur.characters?.length || 0) > 0 ||
      (cur.people?.length || 0) > 0;

    const profile = getMALProfile();
    if (!hasAny && profile?.username) {
      handleSyncFromMAL(profile.username);
    }
  }, []);

  const openModal = (tab: 'anime' | 'manga' | 'character' | 'people') => {
    setModalTab(tab);
    setModalOpen(true);
  };

  const handleSyncFromMAL = async (targetUsername?: string) => {
    const profile = getMALProfile();
    const userToSync = (targetUsername || profile?.username || '').trim();

    if (!userToSync) {
      setShowMALPrompt(true);
      return;
    }

    setIsSyncingMAL(true);
    setSyncStatus(null);

    try {
      const res = await fetch(`/api/mal/profile?username=${encodeURIComponent(userToSync)}`);
      const data = await res.json();

      if (!res.ok || data.error) {
        setSyncStatus({ type: 'error', msg: data.error || 'Error al obtener favoritos de MAL.' });
        setIsSyncingMAL(false);
        return;
      }

      if (data.favorites) {
        saveFavorites(data.favorites);
        refreshFavorites();

        // Update profile in store
        const updatedProfile: MALProfile = {
          username: userToSync,
          avatar: data.avatar || profile?.avatar || null,
          lastSyncedAt: new Date().toISOString(),
        };
        saveMALProfile(updatedProfile);

        const totalFavs =
          (data.favorites.animes?.length || 0) +
          (data.favorites.mangas?.length || 0) +
          (data.favorites.characters?.length || 0) +
          (data.favorites.people?.length || 0);

        setSyncStatus({
          type: 'success',
          msg: `✅ ¡${totalFavs} favoritos importados exitosamente desde MyAnimeList (@${userToSync})!`,
        });
        setShowMALPrompt(false);
      }
    } catch (err) {
      console.error(err);
      setSyncStatus({ type: 'error', msg: 'No se pudo conectar con el servidor de sincronización.' });
    } finally {
      setIsSyncingMAL(false);
    }
  };

  const handleRemoveMedia = (malId: number, kind: 'anime' | 'manga', e: React.MouseEvent) => {
    e.stopPropagation();
    removeFavoriteMedia(malId, kind);
    refreshFavorites();
  };

  const handleRemoveCharacter = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFavoriteCharacter(id);
    refreshFavorites();
  };

  const handleRemovePerson = (id: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFavoritePerson(id);
    refreshFavorites();
  };

  return (
    <div className="favorites-container-block">
      {/* Top Header */}
      <div className="favorites-main-header">
        <div>
          <h2 className="favorites-title">
            <span style={{ color: '#a78bfa' }}>⭐</span> Favorites
          </h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
            Tus animes, mangas, personajes/waifus y seiyuus predilectos
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary"
            onClick={() => handleSyncFromMAL()}
            disabled={isSyncingMAL}
            style={{
              fontSize: '0.82rem',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'linear-gradient(135deg, rgba(46, 81, 162, 0.25) 0%, rgba(99, 102, 241, 0.25) 100%)',
              borderColor: 'rgba(99, 102, 241, 0.4)',
            }}
            title="Importar automáticamente tus favoritos y waifus desde tu perfil de MyAnimeList"
          >
            <span style={{ display: 'inline-block', animation: isSyncingMAL ? 'spin 1s linear infinite' : 'none' }}>
              🔄
            </span>
            <span>{isSyncingMAL ? 'Sincronizando de MAL...' : 'Sincronizar de MyAnimeList'}</span>
          </button>

          <button
            className="btn btn-secondary"
            onClick={() => openModal('anime')}
            style={{
              fontSize: '0.82rem',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>⚙️</span> Administrar Favoritos
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div
          style={{
            margin: '12px 0',
            padding: '10px 16px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: syncStatus.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            border: `1px solid ${syncStatus.type === 'success' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(239, 68, 68, 0.4)'}`,
            color: syncStatus.type === 'success' ? '#86efac' : '#fca5a5',
          }}
        >
          <span>{syncStatus.msg}</span>
          <button
            onClick={() => setSyncStatus(null)}
            style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* MAL Prompt Modal */}
      {showMALPrompt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setShowMALPrompt(false)}
        >
          <div
            style={{
              background: 'var(--card-bg, #12131f)',
              border: '1px solid var(--border-color, rgba(255, 255, 255, 0.1))',
              borderRadius: 16,
              padding: 24,
              maxWidth: 440,
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: '1.5rem' }}>⭐</span>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700 }}>Sincronizar Favoritos de MAL</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.5 }}>
              Ingresa tu nombre de usuario público de MyAnimeList para importar tus 10 animes, 10 mangas, 10 personajes/waifus y 10 seiyuus predilectos:
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (malUserInput.trim()) {
                  handleSyncFromMAL(malUserInput.trim());
                }
              }}
            >
              <input
                type="text"
                className="input"
                placeholder="Tu usuario en MyAnimeList (ej. Xinil)"
                value={malUserInput}
                onChange={(e) => setMalUserInput(e.target.value)}
                style={{ width: '100%', marginBottom: 16 }}
                autoFocus
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setShowMALPrompt(false)}
                  disabled={isSyncingMAL}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!malUserInput.trim() || isSyncingMAL}
                >
                  {isSyncingMAL ? 'Importando...' : 'Sincronizar Ahora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ───── 1. ANIME ROW ───── */}
      <div className="favorites-category-group">
        <div className="favorites-category-header">
          <span className="favorites-category-label">
            Anime <span style={{ opacity: 0.65 }}>({favorites.animes.length}/10)</span>
          </span>
          {favorites.animes.length < 10 && (
            <button
              className="favorites-add-link"
              onClick={() => openModal('anime')}
            >
              + Añadir Anime
            </button>
          )}
        </div>

        <div className="favorites-row">
          {favorites.animes.map((item) => (
            <div
              key={item.malId}
              className="favorite-item-card"
              onMouseEnter={() => setHoveredItem(`anime-${item.malId}`)}
              onMouseLeave={() => setHoveredItem(null)}
              title={item.title}
            >
              <img src={item.image} alt={item.title} className="favorite-item-img" />
              <div className="favorite-item-overlay">
                <span className="favorite-item-name">{item.title}</span>
              </div>
              <button
                className="favorite-item-del-btn"
                onClick={(e) => handleRemoveMedia(item.malId, 'anime', e)}
                title="Quitar de favoritos"
              >
                ✕
              </button>
            </div>
          ))}

          {/* Empty slots up to 10 */}
          {Array.from({ length: Math.max(0, 10 - favorites.animes.length) }).map((_, i) => (
            <div
              key={`empty-anime-${i}`}
              className="favorite-empty-slot"
              onClick={() => openModal('anime')}
              title="Añadir anime favorito"
            >
              <span style={{ fontSize: '1.2rem', marginBottom: 2 }}>+</span>
              <span>Anime</span>
            </div>
          ))}
        </div>
      </div>

      {/* ───── 2. MANGA ROW ───── */}
      <div className="favorites-category-group">
        <div className="favorites-category-header">
          <span className="favorites-category-label">
            Manga <span style={{ opacity: 0.65 }}>({favorites.mangas.length}/10)</span>
          </span>
          {favorites.mangas.length < 10 && (
            <button
              className="favorites-add-link"
              onClick={() => openModal('manga')}
            >
              + Añadir Manga
            </button>
          )}
        </div>

        <div className="favorites-row">
          {favorites.mangas.map((item) => (
            <div
              key={item.malId}
              className="favorite-item-card"
              onMouseEnter={() => setHoveredItem(`manga-${item.malId}`)}
              onMouseLeave={() => setHoveredItem(null)}
              title={item.title}
            >
              <img src={item.image} alt={item.title} className="favorite-item-img" />
              <div className="favorite-item-overlay">
                <span className="favorite-item-name">{item.title}</span>
              </div>
              <button
                className="favorite-item-del-btn"
                onClick={(e) => handleRemoveMedia(item.malId, 'manga', e)}
                title="Quitar de favoritos"
              >
                ✕
              </button>
            </div>
          ))}

          {Array.from({ length: Math.max(0, 10 - favorites.mangas.length) }).map((_, i) => (
            <div
              key={`empty-manga-${i}`}
              className="favorite-empty-slot"
              onClick={() => openModal('manga')}
              title="Añadir manga favorito"
            >
              <span style={{ fontSize: '1.2rem', marginBottom: 2 }}>+</span>
              <span>Manga</span>
            </div>
          ))}
        </div>
      </div>

      {/* ───── 3. CHARACTER / WAIFU ROW ───── */}
      <div className="favorites-category-group">
        <div className="favorites-category-header">
          <span className="favorites-category-label">
            Personajes / Waifus <span style={{ opacity: 0.65 }}>({favorites.characters.length}/10)</span>
          </span>
          {favorites.characters.length < 10 && (
            <button
              className="favorites-add-link"
              onClick={() => openModal('character')}
            >
              + Añadir Personaje / Waifu
            </button>
          )}
        </div>

        <div className="favorites-row">
          {favorites.characters.map((char) => (
            <div
              key={char.id}
              className="favorite-item-card"
              onMouseEnter={() => setHoveredItem(`char-${char.id}`)}
              onMouseLeave={() => setHoveredItem(null)}
              title={`${char.name} (${char.mediaTitle || ''})`}
            >
              <img src={char.image} alt={char.name} className="favorite-item-img" />
              <div className="favorite-item-overlay">
                <span className="favorite-item-name">{char.name}</span>
                {char.mediaTitle && (
                  <span style={{ fontSize: '0.62rem', color: '#cbd5e1', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {char.mediaTitle}
                  </span>
                )}
              </div>
              <button
                className="favorite-item-del-btn"
                onClick={(e) => handleRemoveCharacter(char.id, e)}
                title="Quitar de favoritos"
              >
                ✕
              </button>
            </div>
          ))}

          {Array.from({ length: Math.max(0, 10 - favorites.characters.length) }).map((_, i) => (
            <div
              key={`empty-char-${i}`}
              className="favorite-empty-slot"
              onClick={() => openModal('character')}
              title="Añadir waifu o personaje favorito"
            >
              <span style={{ fontSize: '1.2rem', marginBottom: 2 }}>+</span>
              <span>Waifu</span>
            </div>
          ))}
        </div>
      </div>

      {/* ───── 4. PEOPLE / SEIYUUS ROW ───── */}
      <div className="favorites-category-group" style={{ marginBottom: 0 }}>
        <div className="favorites-category-header">
          <span className="favorites-category-label">
            Seiyuus / Personas <span style={{ opacity: 0.65 }}>({(favorites.people?.length || 0)}/10)</span>
          </span>
          {(favorites.people?.length || 0) < 10 && (
            <button
              className="favorites-add-link"
              onClick={() => openModal('people')}
            >
              + Añadir Seiyuu / Persona
            </button>
          )}
        </div>

        <div className="favorites-row">
          {(favorites.people || []).map((person) => (
            <div
              key={person.id}
              className="favorite-item-card"
              onMouseEnter={() => setHoveredItem(`person-${person.id}`)}
              onMouseLeave={() => setHoveredItem(null)}
              title={person.name}
            >
              <img src={person.image} alt={person.name} className="favorite-item-img" />
              <div className="favorite-item-overlay">
                <span className="favorite-item-name">{person.name}</span>
                <span style={{ fontSize: '0.62rem', color: '#cbd5e1', opacity: 0.85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {person.occupations?.[0] || 'Seiyuu'}
                </span>
              </div>
              <button
                className="favorite-item-del-btn"
                onClick={(e) => handleRemovePerson(person.id, e)}
                title="Quitar de favoritos"
              >
                ✕
              </button>
            </div>
          ))}

          {Array.from({ length: Math.max(0, 10 - (favorites.people?.length || 0)) }).map((_, i) => (
            <div
              key={`empty-person-${i}`}
              className="favorite-empty-slot"
              onClick={() => openModal('people')}
              title="Añadir seiyuu o persona favorita"
            >
              <span style={{ fontSize: '1.2rem', marginBottom: 2 }}>+</span>
              <span>Seiyuu</span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Dialog */}
      <FavoritesModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab={modalTab}
        onUpdated={refreshFavorites}
      />
    </div>
  );
}
