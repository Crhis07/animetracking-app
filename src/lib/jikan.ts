import { JikanAnime, TrackedAnime } from './types';

const BASE_URL = 'https://api.jikan.moe/v4';

// Simple rate-limit helper: Jikan allows ~3 req/sec
let lastRequestTime = 0;
async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now();
  const diff = now - lastRequestTime;
  if (diff < 400) {
    await new Promise((r) => setTimeout(r, 400 - diff));
  }
  lastRequestTime = Date.now();
  return fetch(url);
}

// ───── ANIME ─────

export async function searchAnime(
  query: string,
  page = 1
): Promise<{ data: JikanAnime[]; hasMore: boolean }> {
  const url = `${BASE_URL}/anime?q=${encodeURIComponent(query)}&page=${page}&limit=20&sfw=false`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`Jikan API error: ${res.status}`);
  const json = await res.json();
  return {
    data: json.data ?? [],
    hasMore: json.pagination?.has_next_page ?? false,
  };
}

export async function getAnimeById(malId: number): Promise<JikanAnime | null> {
  const url = `${BASE_URL}/anime/${malId}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

export async function getSeasonalAnime(): Promise<JikanAnime[]> {
  const url = `${BASE_URL}/seasons/now?limit=24`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

export async function getTopAnime(): Promise<JikanAnime[]> {
  const url = `${BASE_URL}/top/anime?limit=24&filter=bypopularity`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

export function jikanToTracked(anime: JikanAnime): TrackedAnime {
  const durationMatch = anime.duration?.match(/(\d+)/);
  const duration = durationMatch ? parseInt(durationMatch[1]) : 24;

  return {
    id: anime.mal_id,
    malId: anime.mal_id,
    kind: 'anime',
    title: anime.title,
    titleEnglish: anime.title_english ?? null,
    titleJapanese: anime.title_japanese ?? null,
    coverImage: anime.images?.webp?.large_image_url ?? anime.images?.jpg?.large_image_url ?? '',
    totalEpisodes: anime.episodes ?? null,
    currentEpisode: 0,
    status: 'planned' as const,
    score: null,
    notes: '',
    genres: anime.genres?.map((g) => g.name) ?? [],
    year: anime.year ?? null,
    season: anime.season ?? null,
    type: anime.type ?? 'TV',
    duration,
    synopsis: anime.synopsis ?? '',
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    startedAt: null,
    source: 'mal' as const,
    anilistId: null,
    malScore: anime.score ?? null,
    airingStatus: anime.status ?? '',
  };
}

// ───── MANGA ─────

export async function searchManga(
  query: string,
  page = 1
): Promise<{ data: JikanAnime[]; hasMore: boolean }> {
  const url = `${BASE_URL}/manga?q=${encodeURIComponent(query)}&page=${page}&limit=20&sfw=false`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) throw new Error(`Jikan API error: ${res.status}`);
  const json = await res.json();
  return {
    data: json.data ?? [],
    hasMore: json.pagination?.has_next_page ?? false,
  };
}

export async function getMangaById(malId: number): Promise<JikanAnime | null> {
  const url = `${BASE_URL}/manga/${malId}`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

export async function getTopManga(): Promise<JikanAnime[]> {
  const url = `${BASE_URL}/top/manga?limit=24&filter=bypopularity`;
  const res = await rateLimitedFetch(url);
  if (!res.ok) return [];
  const json = await res.json();
  return json.data ?? [];
}

export function jikanMangaToTracked(manga: JikanAnime): TrackedAnime {
  return {
    id: manga.mal_id,
    malId: manga.mal_id,
    kind: 'manga',
    title: manga.title,
    titleEnglish: manga.title_english ?? null,
    titleJapanese: manga.title_japanese ?? null,
    coverImage: manga.images?.webp?.large_image_url ?? manga.images?.jpg?.large_image_url ?? '',
    totalEpisodes: null,
    currentEpisode: 0,
    totalChapters: manga.chapters ?? null,
    currentChapter: 0,
    totalVolumes: manga.volumes ?? null,
    currentVolume: 0,
    status: 'planned' as const,
    score: null,
    notes: '',
    genres: manga.genres?.map((g) => g.name) ?? [],
    year: manga.published?.from ? new Date(manga.published.from).getFullYear() : null,
    season: null,
    type: manga.type ?? 'Manga',
    duration: null,
    synopsis: manga.synopsis ?? '',
    addedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    startedAt: null,
    source: 'mal' as const,
    anilistId: null,
    malScore: manga.score ?? null,
    airingStatus: manga.status ?? '',
  };
}
