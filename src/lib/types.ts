export type AnimeStatus = 'watching' | 'completed' | 'planned' | 'on_hold' | 'dropped';
export type MediaKind = 'anime' | 'manga';

export interface TrackedAnime {
  id: number;              // MAL ID
  malId: number;
  kind?: MediaKind;        // 'anime' | 'manga' (defaults to 'anime')
  title: string;
  titleEnglish: string | null;
  titleJapanese: string | null;
  coverImage: string;
  totalEpisodes: number | null;
  currentEpisode: number;
  // Manga-specific progress
  totalChapters?: number | null;
  currentChapter?: number;
  totalVolumes?: number | null;
  currentVolume?: number;
  status: AnimeStatus;     // for manga: 'watching' means 'reading'
  score: number | null;    // 1-10, null = unrated
  notes: string;
  genres: string[];
  year: number | null;
  season: string | null;
  type: string;            // TV, Movie, Manga, Light Novel, Manhwa, etc.
  duration: number | null; // minutes per episode (anime)
  synopsis: string;
  addedAt: string;         // ISO date
  updatedAt: string;       // ISO date
  completedAt: string | null;
  startedAt: string | null;
  source: 'mal' | 'anilist' | 'manual';
  anilistId: number | null;
  malScore: number | null; // Community score
  airingStatus: string;    // 'Airing', 'Finished', 'Publishing', etc.
}

export interface FavoriteItem {
  id: number;
  malId: number;
  title: string;
  image: string;
  kind: 'anime' | 'manga';
  score?: number | null;
}

export interface FavoriteCharacter {
  id: number | string;
  name: string;
  nameNative?: string | null;
  image: string;
  mediaTitle?: string | null;
}

export interface FavoritePerson {
  id: number | string;
  name: string;
  nameNative?: string | null;
  image: string;
  occupations?: string[];
}

export interface UserFavorites {
  animes: FavoriteItem[];
  mangas: FavoriteItem[];
  characters: FavoriteCharacter[];
  people: FavoritePerson[];
}

export interface AppStore {
  animes: TrackedAnime[];
  favorites?: UserFavorites;
  version: number;
  lastExport: string | null;
}

export interface JikanAnime {
  mal_id: number;
  title: string;
  title_english: string | null;
  title_japanese: string | null;
  images: {
    jpg: { image_url: string; large_image_url: string };
    webp: { image_url: string; large_image_url: string };
  };
  episodes?: number | null;
  chapters?: number | null;
  volumes?: number | null;
  status: string;
  score: number | null;
  genres: Array<{ mal_id: number; name: string }>;
  year: number | null;
  season: string | null;
  type: string;
  duration?: string | null;
  synopsis: string | null;
  aired?: { from: string | null };
  published?: { from: string | null };
}

export interface AniListEntry {
  media: {
    id: number;
    idMal: number | null;
    title: { romaji: string; english: string | null; native: string | null };
    coverImage: { large: string };
    episodes: number | null;
    chapters?: number | null;
    volumes?: number | null;
    genres: string[];
    startDate: { year: number | null };
    season: string | null;
    format: string;
    duration: number | null;
    description: string | null;
    averageScore: number | null;
    status: string;
  };
  status: string;
  score: number;
  progress: number;
  progressVolumes?: number;
  notes: string | null;
  startedAt: { year: number | null; month: number | null; day: number | null };
  completedAt: { year: number | null; month: number | null; day: number | null };
}

export const STATUS_LABELS: Record<AnimeStatus, string> = {
  watching: 'Viendo',
  completed: 'Completado',
  planned: 'Planeado',
  on_hold: 'En Espera',
  dropped: 'Dropeado',
};

export const STATUS_LABELS_MANGA: Record<AnimeStatus, string> = {
  watching: 'Leyendo',
  completed: 'Completado',
  planned: 'Por Leer',
  on_hold: 'En Espera',
  dropped: 'Dropeado',
};

export function getStatusLabel(status: AnimeStatus, kind?: MediaKind): string {
  if (kind === 'manga') {
    return STATUS_LABELS_MANGA[status] ?? STATUS_LABELS[status];
  }
  return STATUS_LABELS[status];
}

export const STATUS_COLORS: Record<AnimeStatus, string> = {
  watching: '#4ade80',
  completed: '#60a5fa',
  planned: '#a78bfa',
  on_hold: '#fbbf24',
  dropped: '#f87171',
};

export const STATUS_ORDER: AnimeStatus[] = ['watching', 'completed', 'planned', 'on_hold', 'dropped'];
