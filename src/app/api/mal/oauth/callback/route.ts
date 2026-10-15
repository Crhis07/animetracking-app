import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const origin = req.nextUrl.origin;

  if (error || !code) {
    const errorMsg = error || 'Autorización cancelada o denegada en MyAnimeList.';
    return NextResponse.redirect(`${origin}/settings?oauth_error=${encodeURIComponent(errorMsg)}`);
  }

  const codeVerifier = req.cookies.get('mal_pkce_verifier')?.value;
  const savedState = req.cookies.get('mal_oauth_state')?.value;
  const clientId = req.cookies.get('mal_client_id')?.value || process.env.MAL_CLIENT_ID || 'b0e945d953bd0d999d9e5c03a0b87404';
  const clientSecret = req.cookies.get('mal_client_secret')?.value || process.env.MAL_CLIENT_SECRET || '2b428f14563cf0fb875ac240a10c239ca64b9ab67a18d3f642336c0fea3ad599';

  if (!codeVerifier || !clientId) {
    return NextResponse.redirect(
      `${origin}/settings?oauth_error=${encodeURIComponent('Sesión de autenticación expirada. Vuelve a intentarlo.')}`
    );
  }

  if (savedState && state && savedState !== state) {
    return NextResponse.redirect(
      `${origin}/settings?oauth_error=${encodeURIComponent('Error de validación de seguridad (state mismatch).')}`
    );
  }

  const redirectUri = `${origin}/api/mal/oauth/callback`;

  try {
    const bodyParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri,
    });

    const tokenRes = await fetch('https://myanimelist.net/v1/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error('MAL Token Exchange error:', errText);
      return NextResponse.redirect(
        `${origin}/settings?oauth_error=${encodeURIComponent(`Error al canjear token con MyAnimeList: ${errText}`)}`
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in || 2678400; // ~31 days

    // Fetch user profile from MAL API
    let username = '';
    let avatar = '';
    try {
      const userRes = await fetch('https://api.myanimelist.net/v2/users/@me', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        username = userData.name || '';
        avatar = userData.picture || '';
      }
    } catch (e) {
      console.warn('Error fetching user info from MAL:', e);
    }

    const response = NextResponse.redirect(`${origin}/settings?oauth=success`);

    const authCookieOpts = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: expiresIn,
    };

    // Store tokens
    response.cookies.set('mal_access_token', accessToken, authCookieOpts);
    if (refreshToken) {
      response.cookies.set('mal_refresh_token', refreshToken, {
        ...authCookieOpts,
        maxAge: 60 * 60 * 24 * 60, // 60 days
      });
    }

    // Store non-sensitive user metadata readable by client
    if (username) {
      response.cookies.set('mal_oauth_user', username, {
        ...authCookieOpts,
        httpOnly: false,
      });
    }

    // Clean up temporary cookies
    response.cookies.delete('mal_pkce_verifier');
    response.cookies.delete('mal_oauth_state');

    return response;
  } catch (err) {
    console.error('OAuth Callback general error:', err);
    return NextResponse.redirect(
      `${origin}/settings?oauth_error=${encodeURIComponent('Error inesperado al conectar con MyAnimeList.')}`
    );
  }
}
