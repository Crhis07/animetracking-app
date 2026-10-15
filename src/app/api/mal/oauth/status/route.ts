import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const token = req.cookies.get('mal_access_token')?.value;
  const username = req.cookies.get('mal_oauth_user')?.value || '';

  if (!token) {
    return NextResponse.json({ authenticated: false });
  }

  return NextResponse.json({
    authenticated: true,
    username,
  });
}
