import { JikanAnime, TrackedAnime, FavoriteCharacter, FavoritePerson } from './types';

const ANILIST_URL = 'https://graphql.anilist.co';
const JIKAN_BASE_URL = 'https://api.jikan.moe/v4';

/**
 * Executes a fetch with a strict timeout to prevent requests from hanging indefinitely.
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 6000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Maps an AniList media item into the universal JikanAnime format used across the app.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAniListToJikan(m: any): JikanAnime {
  const malId = m.idMal || m.id;
  const coverUrl = m.coverImage?.large ?? m.coverImage?.medium ?? '';
  const score = m.averageScore ? Math.round((m.averageScore / 10) * 10) / 10 : null;

  return {
    mal_id: malId,
    title: m.title?.romaji || m.title?.english || m.title?.native || 'Sin título',
    title_english: m.title?.english ?? null,
    title_japanese: m.title?.native ?? null,
    images: {
      jpg: { image_url: coverUrl, large_image_url: coverUrl },
      webp: { image_url: coverUrl, large_image_url: coverUrl },
    },
    episodes: m.episodes ?? null,
    chapters: m.chapters ?? null,
    volumes: m.volumes ?? null,
    status: m.status ?? '',
    score,
    genres: (m.genres ?? []).map((name: string) => ({ mal_id: 0, name })),
    year: m.startDate?.year ?? null,
    season: m.season ?? null,
    type: m.format ?? 'TV',
    duration: m.duration ? `${m.duration} min` : null,
    synopsis: (m.description ?? '').replace(/<[^>]*>/g, ''),
    aired: { from: m.startDate?.year ? `${m.startDate.year}` : null },
    published: { from: m.startDate?.year ? `${m.startDate.year}` : null },
  };
}

// ───── ANIME SEARCH & DISCOVERY (Ultra-fast AniList + Jikan Fallback) ─────

export async function searchAnime(
  query: string,
  page = 1
): Promise<{ data: JikanAnime[]; hasMore: boolean }> {
  // 1. Try AniList GraphQL (super fast, ~200ms, no rate-limiting)
  try {
    const gql = `
      query ($query: String, $page: Int) {
        Page(page: $page, perPage: 20) {
          pageInfo { hasNextPage }
          media(search: $query, type: ANIME, sort: SEARCH_MATCH) {
            id
            idMal
            title { romaji english native }
            coverImage { large medium }
            episodes
            format
            duration
            startDate { year }
            averageScore
            genres
            description
            status
          }
        }
      }
    `;

    const res = await fetchWithTimeout(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: gql, variables: { query, page } }),
    }, 6000);

    if (res.ok) {
      const json = await res.json();
      const mediaList = json.data?.Page?.media ?? [];
      const hasNextPage = json.data?.Page?.pageInfo?.hasNextPage ?? false;
      return {
        data: mediaList.map(mapAniListToJikan),
        hasMore: hasNextPage,
      };
    }
  } catch (e) {
    console.warn('AniList search failed, falling back to Jikan:', e);
  }

  // 2. Fallback to Jikan v4
  try {
    const url = `${JIKAN_BASE_URL}/anime?q=${encodeURIComponent(query)}&page=${page}&limit=20&sfw=false`;
    const res = await fetchWithTimeout(url, {}, 6000);
    if (!res.ok) throw new Error(`Jikan error ${res.status}`);
    const json = await res.json();
    return {
      data: json.data ?? [],
      hasMore: json.pagination?.has_next_page ?? false,
    };
  } catch {
    return { data: [], hasMore: false };
  }
}

export async function searchManga(
  query: string,
  page = 1
): Promise<{ data: JikanAnime[]; hasMore: boolean }> {
  // 1. Try AniList GraphQL
  try {
    const gql = `
      query ($query: String, $page: Int) {
        Page(page: $page, perPage: 20) {
          pageInfo { hasNextPage }
          media(search: $query, type: MANGA, sort: SEARCH_MATCH) {
            id
            idMal
            title { romaji english native }
            coverImage { large medium }
            chapters
            volumes
            format
            startDate { year }
            averageScore
            genres
            description
            status
          }
        }
      }
    `;

    const res = await fetchWithTimeout(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: gql, variables: { query, page } }),
    }, 6000);

    if (res.ok) {
      const json = await res.json();
      const mediaList = json.data?.Page?.media ?? [];
      const hasNextPage = json.data?.Page?.pageInfo?.hasNextPage ?? false;
      return {
        data: mediaList.map(mapAniListToJikan),
        hasMore: hasNextPage,
      };
    }
  } catch (e) {
    console.warn('AniList manga search failed, falling back to Jikan:', e);
  }

  // 2. Fallback to Jikan v4
  try {
    const url = `${JIKAN_BASE_URL}/manga?q=${encodeURIComponent(query)}&page=${page}&limit=20&sfw=false`;
    const res = await fetchWithTimeout(url, {}, 6000);
    if (!res.ok) throw new Error(`Jikan error ${res.status}`);
    const json = await res.json();
    return {
      data: json.data ?? [],
      hasMore: json.pagination?.has_next_page ?? false,
    };
  } catch {
    return { data: [], hasMore: false };
  }
}

export async function getTopAnime(): Promise<JikanAnime[]> {
  try {
    const gql = `
      query {
        Page(page: 1, perPage: 24) {
          media(sort: POPULARITY_DESC, type: ANIME) {
            id
            idMal
            title { romaji english native }
            coverImage { large medium }
            episodes
            format
            duration
            startDate { year }
            averageScore
            genres
            description
            status
          }
        }
      }
    `;

    const res = await fetchWithTimeout(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: gql }),
    }, 6000);

    if (res.ok) {
      const json = await res.json();
      return (json.data?.Page?.media ?? []).map(mapAniListToJikan);
    }
  } catch {
    // fallback
  }

  try {
    const url = `${JIKAN_BASE_URL}/top/anime?limit=24&filter=bypopularity`;
    const res = await fetchWithTimeout(url, {}, 6000);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function getTopManga(): Promise<JikanAnime[]> {
  try {
    const gql = `
      query {
        Page(page: 1, perPage: 24) {
          media(sort: POPULARITY_DESC, type: MANGA) {
            id
            idMal
            title { romaji english native }
            coverImage { large medium }
            chapters
            volumes
            format
            startDate { year }
            averageScore
            genres
            description
            status
          }
        }
      }
    `;

    const res = await fetchWithTimeout(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: gql }),
    }, 6000);

    if (res.ok) {
      const json = await res.json();
      return (json.data?.Page?.media ?? []).map(mapAniListToJikan);
    }
  } catch {
    // fallback
  }

  try {
    const url = `${JIKAN_BASE_URL}/top/manga?limit=24&filter=bypopularity`;
    const res = await fetchWithTimeout(url, {}, 6000);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function getSeasonalAnime(): Promise<JikanAnime[]> {
  try {
    const gql = `
      query {
        Page(page: 1, perPage: 24) {
          media(sort: POPULARITY_DESC, type: ANIME, status: RELEASING) {
            id
            idMal
            title { romaji english native }
            coverImage { large medium }
            episodes
            format
            duration
            startDate { year }
            averageScore
            genres
            description
            status
          }
        }
      }
    `;

    const res = await fetchWithTimeout(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: gql }),
    }, 6000);

    if (res.ok) {
      const json = await res.json();
      return (json.data?.Page?.media ?? []).map(mapAniListToJikan);
    }
  } catch {
    // fallback
  }

  try {
    const url = `${JIKAN_BASE_URL}/seasons/now?limit=24`;
    const res = await fetchWithTimeout(url, {}, 6000);
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function getAnimeById(malId: number): Promise<JikanAnime | null> {
  try {
    const url = `${JIKAN_BASE_URL}/anime/${malId}`;
    const res = await fetchWithTimeout(url, {}, 6000);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

export async function getMangaById(malId: number): Promise<JikanAnime | null> {
  try {
    const url = `${JIKAN_BASE_URL}/manga/${malId}`;
    const res = await fetchWithTimeout(url, {}, 6000);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
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
    year: manga.year ?? null,
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

// ───── CHARACTER & WAIFU SEARCH (AniList GraphQL) ─────

export async function searchCharacters(query: string): Promise<FavoriteCharacter[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const res = await fetchWithTimeout(
      ANILIST_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: `query ($search: String) {
            Page(page: 1, perPage: 12) {
              characters(search: $search) {
                id
                name {
                  full
                  native
                }
                image {
                  large
                }
                media(perPage: 1) {
                  nodes {
                    title {
                      romaji
                      english
                    }
                  }
                }
              }
            }
          }`,
          variables: { search: trimmed },
        }),
      },
      5000
    );

    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const characters = json?.data?.Page?.characters || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return characters.map((c: any) => ({
      id: c.id,
      name: c.name?.full || 'Sin nombre',
      nameNative: c.name?.native ?? null,
      image: c.image?.large || '',
      mediaTitle: c.media?.nodes?.[0]?.title?.romaji || c.media?.nodes?.[0]?.title?.english || null,
    }));
  } catch (err) {
    console.error('Error searching characters:', err);
    return [];
  }
}

// ───── SEIYUU & PEOPLE SEARCH (AniList GraphQL) ─────

export async function searchPeople(query: string): Promise<FavoritePerson[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  try {
    const res = await fetchWithTimeout(
      ANILIST_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          query: `query ($search: String) {
            Page(page: 1, perPage: 12) {
              staff(search: $search) {
                id
                name {
                  full
                  native
                }
                image {
                  large
                }
                primaryOccupations
              }
            }
          }`,
          variables: { search: trimmed },
        }),
      },
      5000
    );

    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const staff = json?.data?.Page?.staff || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return staff.map((s: any) => ({
      id: s.id,
      name: s.name?.full || 'Sin nombre',
      nameNative: s.name?.native ?? null,
      image: s.image?.large || '',
      occupations: s.primaryOccupations || [],
    }));
  } catch (err) {
    console.error('Error searching people:', err);
    return [];
  }
}

