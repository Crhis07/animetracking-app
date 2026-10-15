import { NextRequest, NextResponse } from 'next/server';

function mapToMALAnimeStatus(status?: string): string {
  switch (status) {
    case 'watching': return 'watching';
    case 'completed': return 'completed';
    case 'on_hold': return 'on_hold';
    case 'dropped': return 'dropped';
    case 'planned': return 'plan_to_watch';
    default: return 'watching';
  }
}

function mapToMALMangaStatus(status?: string): string {
  switch (status) {
    case 'watching':
    case 'reading': return 'reading';
    case 'completed': return 'completed';
    case 'on_hold': return 'on_hold';
    case 'dropped': return 'dropped';
    case 'planned': return 'plan_to_read';
    default: return 'reading';
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('mal_access_token')?.value;

  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Usuario no autenticado con OAuth en MyAnimeList.' },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const { malId, kind, status, episode, chapter, volume, score, notes } = body;

    if (!malId) {
      return NextResponse.json({ success: false, error: 'malId requerido' }, { status: 400 });
    }

    const isManga = kind === 'manga';
    const endpoint = isManga
      ? `https://api.myanimelist.net/v2/manga/${malId}/my_list_status`
      : `https://api.myanimelist.net/v2/anime/${malId}/my_list_status`;

    const params = new URLSearchParams();

    if (isManga) {
      if (status) params.set('status', mapToMALMangaStatus(status));
      if (typeof chapter === 'number') params.set('num_chapters_read', chapter.toString());
      if (typeof volume === 'number') params.set('num_volumes_read', volume.toString());
    } else {
      if (status) params.set('status', mapToMALAnimeStatus(status));
      if (typeof episode === 'number') params.set('num_watched_episodes', episode.toString());
    }

    if (typeof score === 'number') {
      params.set('score', Math.min(10, Math.max(0, score)).toString());
    }

    if (typeof notes === 'string') {
      params.set('comments', notes);
    }

    const res = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.warn('MAL API update failed:', errText);
      return NextResponse.json({ success: false, error: errText }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error('Error updating MAL item:', err);
    return NextResponse.json({ success: false, error: 'Error interno al actualizar en MAL' }, { status: 500 });
  }
}
