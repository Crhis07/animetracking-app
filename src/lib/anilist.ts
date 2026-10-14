import { AniListEntry, TrackedAnime, AnimeStatus } from './types';

const ANILIST_URL = 'https://graphql.anilist.co';

const LIST_QUERY = `
query ($userName: String, $page: Int) {
  Page(page: $page, perPage: 50) {
    pageInfo { hasNextPage }
    mediaList(userName: $userName, type: ANIME, sort: UPDATED_TIME_DESC) {
      status
      score(format: POINT_10)
      progress
      notes
      startedAt { year month day }
      completedAt { year month day }
      media {
        id
        idMal
        title { romaji english native }
        coverImage { large }
        episodes
        genres
        startDate { year }
        season
        format
        duration
        description(asHtml: false)
        averageScore
        status
      }
    }
  }
}`;

function anilistStatusToLocal(status: string): AnimeStatus {
  const map: Record<string, AnimeStatus> = {
    CURRENT: 'watching',
    COMPLETED: 'completed',
    PLANNING: 'planned',
    PAUSED: 'on_hold',
    DROPPED: 'dropped',
    REPEATING: 'watching',
  };
  return map[status] ?? 'planned';
}

function dateFromAniList(d: { year: number | null; month: number | null; day: number | null }): string | null {
  if (!d.year) return null;
  const m = String(d.month ?? 1).padStart(2, '0');
  const day = String(d.day ?? 1).padStart(2, '0');
  return `${d.year}-${m}-${day}T00:00:00.000Z`;
}

export async function importFromAniList(
  username: string,
  onProgress?: (page: number) => void
): Promise<{ entries: TrackedAnime[]; error?: string }> {
  const entries: TrackedAnime[] = [];
  let page = 1;
  let hasNext = true;

  while (hasNext) {
    onProgress?.(page);
    const res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: LIST_QUERY, variables: { userName: username, page } }),
    });

    if (!res.ok) {
      return { entries, error: `Error de AniList: ${res.status}` };
    }

    const json = await res.json();
    if (json.errors) {
      const msg = json.errors[0]?.message ?? 'Error desconocido';
      return { entries, error: `AniList: ${msg}` };
    }

    const pageData = json.data?.Page;
    const list: AniListEntry[] = pageData?.mediaList ?? [];
    hasNext = pageData?.pageInfo?.hasNextPage ?? false;

    for (const entry of list) {
      const media = entry.media;
      if (!media) continue;

      const malId = media.idMal ?? -(media.id); // negative for AniList-only entries
      entries.push({
        id: malId,
        malId,
        title: media.title.romaji,
        titleEnglish: media.title.english ?? null,
        titleJapanese: media.title.native ?? null,
        coverImage: media.coverImage.large,
        totalEpisodes: media.episodes ?? null,
        currentEpisode: entry.progress ?? 0,
        status: anilistStatusToLocal(entry.status),
        score: entry.score > 0 ? entry.score : null,
        notes: entry.notes ?? '',
        genres: media.genres ?? [],
        year: media.startDate?.year ?? null,
        season: media.season ?? null,
        type: media.format ?? 'TV',
        duration: media.duration ?? null,
        synopsis: media.description ?? '',
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        completedAt: dateFromAniList(entry.completedAt),
        startedAt: dateFromAniList(entry.startedAt),
        source: 'anilist',
        anilistId: media.id,
        malScore: media.averageScore ? media.averageScore / 10 : null,
        airingStatus: media.status ?? '',
      });
    }

    page++;
    if (page > 20) break; // safety limit
    await new Promise((r) => setTimeout(r, 500));
  }

  return { entries };
}
