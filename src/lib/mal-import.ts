import { TrackedAnime, AnimeStatus } from './types';
import { getAnimeById, jikanToTracked } from './jikan';

/**
 * Parses a MyAnimeList XML export file and converts it to TrackedAnime array.
 * MAL exports anime list as .xml or .xml.gz (extracted)
 *
 * XML structure:
 * <myanimelist>
 *   <myinfo>...</myinfo>
 *   <anime>
 *     <series_animedb_id>...</series_animedb_id>
 *     <series_title>...</series_title>
 *     <series_type>...</series_type>
 *     <series_episodes>...</series_episodes>
 *     <my_id>...</my_id>
 *     <my_watched_episodes>...</my_watched_episodes>
 *     <my_start_date>...</my_start_date>
 *     <my_finish_date>...</my_finish_date>
 *     <my_score>...</my_score>
 *     <my_status>...</my_status>     (1=Watching,2=Completed,3=On-Hold,4=Dropped,6=Plan to Watch)
 *     <my_comments>...</my_comments>
 *     <my_times_watched>...</my_times_watched>
 *     <update_on_import>...</update_on_import>
 *   </anime>
 * </myanimelist>
 */

const MAL_STATUS_MAP: Record<string, AnimeStatus> = {
  '1': 'watching',
  '2': 'completed',
  '3': 'on_hold',
  '4': 'dropped',
  '6': 'planned',
  // text form (some exports use text)
  'Watching': 'watching',
  'Completed': 'completed',
  'On-Hold': 'on_hold',
  'Dropped': 'dropped',
  'Plan to Watch': 'planned',
};

function getText(el: Element, tag: string): string {
  return el.querySelector(tag)?.textContent?.trim() ?? '';
}

function parseMALDate(dateStr: string): string | null {
  if (!dateStr || dateStr === '0000-00-00') return null;
  // format: YYYY-MM-DD
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
  userInfo: { username: string; totalAnime: number } | null;
  error?: string;
}

export function parseMALXML(xmlText: string): MALImportResult {
  let doc: Document;
  try {
    const parser = new DOMParser();
    doc = parser.parseFromString(xmlText, 'text/xml');
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return { entries: [], total: 0, userInfo: null, error: 'XML inválido o archivo corrupto.' };
    }
  } catch {
    return { entries: [], total: 0, userInfo: null, error: 'No se pudo parsear el archivo XML.' };
  }

  // Parse user info
  const myInfo = doc.querySelector('myinfo');
  const username = myInfo ? getText(myInfo, 'user_name') : '';
  const totalAnime = myInfo ? parseInt(getText(myInfo, 'user_total_anime') || '0') : 0;

  const animeNodes = doc.querySelectorAll('anime');
  if (animeNodes.length === 0) {
    return {
      entries: [],
      total: 0,
      userInfo: username ? { username, totalAnime } : null,
      error: 'No se encontraron animes en el archivo. ¿Es el export de tu animelist?',
    };
  }

  const entries: TrackedAnime[] = [];

  animeNodes.forEach((node) => {
    const malId = parseInt(getText(node, 'series_animedb_id'));
    if (!malId || isNaN(malId)) return;

    const title = getText(node, 'series_title');
    const type = getText(node, 'series_type');
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
      title,
      titleEnglish: null,    // XML doesn't include English title — enriched later if needed
      titleJapanese: null,
      coverImage: '',        // Will be filled from Jikan if needed, or left blank
      totalEpisodes: totalEps,
      currentEpisode: currentEp,
      status,
      score,
      notes,
      genres: [],
      year: null,
      season: null,
      type: type || 'TV',
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

  return {
    entries,
    total: animeNodes.length,
    userInfo: username ? { username, totalAnime } : null,
  };
}

/**
 * Enriches a batch of MAL entries with cover images and metadata from Jikan.
 * We only enrich the first N entries to avoid rate-limiting.
 * The rest get enriched lazily when the user interacts with them.
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
      onProgress?.(i + 1, toEnrich.length);
    } catch {
      // Skip enrichment on error, keep original data
    }
    // Rate limit: 400ms between calls
    if (i < toEnrich.length - 1) {
      await new Promise((r) => setTimeout(r, 450));
    }
  }

  return enriched;
}
