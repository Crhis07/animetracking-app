import { AppStore, TrackedAnime, AnimeStatus, MediaKind } from './types';

const STORE_KEY = 'animelist_v1';
const STORE_VERSION = 1;

function getDefaultStore(): AppStore {
  return {
    animes: [],
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

// ───── STATS ─────

export interface AnimeStats {
  totalAnimes: number;
  totalAnime: number;
  totalManga: number;
  byStatus: Record<AnimeStatus, number>;
  byStatusAnime: Record<AnimeStatus, number>;
  byStatusManga: Record<AnimeStatus, number>;
  totalEpisodesWatched: number;
  totalHoursWatched: number;
  totalChaptersRead: number;
  totalVolumesRead: number;
  averageScore: number | null;
  topGenres: Array<{ genre: string; count: number }>;
  completionRate: number;
  meanEpisodesPerAnime: number;
  scoreDist: Array<{ score: number; count: number }>;
}

export function computeStats(): AnimeStats {
  const animes = loadStore().animes;
  const byStatus: Record<AnimeStatus, number> = {
    watching: 0,
    completed: 0,
    planned: 0,
    on_hold: 0,
    dropped: 0,
  };
  const byStatusAnime: Record<AnimeStatus, number> = { ...byStatus };
  const byStatusManga: Record<AnimeStatus, number> = { ...byStatus };

  let totalEpisodesWatched = 0;
  let totalMinutes = 0;
  let totalChaptersRead = 0;
  let totalVolumesRead = 0;
  let totalAnimeCount = 0;
  let totalMangaCount = 0;
  const scores: number[] = [];
  const genreMap: Record<string, number> = {};
  const scoreMap: Record<number, number> = {};

  for (const item of animes) {
    const isManga = item.kind === 'manga';
    byStatus[item.status]++;
    if (isManga) {
      totalMangaCount++;
      byStatusManga[item.status]++;
      totalChaptersRead += item.currentChapter ?? 0;
      totalVolumesRead += item.currentVolume ?? 0;
    } else {
      totalAnimeCount++;
      byStatusAnime[item.status]++;
      totalEpisodesWatched += item.currentEpisode ?? 0;
      totalMinutes += (item.currentEpisode ?? 0) * (item.duration ?? 24);
    }

    if (item.score !== null) {
      scores.push(item.score);
      scoreMap[item.score] = (scoreMap[item.score] ?? 0) + 1;
    }

    for (const genre of item.genres) {
      genreMap[genre] = (genreMap[genre] ?? 0) + 1;
    }
  }

  const topGenres = Object.entries(genreMap)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const scoreDist = Array.from({ length: 10 }, (_, i) => ({
    score: i + 1,
    count: scoreMap[i + 1] ?? 0,
  }));

  const completed = byStatus.completed;
  const total = animes.filter((a) => a.status !== 'planned').length;

  return {
    totalAnimes: animes.length,
    totalAnime: totalAnimeCount,
    totalManga: totalMangaCount,
    byStatus,
    byStatusAnime,
    byStatusManga,
    totalEpisodesWatched,
    totalHoursWatched: Math.round(totalMinutes / 60),
    totalChaptersRead,
    totalVolumesRead,
    averageScore: scores.length > 0 ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : null,
    topGenres,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    meanEpisodesPerAnime:
      totalAnimeCount > 0 ? Math.round(totalEpisodesWatched / totalAnimeCount) : 0,
    scoreDist,
  };
}
