import { NextRequest, NextResponse } from 'next/server';
import { TrackedAnime, AnimeStatus } from '@/lib/types';

function cleanImageUrl(url: string): string {
  if (!url || url.includes('spacer.gif')) return '';
  return url
    .replace(/\/r\/\d+x\d+\//g, '/')
    .replace(/\?s=[a-zA-Z0-9]+/, '')
    .trim();
}

const MAL_STATUS_CODE_MAP: Record<number, AnimeStatus> = {
  1: 'watching',
  2: 'completed',
  3: 'on_hold',
  4: 'dropped',
  6: 'planned',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMALAnimeItem(item: any): TrackedAnime {
  const status: AnimeStatus = MAL_STATUS_CODE_MAP[item.status] ?? 'planned';
  const rawScore = typeof item.score === 'number' ? item.score : parseInt(item.score || '0');
  const score = rawScore > 0 ? rawScore : null;
  const malScore = typeof item.anime_score_val === 'number' ? item.anime_score_val : parseFloat(item.anime_score_val || '0') || null;
  const coverImage = cleanImageUrl(item.anime_image_path || '');
  const totalEpisodes = item.anime_num_episodes && item.anime_num_episodes > 0 ? item.anime_num_episodes : null;
  const currentEpisode = item.num_watched_episodes || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const genres = Array.isArray(item.genres) ? item.genres.map((g: any) => g.name || g).filter(Boolean) : [];

  let airingStatus = 'Finished';
  if (item.anime_airing_status === 1) airingStatus = 'Airing';
  else if (item.anime_airing_status === 2) airingStatus = 'Finished';
  else if (item.anime_airing_status === 3) airingStatus = 'Not yet aired';

  const updatedAt = item.updated_at
    ? new Date(item.updated_at * 1000).toISOString()
    : new Date().toISOString();

  return {
    id: item.anime_id,
    malId: item.anime_id,
    kind: 'anime',
    title: item.anime_title || 'Sin título',
    titleEnglish: item.anime_title_eng || null,
    titleJapanese: null,
    coverImage,
    totalEpisodes,
    currentEpisode,
    status,
    score,
    notes: item.notes || item.editable_notes || '',
    genres,
    year: null,
    season: item.anime_season?.season ? `${item.anime_season.season} ${item.anime_season.year || ''}` : null,
    type: item.anime_media_type_string || 'TV',
    duration: 24,
    synopsis: '',
    addedAt: item.created_at ? new Date(item.created_at * 1000).toISOString() : updatedAt,
    updatedAt,
    completedAt: status === 'completed' ? updatedAt : null,
    startedAt: item.start_date_string ? item.start_date_string : null,
    source: 'mal',
    anilistId: null,
    malScore,
    airingStatus,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapMALMangaItem(item: any): TrackedAnime {
  const status: AnimeStatus = MAL_STATUS_CODE_MAP[item.status] ?? 'planned';
  const rawScore = typeof item.score === 'number' ? item.score : parseInt(item.score || '0');
  const score = rawScore > 0 ? rawScore : null;
  const malScore = typeof item.manga_score_val === 'number' ? item.manga_score_val : parseFloat(item.manga_score_val || '0') || null;
  const coverImage = cleanImageUrl(item.manga_image_path || '');
  const totalChapters = item.manga_num_chapters && item.manga_num_chapters > 0 ? item.manga_num_chapters : null;
  const currentChapter = item.num_read_chapters || 0;
  const totalVolumes = item.manga_num_volumes && item.manga_num_volumes > 0 ? item.manga_num_volumes : null;
  const currentVolume = item.num_read_volumes || 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const genres = Array.isArray(item.genres) ? item.genres.map((g: any) => g.name || g).filter(Boolean) : [];

  let airingStatus = 'Finished';
  if (item.manga_publishing_status === 1) airingStatus = 'Publishing';
  else if (item.manga_publishing_status === 2) airingStatus = 'Finished';
  else if (item.manga_publishing_status === 3) airingStatus = 'Not yet published';

  const updatedAt = item.created_at
    ? new Date(item.created_at * 1000).toISOString()
    : new Date().toISOString();

  return {
    id: item.manga_id,
    malId: item.manga_id,
    kind: 'manga',
    title: item.manga_title || 'Sin título',
    titleEnglish: item.manga_english || null,
    titleJapanese: null,
    coverImage,
    totalEpisodes: null,
    currentEpisode: 0,
    totalChapters,
    currentChapter,
    totalVolumes,
    currentVolume,
    status,
    score,
    notes: item.notes || item.editable_notes || '',
    genres,
    year: null,
    season: null,
    type: item.manga_media_type_string || 'Manga',
    duration: null,
    synopsis: '',
    addedAt: updatedAt,
    updatedAt,
    completedAt: status === 'completed' ? updatedAt : null,
    startedAt: item.start_date_string ? item.start_date_string : null,
    source: 'mal',
    anilistId: null,
    malScore,
    airingStatus,
  };
}

async function fetchAllAnimeFromMAL(username: string): Promise<TrackedAnime[]> {
  const all: TrackedAnime[] = [];
  let offset = 0;
  const limit = 300;

  while (true) {
    const url = `https://myanimelist.net/animelist/${encodeURIComponent(username)}/load.json?offset=${offset}&status=7`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });

    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const item of data) {
      all.push(mapMALAnimeItem(item));
    }

    if (data.length < limit) break;
    offset += limit;
    // Safety cap to avoid infinite loops
    if (offset > 15000) break;
  }

  return all;
}

async function fetchAllMangaFromMAL(username: string): Promise<TrackedAnime[]> {
  const all: TrackedAnime[] = [];
  let offset = 0;
  const limit = 300;

  while (true) {
    const url = `https://myanimelist.net/mangalist/${encodeURIComponent(username)}/load.json?offset=${offset}&status=7`;
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'application/json',
      },
    });

    if (!res.ok) break;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) break;

    for (const item of data) {
      all.push(mapMALMangaItem(item));
    }

    if (data.length < limit) break;
    offset += limit;
    if (offset > 15000) break;
  }

  return all;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username')?.trim();

  if (!username) {
    return NextResponse.json({ error: 'Falta el parámetro username' }, { status: 400 });
  }

  try {
    // 1. Fetch Anime & Manga lists in parallel
    const [animes, mangas] = await Promise.all([
      fetchAllAnimeFromMAL(username),
      fetchAllMangaFromMAL(username),
    ]);

    // 2. Fetch Profile & Favorites
    let avatar: string | null = null;
    let favorites = {
      animes: [],
      mangas: [],
      characters: [],
      people: [],
    };

    try {
      const profileUrl = new URL('/api/mal/profile', req.url);
      profileUrl.searchParams.set('username', username);
      const profileRes = await fetch(profileUrl.toString());
      if (profileRes.ok) {
        const pData = await profileRes.json();
        avatar = pData.avatar || null;
        if (pData.favorites) {
          favorites = pData.favorites;
        }
      }
    } catch (e) {
      console.warn('Could not fetch favorites during sync:', e);
    }

    if (animes.length === 0 && mangas.length === 0 && !avatar) {
      return NextResponse.json(
        {
          error: `No se encontraron registros para el usuario "${username}". Verifica que el usuario sea público y esté bien escrito en MyAnimeList.`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ok: true,
      profile: {
        username,
        avatar,
        lastSyncedAt: new Date().toISOString(),
      },
      favorites,
      entries: [...animes, ...mangas],
      totalAnime: animes.length,
      totalManga: mangas.length,
    });
  } catch (err) {
    console.error('Error during MAL full sync:', err);
    return NextResponse.json(
      { error: 'Error durante la sincronización con MyAnimeList.' },
      { status: 500 }
    );
  }
}
