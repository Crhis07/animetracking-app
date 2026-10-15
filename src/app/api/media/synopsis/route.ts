import { NextRequest, NextResponse } from 'next/server';

interface AniListSingleResponse {
  data?: {
    Media?: {
      description?: string | null;
      title?: {
        romaji?: string;
        english?: string;
        native?: string;
      };
      genres?: string[];
      averageScore?: number;
    };
  };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const malIdStr = searchParams.get('malId');
  const typeStr = (searchParams.get('type') || 'anime').toUpperCase(); // 'ANIME' | 'MANGA'

  if (!malIdStr) {
    return NextResponse.json({ error: 'Missing malId parameter' }, { status: 400 });
  }

  const malId = parseInt(malIdStr, 10);
  if (isNaN(malId) || malId <= 0) {
    return NextResponse.json({ error: 'Invalid malId' }, { status: 400 });
  }

  const mediaType = typeStr === 'MANGA' ? 'MANGA' : 'ANIME';

  // 1. Try AniList GraphQL (ultra fast ~150ms, no strict rate limit)
  try {
    const query = `
      query ($id: Int, $type: MediaType) {
        Media(idMal: $id, type: $type) {
          description
          genres
          averageScore
        }
      }
    `;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables: { id: malId, type: mediaType } }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const json: AniListSingleResponse = await res.json();
      const rawDesc = json.data?.Media?.description;
      if (rawDesc && rawDesc.trim().length > 0) {
        const cleanSynopsis = rawDesc
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(/&quot;/g, '"')
          .replace(/&#039;/g, "'")
          .replace(/&amp;/g, '&')
          .trim();

        return NextResponse.json({
          synopsis: cleanSynopsis,
          genres: json.data?.Media?.genres ?? [],
          score: json.data?.Media?.averageScore ? json.data.Media.averageScore / 10 : null,
          source: 'anilist',
        });
      }
    }
  } catch (err) {
    console.warn('AniList synopsis fetch error, falling back to Jikan:', err);
  }

  // 2. Fallback to Jikan API
  try {
    const jikanType = mediaType === 'MANGA' ? 'manga' : 'anime';
    const jikanUrl = `https://api.jikan.moe/v4/${jikanType}/${malId}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4500);

    const res = await fetch(jikanUrl, { signal: controller.signal });
    clearTimeout(timeout);

    if (res.ok) {
      const json = await res.json();
      const synopsis = json.data?.synopsis || '';
      return NextResponse.json({
        synopsis: synopsis.trim(),
        genres: (json.data?.genres || []).map((g: { name: string }) => g.name),
        score: json.data?.score ?? null,
        source: 'jikan',
      });
    }
  } catch (err) {
    console.warn('Jikan synopsis fetch error:', err);
  }

  return NextResponse.json({
    synopsis: '',
    genres: [],
    score: null,
    source: 'none',
  });
}
