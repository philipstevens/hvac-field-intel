import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Set a long-lived visitor cookie if not present
  if (!request.cookies.get('visitor_id')) {
    const visitorId = globalThis.crypto.randomUUID();
    response.cookies.set('visitor_id', visitorId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      httpOnly: false, // readable by client JS for optimistic UI
    });
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
