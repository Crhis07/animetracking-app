import { AppStore, TrackedAnime, AnimeStatus } from './types';

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

export function getAnimes(): TrackedAnime[] {
  return loadStore().animes;
}

export function getAnime(malId: number): TrackedAnime | undefined {
  return loadStore().animes.find((a) => a.malId === malId);
}

export function upsertAnime(anime: TrackedAnime): void {
  const store = loadStore();
  const idx = store.animes.findIndex((a) => a.malId === anime.malId);
  anime.updatedAt = new Date().toISOString();
  if (idx === -1) {
    anime.addedAt = new Date().toISOString();
    store.animes.push(anime);
  } else {
    store.animes[idx] = { ...store.animes[idx], ...anime };
  }
  saveStore(store);
}

export function removeAnime(malId: number): void {
  const store = loadStore();
  store.animes = store.animes.filter((a) => a.malId !== malId);
  saveStore(store);
}

export function updateEpisode(malId: number, episode: number): void {
  const store = loadStore();
  const anime = store.animes.find((a) => a.malId === malId);
  if (!anime) return;
  anime.currentEpisode = Math.max(0, episode);
  anime.updatedAt = new Date().toISOString();
  // Auto-complete if finished
  if (anime.totalEpisodes && anime.currentEpisode >= anime.totalEpisodes) {
    anime.status = 'completed';
    anime.completedAt = new Date().toISOString();
  }
  saveStore(store);
}

export function updateScore(malId: number, score: number | null): void {
  const store = loadStore();
  const anime = store.animes.find((a) => a.malId === malId);
  if (!anime) return;
  anime.score = score;
  anime.updatedAt = new Date().toISOString();
  saveStore(store);
}

export function updateStatus(malId: number, status: AnimeStatus): void {
  const store = loadStore();
  const anime = store.animes.find((a) => a.malId === malId);
  if (!anime) return;
  anime.status = status;
  anime.updatedAt = new Date().toISOString();
  if (status === 'completed' && !anime.completedAt) {
    anime.completedAt = new Date().toISOString();
  }
  if (status === 'watching' && !anime.startedAt) {
    anime.startedAt = new Date().toISOString();
  }
  saveStore(store);
}

export function updateNotes(malId: number, notes: string): void {
  const store = loadStore();
  const anime = store.animes.find((a) => a.malId === malId);
  if (!anime) return;
  anime.notes = notes;
  anime.updatedAt = new Date().toISOString();
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
    // Merge: keep existing + add new from import
    const store = loadStore();
    let added = 0;
    for (const anime of data.animes) {
      const exists = store.animes.find((a) => a.malId === anime.malId);
      if (!exists) {
        store.animes.push(anime);
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
  byStatus: Record<AnimeStatus, number>;
  totalEpisodesWatched: number;
  totalHoursWatched: number;
  averageScore: number | null;
  topGenres: Array<{ genre: string; count: number }>;
  completionRate: number;
  meanEpisodesPerAnime: number;
  scoreDist: Array<{ score: number; count: number }>;
}

export function computeStats(): AnimeStats {
  const animes = getAnimes();
  const byStatus: Record<AnimeStatus, number> = {
    watching: 0,
    completed: 0,
    planned: 0,
    on_hold: 0,
    dropped: 0,
  };

  let totalEpisodesWatched = 0;
  let totalMinutes = 0;
  const scores: number[] = [];
  const genreMap: Record<string, number> = {};
  const scoreMap: Record<number, number> = {};

  for (const anime of animes) {
    byStatus[anime.status]++;
    totalEpisodesWatched += anime.currentEpisode;
    totalMinutes += anime.currentEpisode * (anime.duration ?? 24);

    if (anime.score !== null) {
      scores.push(anime.score);
      scoreMap[anime.score] = (scoreMap[anime.score] ?? 0) + 1;
    }

    for (const genre of anime.genres) {
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
    byStatus,
    totalEpisodesWatched,
    totalHoursWatched: Math.round(totalMinutes / 60),
    averageScore: scores.length > 0 ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10 : null,
    topGenres,
    completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
    meanEpisodesPerAnime:
      animes.length > 0 ? Math.round(totalEpisodesWatched / animes.length) : 0,
    scoreDist,
  };
}
