import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const clientId = searchParams.get('clientId')?.trim() || process.env.MAL_CLIENT_ID || 'b0e945d953bd0d999d9e5c03a0b87404';
  const clientSecret = searchParams.get('clientSecret')?.trim() || process.env.MAL_CLIENT_SECRET || '2b428f14563cf0fb875ac240a10c239ca64b9ab67a18d3f642336c0fea3ad599';

  if (!clientId) {
    return NextResponse.json(
      { error: 'Debes proporcionar un Client ID de MyAnimeList. Créalo en https://myanimelist.net/apiconfig' },
      { status: 400 }
    );
  }

  // Generate PKCE code verifier (43-128 chars, alphanumeric)
  const codeVerifier = crypto.randomBytes(48).toString('base64url').slice(0, 80);
  const state = crypto.randomBytes(16).toString('hex');

  // Compute redirect URI using the current request origin
  const origin = req.nextUrl.origin;
  const redirectUri = `${origin}/api/mal/oauth/callback`;

  // Build MAL Authorize URL
  const authUrl = new URL('https://myanimelist.net/v1/oauth2/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('code_challenge', codeVerifier);
  authUrl.searchParams.set('code_challenge_method', 'plain');
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(authUrl.toString());

  // Store PKCE verifier, clientId, clientSecret and state in HTTP-only cookies
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10, // 10 minutes to complete auth
  };

  response.cookies.set('mal_pkce_verifier', codeVerifier, cookieOpts);
  response.cookies.set('mal_oauth_state', state, cookieOpts);
  response.cookies.set('mal_client_id', clientId, cookieOpts);
  if (clientSecret) {
    response.cookies.set('mal_client_secret', clientSecret, cookieOpts);
  }

  return response;
}
