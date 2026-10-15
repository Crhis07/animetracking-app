import { NextRequest, NextResponse } from 'next/server';

interface FavItem {
  id: number;
  malId: number;
  title: string;
  image: string;
  kind: 'anime' | 'manga';
}

interface FavCharacter {
  id: number;
  name: string;
  image: string;
  mediaTitle?: string | null;
}

interface FavPerson {
  id: number;
  name: string;
  image: string;
}

function cleanImageUrl(url: string): string {
  if (!url || url.includes('spacer.gif')) return '';
  return url
    .replace(/\/r\/\d+x\d+\//g, '/')
    .replace(/\?s=[a-zA-Z0-9]+/, '')
    .trim();
}

function parseFavoritesFromHTML(html: string) {
  function parseSection(sectionId: string) {
    const sectionRegex = new RegExp(`id="${sectionId}"[\\s\\S]*?<\\/ul>`, 'i');
    const match = html.match(sectionRegex);
    if (!match) return [];
    const ulContent = match[0];
    const liRegex = /<li[^>]*class="[^"]*btn-fav[^"]*"[^>]*title="([^"]+)"[\s\S]*?href="([^"]+)"[\s\S]*?<img([^>]+)>/gi;
    const items = [];
    let m;
    while ((m = liRegex.exec(ulContent)) !== null) {
      const title = m[1];
      const url = m[2];
      const imgTag = m[3];
      const dataSrc = imgTag.match(/data-src="([^"]+)"/i);
      const src = imgTag.match(/src="([^"]+)"/i);
      const rawImg = dataSrc ? dataSrc[1] : src ? src[1] : '';
      const img = cleanImageUrl(rawImg);
      const idMatch = url.match(/\/(anime|manga|character|people)\/(\d+)/i);
      const id = idMatch ? parseInt(idMatch[2]) : 0;
      items.push({ title, url, img, id });
    }
    return items;
  }

  const animes: FavItem[] = parseSection('anime_favorites')
    .slice(0, 10)
    .map((x) => ({
      id: x.id,
      malId: x.id,
      title: x.title,
      image: x.img,
      kind: 'anime' as const,
    }));

  const mangas: FavItem[] = parseSection('manga_favorites')
    .slice(0, 10)
    .map((x) => ({
      id: x.id,
      malId: x.id,
      title: x.title,
      image: x.img,
      kind: 'manga' as const,
    }));

  const characters: FavCharacter[] = parseSection('character_favorites')
    .slice(0, 10)
    .map((x) => ({
      id: x.id,
      name: x.title,
      image: x.img,
    }));

  const people: FavPerson[] = (
    parseSection('person_favorites').length > 0
      ? parseSection('person_favorites')
      : parseSection('people_favorites')
  )
    .slice(0, 10)
    .map((x) => ({
      id: x.id,
      name: x.title,
      image: x.img,
    }));

  // Avatar match
  const avatarMatch = html.match(
    /<div class="user-image[^"]*">[\s\S]*?<img[^>]+(?:data-src|src)="([^"]+)"/i
  );
  const avatar = avatarMatch ? cleanImageUrl(avatarMatch[1]) : null;

  return { avatar, animes, mangas, characters, people };
}

export async function fetchMALProfile(username: string) {
  try {
    const res = await fetch(`https://myanimelist.net/profile/${encodeURIComponent(username)}`, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      next: { revalidate: 300 }, // Cache 5 min
    });

    if (!res.ok) return null;
    const html = await res.text();
    const parsed = parseFavoritesFromHTML(html);
    return {
      username,
      avatar: parsed.avatar,
      favorites: {
        animes: parsed.animes,
        mangas: parsed.mangas,
        characters: parsed.characters,
        people: parsed.people,
      },
    };
  } catch (err) {
    console.error('Error fetching MAL profile:', err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const username = searchParams.get('username')?.trim();

  if (!username) {
    return NextResponse.json({ error: 'Falta el parámetro username' }, { status: 400 });
  }

  const profileData = await fetchMALProfile(username);
  if (!profileData) {
    return NextResponse.json(
      { error: `Usuario "${username}" no encontrado o error de conexión con MyAnimeList.` },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ok: true,
    username: profileData.username,
    avatar: profileData.avatar,
    favorites: profileData.favorites,
  });
}
