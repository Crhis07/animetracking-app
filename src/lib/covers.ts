import { TrackedAnime } from './types';
import { getAnimeById, getMangaById } from './jikan';

interface AniListBatchResponse {
  data?: {
    Page?: {
      media?: Array<{
        idMal: number | null;
        coverImage?: { large?: string; medium?: string };
        bannerImage?: string | null;
        genres?: string[];
        description?: string | null;
        status?: string;
      }>;
    };
  };
}

/**
 * Fast batch cover image fetcher using AniList GraphQL API.
 * Fetches up to 50 items per single HTTP request.
 */
export async function batchFetchCovers(
  items: TrackedAnime[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<string, { cover: string; genres: string[]; synopsis: string; status: string }>> {
  const result = new Map<string, { cover: string; genres: string[]; synopsis: string; status: string }>();

  const animeList = items.filter((a) => (a.kind ?? 'anime') === 'anime' && !a.coverImage);
  const mangaList = items.filter((a) => a.kind === 'manga' && !a.coverImage);
  const totalToFetch = animeList.length + mangaList.length;

  if (totalToFetch === 0) return result;

  let processed = 0;

  // Helper to query AniList in chunks of 50
  async function queryChunk(chunk: TrackedAnime[], type: 'ANIME' | 'MANGA') {
    const ids = chunk.map((c) => c.malId).filter((id) => !isNaN(id) && id > 0);
    if (ids.length === 0) return;

    const query = `
      query ($ids: [Int], $type: MediaType) {
        Page(page: 1, perPage: 50) {
          media(idMal_in: $ids, type: $type) {
            idMal
            coverImage {
              large
              medium
            }
            genres
            description
            status
          }
        }
      }
    `;

    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ query, variables: { ids, type } }),
      });

      if (res.ok) {
        const json: AniListBatchResponse = await res.json();
        const mediaList = json.data?.Page?.media ?? [];
        for (const m of mediaList) {
          if (m.idMal) {
            const key = `${type.toLowerCase()}-${m.idMal}`;
            result.set(key, {
              cover: m.coverImage?.large ?? m.coverImage?.medium ?? '',
              genres: m.genres ?? [],
              synopsis: (m.description ?? '').replace(/<[^>]*>/g, ''),
              status: m.status ?? '',
            });
          }
        }
      }
    } catch (e) {
      console.warn('AniList batch lookup error:', e);
    }

    processed += chunk.length;
    onProgress?.(Math.min(processed, totalToFetch), totalToFetch);
  }

  // Process Anime in chunks of 50
  for (let i = 0; i < animeList.length; i += 50) {
    const chunk = animeList.slice(i, i + 50);
    await queryChunk(chunk, 'ANIME');
    // Polite delay
    await new Promise((r) => setTimeout(r, 200));
  }

  // Process Manga in chunks of 50
  for (let i = 0; i < mangaList.length; i += 50) {
    const chunk = mangaList.slice(i, i + 50);
    await queryChunk(chunk, 'MANGA');
    // Polite delay
    await new Promise((r) => setTimeout(r, 200));
  }

  return result;
}
