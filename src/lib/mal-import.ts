import { TrackedAnime, AnimeStatus, MediaKind } from './types';
import { getAnimeById, getMangaById, jikanToTracked, jikanMangaToTracked } from './jikan';

const MAL_STATUS_MAP: Record<string, AnimeStatus> = {
  '1': 'watching',
  '2': 'completed',
  '3': 'on_hold',
  '4': 'dropped',
  '6': 'planned',
  // text form (anime and manga)
  'Watching': 'watching',
  'Reading': 'watching',
  'Completed': 'completed',
  'On-Hold': 'on_hold',
  'Dropped': 'dropped',
  'Plan to Watch': 'planned',
  'Plan to Read': 'planned',
};

function getText(el: Element, tag: string): string {
  return el.querySelector(tag)?.textContent?.trim() ?? '';
}

function parseMALDate(dateStr: string): string | null {
  if (!dateStr || dateStr === '0000-00-00') return null;
  try {
    const d = new Date(dateStr + 'T00:00:00.000Z');
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  } catch {
    return null;
  }
}

export interface MALImportResult {
  entries: TrackedAnime[];
  total: number;
  detectedKind: 'anime' | 'manga' | 'both';
  userInfo: { username: string; totalItems: number } | null;
  error?: string;
}

export function parseMALXML(xmlText: string): MALImportResult {
  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlText, 'text/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { entries: [], total: 0, detectedKind: 'anime', userInfo: null, error: 'XML inválido o archivo corrupto.' };
    }
  } catch {
    return { entries: [], total: 0, detectedKind: 'anime', userInfo: null, error: 'No se pudo parsear el archivo XML.' };
  }

  // Parse user info
  const myInfo = doc.querySelector('myinfo');
  const username = myInfo ? getText(myInfo, 'user_name') : '';
  const totalAnime = myInfo ? parseInt(getText(myInfo, 'user_total_anime') || '0') : 0;
  const totalManga = myInfo ? parseInt(getText(myInfo, 'user_total_manga') || '0') : 0;

  const animeNodes = doc.querySelectorAll('anime');
  const mangaNodes = doc.querySelectorAll('manga');

  if (animeNodes.length === 0 && mangaNodes.length === 0) {
    return {
      entries: [],
      total: 0,
      detectedKind: 'anime',
      userInfo: username ? { username, totalItems: totalAnime || totalManga } : null,
      error: 'No se encontraron registros de anime ni manga en el archivo. Verifica que sea tu exportación de MyAnimeList.',
    };
  }

  const entries: TrackedAnime[] = [];

  // Parse Anime
  animeNodes.forEach((node) => {
    const malId = parseInt(getText(node, 'series_animedb_id'));
    if (!malId || isNaN(malId)) return;

    const title = getText(node, 'series_title');
    const type = getText(node, 'series_type') || 'TV';
    const totalEps = parseInt(getText(node, 'series_episodes')) || null;
    const currentEp = parseInt(getText(node, 'my_watched_episodes')) || 0;
    const scoreRaw = parseInt(getText(node, 'my_score')) || 0;
    const score = scoreRaw > 0 ? scoreRaw : null;
    const statusRaw = getText(node, 'my_status');
    const status: AnimeStatus = MAL_STATUS_MAP[statusRaw] ?? 'planned';
    const notes = getText(node, 'my_comments');
    const startedAt = parseMALDate(getText(node, 'my_start_date'));
    const completedAt = parseMALDate(getText(node, 'my_finish_date'));
    const updatedAt = getText(node, 'my_last_updated')
      ? new Date(parseInt(getText(node, 'my_last_updated')) * 1000).toISOString()
      : new Date().toISOString();

    entries.push({
      id: malId,
      malId,
      kind: 'anime',
      title,
      titleEnglish: null,
      titleJapanese: null,
      coverImage: '',
      totalEpisodes: totalEps,
      currentEpisode: currentEp,
      status,
      score,
      notes,
      genres: [],
      year: null,
      season: null,
      type,
      duration: null,
      synopsis: '',
      addedAt: new Date().toISOString(),
      updatedAt,
      completedAt,
      startedAt,
      source: 'mal',
      anilistId: null,
      malScore: null,
      airingStatus: '',
    });
  });

  // Parse Manga
  mangaNodes.forEach((node) => {
    const malId = parseInt(getText(node, 'manga_mangadb_id'));
    if (!malId || isNaN(malId)) return;

    const title = getText(node, 'manga_title');
    const type = getText(node, 'series_type') || 'Manga';
    const totalChapters = parseInt(getText(node, 'manga_chapters')) || null;
    const totalVolumes = parseInt(getText(node, 'manga_volumes')) || null;
    const currentChapter = parseInt(getText(node, 'my_read_chapters')) || 0;
    const currentVolume = parseInt(getText(node, 'my_read_volumes')) || 0;
    const scoreRaw = parseInt(getText(node, 'my_score')) || 0;
    const score = scoreRaw > 0 ? scoreRaw : null;
    const statusRaw = getText(node, 'my_status');
    const status: AnimeStatus = MAL_STATUS_MAP[statusRaw] ?? 'planned';
    const notes = getText(node, 'my_comments');
    const startedAt = parseMALDate(getText(node, 'my_start_date'));
    const completedAt = parseMALDate(getText(node, 'my_finish_date'));
    const updatedAt = getText(node, 'my_last_updated')
      ? new Date(parseInt(getText(node, 'my_last_updated')) * 1000).toISOString()
      : new Date().toISOString();

    entries.push({
      id: malId,
      malId,
      kind: 'manga',
      title,
      titleEnglish: null,
      titleJapanese: null,
      coverImage: '',
      totalEpisodes: null,
      currentEpisode: 0,
      totalChapters,
      currentChapter,
      totalVolumes,
      currentVolume,
      status,
      score,
      notes,
      genres: [],
      year: null,
      season: null,
      type,
      duration: null,
      synopsis: '',
      addedAt: new Date().toISOString(),
      updatedAt,
      completedAt,
      startedAt,
      source: 'mal',
      anilistId: null,
      malScore: null,
      airingStatus: '',
    });
  });

  const detectedKind =
    animeNodes.length > 0 && mangaNodes.length > 0
      ? 'both'
      : mangaNodes.length > 0
      ? 'manga'
      : 'anime';

  return {
    entries,
    total: entries.length,
    detectedKind,
    userInfo: username ? { username, totalItems: totalAnime + totalManga || entries.length } : null,
  };
}

/**
 * Enriches a batch of MAL entries with cover images and metadata from Jikan.
 */
export async function enrichWithJikan(
  entries: TrackedAnime[],
  limit = 30,
  onProgress?: (done: number, total: number) => void
): Promise<TrackedAnime[]> {
  const enriched = [...entries];
  const toEnrich = enriched.slice(0, limit);

  for (let i = 0; i < toEnrich.length; i++) {
    const entry = toEnrich[i];
    try {
      if (entry.kind === 'manga') {
        const jikanData = await getMangaById(entry.malId);
        if (jikanData) {
          const base = jikanMangaToTracked(jikanData);
          enriched[i] = {
            ...entry,
            coverImage: base.coverImage || entry.coverImage,
            titleEnglish: base.titleEnglish,
            titleJapanese: base.titleJapanese,
            genres: base.genres.length > 0 ? base.genres : entry.genres,
            synopsis: base.synopsis || entry.synopsis,
            year: base.year ?? entry.year,
            malScore: base.malScore ?? entry.malScore,
            airingStatus: base.airingStatus || entry.airingStatus,
          };
        }
      } else {
        const jikanData = await getAnimeById(entry.malId);
        if (jikanData) {
          const base = jikanToTracked(jikanData);
          enriched[i] = {
            ...entry,
            coverImage: base.coverImage || entry.coverImage,
            titleEnglish: base.titleEnglish,
            titleJapanese: base.titleJapanese,
            genres: base.genres.length > 0 ? base.genres : entry.genres,
            duration: base.duration ?? entry.duration,
            synopsis: base.synopsis || entry.synopsis,
            year: base.year ?? entry.year,
            season: base.season ?? entry.season,
            malScore: base.malScore ?? entry.malScore,
            airingStatus: base.airingStatus || entry.airingStatus,
          };
        }
      }
      onProgress?.(i + 1, toEnrich.length);
    } catch {
      // Skip enrichment on error, keep original data
    }
    // Rate limit: 450ms between calls
    if (i < toEnrich.length - 1) {
      await new Promise((r) => setTimeout(r, 450));
    }
  }

  return enriched;
}
