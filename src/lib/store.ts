import { AppStore, TrackedAnime, AnimeStatus, MediaKind, FavoriteItem, FavoriteCharacter, FavoritePerson, UserFavorites, MALProfile } from './types';

const STORE_KEY = 'animelist_v1';
const STORE_VERSION = 1;

function getDefaultStore(): AppStore {
  return {
    animes: [],
    favorites: {
      animes: [],
      mangas: [],
      characters: [],
      people: [],
    },
    malProfile: {
      username: 'Crhis007',
      avatar: 'https://cdn.myanimelist.net/s/common/userimages/25c4e10d-41d0-4e92-82a9-45776f50de0d_225w?s=ea5b0ccb9b4f3b2eaeb606a0c5ca4a8a',
      lastSyncedAt: null,
    },
    version: STORE_VERSION,
    lastExport: null,
  };
}

export function loadStore(): AppStore {
  if (typeof window === 'undefined') return getDefaultStore();
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return getDefaultStore();
    const parsed = JSON.parse(raw) as AppStore;
    if (!parsed.version || !Array.isArray(parsed.animes)) return getDefaultStore();
    if (!parsed.malProfile) {
      parsed.malProfile = {
        username: 'Crhis007',
        avatar: 'https://cdn.myanimelist.net/s/common/userimages/25c4e10d-41d0-4e92-82a9-45776f50de0d_225w?s=ea5b0ccb9b4f3b2eaeb606a0c5ca4a8a',
        lastSyncedAt: null,
      };
    }
    return parsed;
  } catch {
    return getDefaultStore();
  }
}

function saveStore(store: AppStore): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch (e) {
    console.error('Error saving to localStorage:', e);
  }
}

export function getAnimes(kind?: MediaKind | 'all'): TrackedAnime[] {
  const all = loadStore().animes;
  if (!kind || kind === 'all') return all;
  return all.filter((a) => (a.kind ?? 'anime') === kind);
}

export function getAnime(malId: number, kind: MediaKind = 'anime'): TrackedAnime | undefined {
  return loadStore().animes.find((a) => a.malId === malId && (a.kind ?? 'anime') === kind);
}

export function upsertAnime(anime: TrackedAnime): void {
  const store = loadStore();
  const animeKind = anime.kind ?? 'anime';
  const idx = store.animes.findIndex(
    (a) => a.malId === anime.malId && (a.kind ?? 'anime') === animeKind
  );
  anime.kind = animeKind;
  anime.updatedAt = new Date().toISOString();
  if (idx === -1) {
    anime.addedAt = new Date().toISOString();
    store.animes.push(anime);
  } else {
    store.animes[idx] = { ...store.animes[idx], ...anime };
  }
  saveStore(store);
}

export function removeAnime(malId: number, kind: MediaKind = 'anime'): void {
  const store = loadStore();
  store.animes = store.animes.filter(
    (a) => !(a.malId === malId && (a.kind ?? 'anime') === kind)
  );
  saveStore(store);
}

export function updateEpisode(malId: number, episode: number, kind: MediaKind = 'anime'): void {
  const store = loadStore();
  const item = store.animes.find((a) => a.malId === malId && (a.kind ?? 'anime') === kind);
  if (!item) return;
  item.currentEpisode = Math.max(0, episode);
  item.updatedAt = new Date().toISOString();
  if (item.totalEpisodes && item.currentEpisode >= item.totalEpisodes) {
    item.status = 'completed';
    item.completedAt = new Date().toISOString();
  }
  saveStore(store);
}

export function updateChapter(malId: number, chapter: number, kind: MediaKind = 'manga'): void {
  const store = loadStore();
  const item = store.animes.find((a) => a.malId === malId && (a.kind ?? 'anime') === kind);
  if (!item) return;
  item.currentChapter = Math.max(0, chapter);
  item.updatedAt = new Date().toISOString();
  if (item.totalChapters && item.currentChapter >= item.totalChapters) {
    item.status = 'completed';
    item.completedAt = new Date().toISOString();
  }
  saveStore(store);
}

export function updateVolume(malId: number, volume: number, kind: MediaKind = 'manga'): void {
  const store = loadStore();
  const item = store.animes.find((a) => a.malId === malId && (a.kind ?? 'anime') === kind);
  if (!item) return;
  item.currentVolume = Math.max(0, volume);
  item.updatedAt = new Date().toISOString();
  saveStore(store);
}

export function updateScore(malId: number, score: number | null, kind: MediaKind = 'anime'): void {
  const store = loadStore();
  const item = store.animes.find((a) => a.malId === malId && (a.kind ?? 'anime') === kind);
  if (!item) return;
  item.score = score;
  item.updatedAt = new Date().toISOString();
  saveStore(store);
}

export function updateStatus(malId: number, status: AnimeStatus, kind: MediaKind = 'anime'): void {
  const store = loadStore();
  const item = store.animes.find((a) => a.malId === malId && (a.kind ?? 'anime') === kind);
  if (!item) return;
  item.status = status;
  item.updatedAt = new Date().toISOString();
  if (status === 'completed' && !item.completedAt) {
    item.completedAt = new Date().toISOString();
  }
  if (status === 'watching' && !item.startedAt) {
    item.startedAt = new Date().toISOString();
  }
  saveStore(store);
}

export function updateNotes(malId: number, notes: string, kind: MediaKind = 'anime'): void {
  const store = loadStore();
  const item = store.animes.find((a) => a.malId === malId && (a.kind ?? 'anime') === kind);
  if (!item) return;
  item.notes = notes;
  item.updatedAt = new Date().toISOString();
  saveStore(store);
}

export function exportStoreJSON(): string {
  const store = loadStore();
  store.lastExport = new Date().toISOString();
  saveStore(store);
  return JSON.stringify(store, null, 2);
}

export function importStoreJSON(json: string): { success: boolean; count: number; error?: string } {
  try {
    const data = JSON.parse(json) as AppStore;
    if (!Array.isArray(data.animes)) {
      return { success: false, count: 0, error: 'Formato de archivo inválido.' };
    }
    const store = loadStore();
    let added = 0;
    for (const item of data.animes) {
      const itemKind = item.kind ?? 'anime';
      const exists = store.animes.find(
        (a) => a.malId === item.malId && (a.kind ?? 'anime') === itemKind
      );
      if (!exists) {
        store.animes.push({ ...item, kind: itemKind });
        added++;
      }
    }
    saveStore(store);
    return { success: true, count: added };
  } catch {
    return { success: false, count: 0, error: 'El archivo no es un JSON válido.' };
  }
}

// ───── MAL PROFILE & DIRECT SYNC ─────

export function getMALProfile(): MALProfile | null {
  return loadStore().malProfile ?? null;
}

export function saveMALProfile(profile: MALProfile | null): void {
  const store = loadStore();
  store.malProfile = profile;
  saveStore(store);
}

export function mergeFromMALSync(
  entries: TrackedAnime[],
  favorites?: UserFavorites,
  profile?: MALProfile
): { added: number; updated: number } {
  const store = loadStore();
  let added = 0;
  let updated = 0;

  for (const item of entries) {
    const kind = item.kind ?? 'anime';
    const idx = store.animes.findIndex(
      (a) => a.malId === item.malId && (a.kind ?? 'anime') === kind
    );
    if (idx === -1) {
      store.animes.push(item);
      added++;
    } else {
      // Preserve existing user-specific notes if the new one is empty
      store.animes[idx] = {
        ...item,
        notes: item.notes || store.animes[idx].notes || '',
        coverImage: item.coverImage || store.animes[idx].coverImage,
      };
      updated++;
    }
  }

  if (favorites) {
    store.favorites = favorites;
  }

  if (profile) {
    store.malProfile = profile;
  }

  saveStore(store);
  return { added, updated };
}

// ───── FAVORITES ─────

export function getFavorites(): UserFavorites {
  const store = loadStore();
  if (!store.favorites) {
    return { animes: [], mangas: [], characters: [], people: [] };
  }
  return {
    animes: Array.isArray(store.favorites.animes) ? store.favorites.animes : [],
    mangas: Array.isArray(store.favorites.mangas) ? store.favorites.mangas : [],
    characters: Array.isArray(store.favorites.characters) ? store.favorites.characters : [],
    people: Array.isArray(store.favorites.people) ? store.favorites.people : [],
  };
}

export function saveFavorites(favorites: UserFavorites): void {
  const store = loadStore();
  store.favorites = favorites;
  saveStore(store);
}

export function toggleFavoriteMedia(item: FavoriteItem): boolean {
  const store = loadStore();
  if (!store.favorites) {
    store.favorites = { animes: [], mangas: [], characters: [], people: [] };
  }
  const favs = store.favorites;
  const isManga = item.kind === 'manga';
  const list = isManga ? (favs.mangas ??= []) : (favs.animes ??= []);
  const index = list.findIndex((x) => x.malId === item.malId);

  if (index >= 0) {
    list.splice(index, 1);
    saveStore(store);
    return false; // removed
  } else {
    if (list.length >= 10) {
      list.shift(); // keep max 10
    }
    list.push(item);
    saveStore(store);
    return true; // added
  }
}

export function isFavoriteMedia(malId: number, kind: 'anime' | 'manga'): boolean {
  const favs = getFavorites();
  const list = kind === 'manga' ? favs.mangas : favs.animes;
  return list.some((x) => x.malId === malId);
}

export function removeFavoriteMedia(malId: number, kind: 'anime' | 'manga'): void {
  const store = loadStore();
  if (!store.favorites) return;
  if (kind === 'manga' && store.favorites.mangas) {
    store.favorites.mangas = store.favorites.mangas.filter((x) => x.malId !== malId);
  } else if (store.favorites.animes) {
    store.favorites.animes = store.favorites.animes.filter((x) => x.malId !== malId);
  }
  saveStore(store);
}

export function addFavoriteCharacter(char: FavoriteCharacter): void {
  const store = loadStore();
  if (!store.favorites) {
    store.favorites = { animes: [], mangas: [], characters: [], people: [] };
  }
  const favs = store.favorites;
  const list = (favs.characters ??= []);
  if (!list.some((c) => String(c.id) === String(char.id))) {
    if (list.length >= 10) {
      list.shift();
    }
    list.push(char);
    saveStore(store);
  }
}

export function removeFavoriteCharacter(id: number | string): void {
  const store = loadStore();
  if (!store.favorites || !store.favorites.characters) return;
  store.favorites.characters = store.favorites.characters.filter((c) => String(c.id) !== String(id));
  saveStore(store);
}

export function addFavoritePerson(person: FavoritePerson): void {
  const store = loadStore();
  if (!store.favorites) {
    store.favorites = { animes: [], mangas: [], characters: [], people: [] };
  }
  const favs = store.favorites;
  const list = (favs.people ??= []);
  if (!list.some((p) => String(p.id) === String(person.id))) {
    if (list.length >= 10) {
      list.shift();
    }
    list.push(person);
    saveStore(store);
  }
}

export function removeFavoritePerson(id: number | string): void {
  const store = loadStore();
  if (!store.favorites || !store.favorites.people) return;
  store.favorites.people = store.favorites.people.filter((p) => String(p.id) !== String(id));
  saveStore(store);
}

// ───── STATS ─────

export type StatScope = 'all' | 'anime' | 'manga';

export interface AnimeStats {
  scope: StatScope;
  totalAnimes: number; // Total items in library
  totalAnime: number;  // Total anime items
  totalManga: number;  // Total manga items
  activeTotal: number; // Items in active scope
  byStatus: Record<AnimeStatus, number>;
  byStatusAnime: Record<AnimeStatus, number>;
  byStatusManga: Record<AnimeStatus, number>;
  totalEpisodesWatched: number;
  totalHoursWatched: number;
  totalDaysWatched: number;
  totalChaptersRead: number;
  totalVolumesRead: number;
  averageScore: number | null;
  topGenres: Array<{ genre: string; count: number; pct: number }>;
  completionRate: number;
  meanEpisodesPerAnime: number;
  scoreDist: Array<{ score: number; count: number; pct: number }>;
  bestRatedCount: number;
  mostFrequentScore: { score: number; count: number } | null;
  otakuTitle: string;
  otakuRank: string;
}

export function computeStats(scope: StatScope = 'all'): AnimeStats {
  const allItems = loadStore().animes;

  let totalAnimeCount = 0;
  let totalMangaCount = 0;
  const byStatusAnime: Record<AnimeStatus, number> = {
    watching: 0, completed: 0, planned: 0, on_hold: 0, dropped: 0,
  };
  const byStatusManga: Record<AnimeStatus, number> = {
    watching: 0, completed: 0, planned: 0, on_hold: 0, dropped: 0,
  };

  for (const item of allItems) {
    if (item.kind === 'manga') {
      totalMangaCount++;
      byStatusManga[item.status]++;
    } else {
      totalAnimeCount++;
      byStatusAnime[item.status]++;
    }
  }

  // Filter items based on active scope
  const targetItems = allItems.filter((item) => {
    if (scope === 'anime') return (item.kind ?? 'anime') === 'anime';
    if (scope === 'manga') return item.kind === 'manga';
    return true;
  });

  const byStatus: Record<AnimeStatus, number> = {
    watching: 0,
    completed: 0,
    planned: 0,
    on_hold: 0,
    dropped: 0,
  };

  let totalEpisodesWatched = 0;
  let totalMinutes = 0;
  let totalChaptersRead = 0;
  let totalVolumesRead = 0;
  const scores: number[] = [];
  const genreMap: Record<string, number> = {};
  const scoreMap: Record<number, number> = {};

  for (const item of targetItems) {
    byStatus[item.status]++;
    const isManga = item.kind === 'manga';

    if (isManga) {
      totalChaptersRead += item.currentChapter ?? 0;
      totalVolumesRead += item.currentVolume ?? 0;
    } else {
      totalEpisodesWatched += item.currentEpisode ?? 0;
      totalMinutes += (item.currentEpisode ?? 0) * (item.duration ?? 24);
    }

    if (item.score !== null && item.score > 0) {
      scores.push(item.score);
      scoreMap[item.score] = (scoreMap[item.score] ?? 0) + 1;
    }

    for (const genre of item.genres || []) {
      genreMap[genre] = (genreMap[genre] ?? 0) + 1;
    }
  }

  const activeCount = targetItems.length;

  const topGenres = Object.entries(genreMap)
    .map(([genre, count]) => ({
      genre,
      count,
      pct: activeCount > 0 ? Math.round((count / activeCount) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const ratedCount = scores.length;
  const scoreDist = Array.from({ length: 10 }, (_, i) => {
    const score = i + 1;
    const count = scoreMap[score] ?? 0;
    return {
      score,
      count,
      pct: ratedCount > 0 ? Math.round((count / ratedCount) * 100) : 0,
    };
  });

  let mostFrequentScore: { score: number; count: number } | null = null;
  for (const s of scoreDist) {
    if (s.count > 0 && (!mostFrequentScore || s.count > mostFrequentScore.count)) {
      mostFrequentScore = { score: s.score, count: s.count };
    }
  }

  const bestRatedCount = scores.filter((s) => s >= 9).length;
  const completed = byStatus.completed;
  const totalNonPlanned = targetItems.filter((a) => a.status !== 'planned').length;

  const totalHours = Math.round(totalMinutes / 60);
  const totalDays = Math.round((totalHours / 24) * 10) / 10;

  // Otaku Level Titles
  let otakuTitle = 'Iniciado del Anime & Manga';
  let otakuRank = '🌱 Rango Novato';

  if (totalHours >= 3000 || totalEpisodesWatched >= 8000 || totalChaptersRead >= 3500) {
    otakuTitle = 'Sensei Supremo del Anime';
    otakuRank = '👑 Rango Divino';
  } else if (totalHours >= 1500 || totalEpisodesWatched >= 4000 || totalChaptersRead >= 2000) {
    otakuTitle = 'Otaku Legendario';
    otakuRank = '🏆 Rango Maestro';
  } else if (totalHours >= 500 || totalEpisodesWatched >= 1500 || totalChaptersRead >= 800) {
    otakuTitle = 'Veterano Consagrado';
    otakuRank = '⭐ Rango Veterano';
  } else if (totalHours >= 100 || totalEpisodesWatched >= 300 || totalChaptersRead >= 200) {
    otakuTitle = 'Aficionado Dedicado';
    otakuRank = '🌸 Rango Intermedio';
  }

  return {
    scope,
    totalAnimes: allItems.length,
    totalAnime: totalAnimeCount,
    totalManga: totalMangaCount,
    activeTotal: activeCount,
    byStatus,
    byStatusAnime,
    byStatusManga,
    totalEpisodesWatched,
    totalHoursWatched: totalHours,
    totalDaysWatched: totalDays,
    totalChaptersRead,
    totalVolumesRead,
    averageScore:
      scores.length > 0 ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : null,
    topGenres,
    completionRate: totalNonPlanned > 0 ? Math.round((completed / totalNonPlanned) * 100) : 0,
    meanEpisodesPerAnime:
      totalAnimeCount > 0 ? Math.round(totalEpisodesWatched / totalAnimeCount) : 0,
    scoreDist,
    bestRatedCount,
    mostFrequentScore,
    otakuTitle,
    otakuRank,
  };
}
