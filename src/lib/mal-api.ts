import { AnimeStatus, MediaKind } from './types';

export interface MALOAuthStatus {
  authenticated: boolean;
  username?: string;
  avatar?: string;
}

/**
 * Checks if the current session has an active MAL OAuth token
 */
export async function checkMALOAuthStatus(): Promise<MALOAuthStatus> {
  try {
    const res = await fetch('/api/mal/oauth/status');
    if (!res.ok) return { authenticated: false };
    return await res.json();
  } catch {
    return { authenticated: false };
  }
}

/**
 * Sends an update to MyAnimeList in real-time if the user is authenticated via OAuth.
 * Executes silently in background without blocking local UI.
 */
export async function syncItemToMAL(params: {
  malId: number;
  kind?: MediaKind;
  status?: AnimeStatus;
  episode?: number;
  chapter?: number;
  volume?: number;
  score?: number | null;
  notes?: string;
}): Promise<boolean> {
  try {
    const res = await fetch('/api/mal/update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    return !!data.success;
  } catch (err) {
    console.warn('MAL background sync error:', err);
    return false;
  }
}
