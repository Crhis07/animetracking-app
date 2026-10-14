export type AnimeStatus = 'watching' | 'completed' | 'planned' | 'on_hold' | 'dropped';

export interface TrackedAnime {
  id: number;              // MAL ID
  malId: number;
  title: string;
  titleEnglish: string | null;
  titleJapanese: string | null;
  coverImage: string;
  totalEpisodes: number | null;
  currentEpisode: number;
  status: AnimeStatus;
  score: number | null;    // 1-10, null = no rated
  notes: string;
  genres: string[];
  year: number | null;
  season: string | null;
  type: string;            // TV, Movie, OVA, etc.
  duration: number | null; // minutes per episode
  synopsis: string;
  addedAt: string;         // ISO date
  updatedAt: string;       // ISO date
  completedAt: string | null;
  startedAt: string | null;
  source: 'mal' | 'anilist' | 'manual';
  anilistId: number | null;
  malScore: number | null; // Community score
  airingStatus: string;    // 'Airing', 'Finished Airing', etc.
}

export interface AppStore {
  animes: TrackedAnime[];
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
  episodes: number | null;
  status: string;
  score: number | null;
  genres: Array<{ mal_id: number; name: string }>;
  year: number | null;
  season: string | null;
  type: string;
  duration: string | null;
  synopsis: string | null;
  aired: { from: string | null };
}

export interface AniListEntry {
  media: {
    id: number;
    idMal: number | null;
    title: { romaji: string; english: string | null; native: string | null };
    coverImage: { large: string };
    episodes: number | null;
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

export const STATUS_COLORS: Record<AnimeStatus, string> = {
  watching: '#4ade80',
  completed: '#60a5fa',
  planned: '#a78bfa',
  on_hold: '#fbbf24',
  dropped: '#f87171',
};

export const STATUS_ORDER: AnimeStatus[] = ['watching', 'completed', 'planned', 'on_hold', 'dropped'];
