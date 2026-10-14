'use client';

import { useState, useEffect } from 'react';
import { FavoriteItem, FavoriteCharacter, FavoritePerson, UserFavorites } from '@/lib/types';
import {
  getFavorites,
  saveFavorites,
  getAnimes,
  addFavoriteCharacter,
  removeFavoriteCharacter,
  addFavoritePerson,
  removeFavoritePerson,
  removeFavoriteMedia,
} from '@/lib/store';
import { searchCharacters, searchPeople, searchAnime, searchManga } from '@/lib/jikan';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'anime' | 'manga' | 'character' | 'people';
  onUpdated: () => void;
}

export default function FavoritesModal({ isOpen, onClose, defaultTab = 'anime', onUpdated }: Props) {
  const [activeTab, setActiveTab] = useState<'anime' | 'manga' | 'character' | 'people'>(defaultTab);
  const [favorites, setFavorites] = useState<UserFavorites>({ animes: [], mangas: [], characters: [], people: [] });

  // Search states
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Results
  const [characterResults, setCharacterResults] = useState<FavoriteCharacter[]>([]);
  const [peopleResults, setPeopleResults] = useState<FavoritePerson[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [mediaOnlineResults, setMediaOnlineResults] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      setFavorites(getFavorites());
      setActiveTab(defaultTab);
      setQuery('');
      setCharacterResults([]);
      setPeopleResults([]);
      setMediaOnlineResults([]);
    }
  }, [isOpen, defaultTab]);

  // Live search debounced
  useEffect(() => {
    if (!query.trim()) {
      setCharacterResults([]);
      setPeopleResults([]);
      setMediaOnlineResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (activeTab === 'character') {
          const res = await searchCharacters(query);
          setCharacterResults(res);
        } else if (activeTab === 'people') {
          const res = await searchPeople(query);
          setPeopleResults(res);
        } else if (activeTab === 'anime') {
          const res = await searchAnime(query, 1);
          setMediaOnlineResults(res.data || []);
        } else if (activeTab === 'manga') {
          const res = await searchManga(query, 1);
          setMediaOnlineResults(res.data || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 320);

    return () => clearTimeout(timer);
  }, [query, activeTab]);

  if (!isOpen) return null;

  // Local tracked items for current media tab
  const trackedItems =
    activeTab === 'anime'
      ? getAnimes('anime')
      : activeTab === 'manga'
      ? getAnimes('manga')
      : [];

  const filteredTracked = query.trim()
    ? trackedItems.filter((item) =>
        (item.title + ' ' + (item.titleEnglish || '')).toLowerCase().includes(query.toLowerCase())
      )
    : trackedItems.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  const currentCount =
    activeTab === 'anime'
      ? favorites.animes.length
      : activeTab === 'manga'
      ? favorites.mangas.length
      : activeTab === 'character'
      ? favorites.characters.length
      : (favorites.people?.length || 0);

  const handleAddMedia = (item: {
    malId: number;
    title: string;
    image: string;
    kind: 'anime' | 'manga';
    score?: number | null;
  }) => {
    const favs = getFavorites();
    const list = item.kind === 'manga' ? favs.mangas : favs.animes;

    if (list.some((x) => x.malId === item.malId)) return;

    if (list.length >= 10) {
      alert(`Ya tienes 10 ${item.kind === 'manga' ? 'mangas' : 'animes'} favoritos. Elimina uno primero para añadir otro.`);
      return;
    }

    list.push({
      id: item.malId,
      malId: item.malId,
      title: item.title,
      image: item.image,
      kind: item.kind,
      score: item.score ?? null,
    });

    saveFavorites(favs);
    setFavorites({ ...favs });
    onUpdated();
  };

  const handleRemoveMedia = (malId: number, kind: 'anime' | 'manga') => {
    removeFavoriteMedia(malId, kind);
    const updated = getFavorites();
    setFavorites(updated);
    onUpdated();
  };

  const handleAddCharacter = (char: FavoriteCharacter) => {
    const favs = getFavorites();
    if (favs.characters.some((c) => String(c.id) === String(char.id))) return;

    if (favs.characters.length >= 10) {
      alert('Ya tienes 10 personajes/waifus favoritas. Elimina una primero para añadir otra.');
      return;
    }

    addFavoriteCharacter(char);
    const updated = getFavorites();
    setFavorites(updated);
    onUpdated();
  };

  const handleRemoveCharacter = (id: string | number) => {
    removeFavoriteCharacter(id);
    const updated = getFavorites();
    setFavorites(updated);
    onUpdated();
  };

  const handleAddPerson = (person: FavoritePerson) => {
    const favs = getFavorites();
    if ((favs.people || []).some((p) => String(p.id) === String(person.id))) return;

    if ((favs.people || []).length >= 10) {
      alert('Ya tienes 10 seiyuus/personas favoritas. Elimina una primero para añadir otra.');
      return;
    }

    addFavoritePerson(person);
    const updated = getFavorites();
    setFavorites(updated);
    onUpdated();
  };

  const handleRemovePerson = (id: string | number) => {
    removeFavoritePerson(id);
    const updated = getFavorites();
    setFavorites(updated);
    onUpdated();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 720,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>⭐</span> Gestionar Favoritos (Top 10)
            </h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Elige tus obras, personajes, waifus y seiyuus preferidos para tu perfil
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Category Tabs */}
        <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: 10, flexWrap: 'wrap' }}>
          <button
            className={`btn ${activeTab === 'anime' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('anime'); setQuery(''); }}
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
          >
            🎬 Anime ({favorites.animes.length}/10)
          </button>
          <button
            className={`btn ${activeTab === 'manga' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('manga'); setQuery(''); }}
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
          >
            📖 Manga ({favorites.mangas.length}/10)
          </button>
          <button
            className={`btn ${activeTab === 'character' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('character'); setQuery(''); }}
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
          >
            💖 Character ({favorites.characters.length}/10)
          </button>
          <button
            className={`btn ${activeTab === 'people' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setActiveTab('people'); setQuery(''); }}
            style={{ fontSize: '0.82rem', padding: '6px 12px' }}
          >
            🎙️ People / Seiyuus ({favorites.people?.length || 0}/10)
          </button>
        </div>

        {/* Current Selected Items Bar */}
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>
            TUS ACTUALES {activeTab.toUpperCase()} ({currentCount}/10):
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6 }}>
            {activeTab === 'anime' &&
              favorites.animes.map((item) => (
                <div
                  key={item.malId}
                  style={{
                    position: 'relative',
                    width: 58,
                    height: 82,
                    borderRadius: 6,
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1px solid rgba(99, 102, 241, 0.4)',
                  }}
                  title={item.title}
                >
                  <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => handleRemoveMedia(item.malId, 'anime')}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.8)',
                      color: '#f87171',
                      border: 'none',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                    }}
                    title="Quitar"
                  >
                    ✕
                  </button>
                </div>
              ))}

            {activeTab === 'manga' &&
              favorites.mangas.map((item) => (
                <div
                  key={item.malId}
                  style={{
                    position: 'relative',
                    width: 58,
                    height: 82,
                    borderRadius: 6,
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1px solid rgba(236, 72, 153, 0.4)',
                  }}
                  title={item.title}
                >
                  <img src={item.image} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => handleRemoveMedia(item.malId, 'manga')}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.8)',
                      color: '#f87171',
                      border: 'none',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                    }}
                    title="Quitar"
                  >
                    ✕
                  </button>
                </div>
              ))}

            {activeTab === 'character' &&
              favorites.characters.map((char) => (
                <div
                  key={char.id}
                  style={{
                    position: 'relative',
                    width: 58,
                    height: 82,
                    borderRadius: 6,
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1px solid rgba(139, 92, 246, 0.4)',
                  }}
                  title={`${char.name} (${char.mediaTitle || ''})`}
                >
                  <img src={char.image} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => handleRemoveCharacter(char.id)}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.8)',
                      color: '#f87171',
                      border: 'none',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                    }}
                    title="Quitar"
                  >
                    ✕
                  </button>
                </div>
              ))}

            {activeTab === 'people' &&
              (favorites.people || []).map((person) => (
                <div
                  key={person.id}
                  style={{
                    position: 'relative',
                    width: 58,
                    height: 82,
                    borderRadius: 6,
                    overflow: 'hidden',
                    flexShrink: 0,
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                  }}
                  title={person.name}
                >
                  <img src={person.image} alt={person.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <button
                    onClick={() => handleRemovePerson(person.id)}
                    style={{
                      position: 'absolute',
                      top: 2,
                      right: 2,
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.8)',
                      color: '#f87171',
                      border: 'none',
                      fontSize: '0.7rem',
                      cursor: 'pointer',
                    }}
                    title="Quitar"
                  >
                    ✕
                  </button>
                </div>
              ))}

            {currentCount === 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', padding: '10px 0' }}>
                Aún no has seleccionado ningún favorito en esta categoría.
              </span>
            )}
          </div>
        </div>

        {/* Search Input */}
        <div>
          <input
            type="text"
            className="input-search"
            placeholder={
              activeTab === 'character'
                ? 'Buscar waifu o personaje (ej. Echidna, Marin Kitagawa, Sumi)...'
                : activeTab === 'people'
                ? 'Buscar seiyuu o actor de voz (ej. Kaede Hondo, Hiro Shimono, Rie Takahashi)...'
                : `Buscar en tu lista o escribir para buscar online...`
            }
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%' }}
            autoFocus
          />
        </div>

        {/* Results List */}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: 360, minHeight: 220, paddingRight: 4 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)' }}>
              Buscando en la base de datos...
            </div>
          )}

          {/* PEOPLE / SEIYUUS RESULTS */}
          {activeTab === 'people' && !loading && (
            <div>
              {peopleResults.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {peopleResults.map((person) => {
                    const isAdded = (favorites.people || []).some((p) => String(p.id) === String(person.id));
                    return (
                      <div
                        key={person.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 8,
                          padding: 8,
                          display: 'flex',
                          gap: 10,
                          alignItems: 'center',
                        }}
                      >
                        <img
                          src={person.image}
                          alt={person.name}
                          style={{ width: 44, height: 60, objectFit: 'cover', borderRadius: 4 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {person.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                            {person.occupations?.[0] || 'Seiyuu / Actor'}
                          </div>
                          <button
                            type="button"
                            onClick={() => (isAdded ? handleRemovePerson(person.id) : handleAddPerson(person))}
                            style={{
                              marginTop: 4,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: isAdded ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #0284c7, #38bdf8)',
                              color: isAdded ? '#f87171' : '#ffffff',
                              border: isAdded ? '1px solid #ef4444' : 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {isAdded ? 'Quitar' : '+ Añadir'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : query.trim() ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                  No se encontraron seiyuus con &quot;{query}&quot;.
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Escribe el nombre de tu seiyuu favorito en el buscador arriba (ej: <strong>Kaede Hondo</strong>, <strong>Hiro Shimono</strong>, <strong>Rie Takahashi</strong>, <strong>Saori Hayami</strong>).
                </div>
              )}
            </div>
          )}

          {/* WAIFUS / CHARACTERS RESULTS */}
          {activeTab === 'character' && !loading && (
            <div>
              {characterResults.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
                  {characterResults.map((char) => {
                    const isAdded = favorites.characters.some((c) => String(c.id) === String(char.id));
                    return (
                      <div
                        key={char.id}
                        style={{
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: 8,
                          padding: 8,
                          display: 'flex',
                          gap: 10,
                          alignItems: 'center',
                        }}
                      >
                        <img
                          src={char.image}
                          alt={char.name}
                          style={{ width: 44, height: 60, objectFit: 'cover', borderRadius: 4 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {char.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {char.mediaTitle || 'Anime/Manga'}
                          </div>
                          <button
                            type="button"
                            onClick={() => (isAdded ? handleRemoveCharacter(char.id) : handleAddCharacter(char))}
                            style={{
                              marginTop: 4,
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: 4,
                              background: isAdded ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                              color: isAdded ? '#f87171' : '#ffffff',
                              border: isAdded ? '1px solid #ef4444' : 'none',
                              cursor: 'pointer',
                            }}
                          >
                            {isAdded ? 'Quitar' : '+ Añadir'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : query.trim() ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
                  No se encontraron personajes con &quot;{query}&quot;.
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                  Escribe el nombre de tu personaje o waifu favorita en el buscador arriba (ej: <strong>Echidna</strong>, <strong>Sumi</strong>, <strong>Marin</strong>, <strong>Rem</strong>).
                </div>
              )}
            </div>
          )}

          {/* ANIME / MANGA RESULTS */}
          {(activeTab === 'anime' || activeTab === 'manga') && !loading && (
            <div>
              {/* From Tracked Library */}
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>
                {query.trim() ? 'RESULTADOS EN TU LISTA:' : 'TUS OBRAS MEJOR PUNTUADAS:'}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
                {filteredTracked.slice(0, 18).map((item) => {
                  const list = activeTab === 'manga' ? favorites.mangas : favorites.animes;
                  const isAdded = list.some((x) => x.malId === item.malId);

                  return (
                    <div
                      key={item.malId}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: 8,
                        padding: 8,
                        display: 'flex',
                        gap: 10,
                        alignItems: 'center',
                      }}
                    >
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        style={{ width: 44, height: 62, objectFit: 'cover', borderRadius: 4 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#fbbf24' }}>
                          {item.score ? `★ ${item.score}/10` : 'Sin nota'}
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            isAdded
                              ? handleRemoveMedia(item.malId, activeTab)
                              : handleAddMedia({
                                  malId: item.malId,
                                  title: item.title,
                                  image: item.coverImage,
                                  kind: activeTab,
                                  score: item.score,
                                })
                          }
                          style={{
                            marginTop: 4,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: 4,
                            background: isAdded ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            color: isAdded ? '#f87171' : '#ffffff',
                            border: isAdded ? '1px solid #ef4444' : 'none',
                            cursor: 'pointer',
                          }}
                        >
                          {isAdded ? 'Quitar' : '+ Añadir'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Online Search Results if user searched */}
              {query.trim() && mediaOnlineResults.length > 0 && (
                <>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', marginTop: 20, marginBottom: 8 }}>
                    RESULTADOS ONLINE:
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 10 }}>
                    {mediaOnlineResults.slice(0, 8).map((item) => {
                      const list = activeTab === 'manga' ? favorites.mangas : favorites.animes;
                      const isAdded = list.some((x) => x.malId === item.mal_id);
                      const cover = item.images?.webp?.large_image_url || item.images?.jpg?.large_image_url || '';

                      return (
                        <div
                          key={item.mal_id}
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: 8,
                            padding: 8,
                            display: 'flex',
                            gap: 10,
                            alignItems: 'center',
                          }}
                        >
                          <img
                            src={cover}
                            alt={item.title}
                            style={{ width: 44, height: 62, objectFit: 'cover', borderRadius: 4 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.title}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                isAdded
                                  ? handleRemoveMedia(item.mal_id, activeTab)
                                  : handleAddMedia({
                                      malId: item.mal_id,
                                      title: item.title,
                                      image: cover,
                                      kind: activeTab,
                                      score: item.score,
                                    })
                              }
                              style={{
                                marginTop: 4,
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: 4,
                                background: isAdded ? 'rgba(239, 68, 68, 0.2)' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                color: isAdded ? '#f87171' : '#ffffff',
                                border: isAdded ? '1px solid #ef4444' : 'none',
                                cursor: 'pointer',
                              }}
                            >
                              {isAdded ? 'Quitar' : '+ Añadir'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid rgba(255, 255, 255, 0.1)', paddingTop: 12 }}>
          <button className="btn btn-primary" onClick={onClose}>
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
