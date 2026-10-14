'use client';

import { useState, useEffect } from 'react';
import { UserFavorites } from '@/lib/types';
import { getFavorites, removeFavoriteMedia, removeFavoriteCharacter, removeFavoritePerson } from '@/lib/store';
import FavoritesModal from './FavoritesModal';

export default function FavoritesSection() {
  const [favorites, setFavorites] = useState<UserFavorites>({ animes: [], mangas: [], characters: [], people: [] });
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'anime' | 'manga' | 'character' | 'people'>('anime');
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const refreshFavorites = () => {
    setFavorites(getFavorites());
  };

  useEffect(() => {
    refreshFavorites();
  }, []);

  const openModal = (tab: 'anime' | 'manga' | 'character' | 'people') => {
    setModalTab(tab);
    setModalOpen(true);
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
            Character (10) <span style={{ opacity: 0.65 }}>({favorites.characters.length}/10)</span>
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
            People (10) <span style={{ opacity: 0.65 }}>({(favorites.people?.length || 0)}/10)</span>
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
