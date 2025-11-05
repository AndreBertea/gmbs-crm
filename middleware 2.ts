import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const accessToken = req.cookies.get('sb-access-token')?.value || ''

  // Root redirect
  if (pathname === '/') {
    const url = req.nextUrl.clone()
    url.pathname = accessToken ? '/dashboard' : '/login'
    return NextResponse.redirect(url)
  }

  // If not authenticated, redirect to /login
  if (!accessToken) {
    const loginUrl = req.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

// Exclude static assets, images, favicon, and public auth endpoints; allow /login
export const config = {
  matcher: [
    // All paths except the ones starting with:
    // - _next/static (static files)
    // - _next/image (image optimization files)
    // - favicon.ico
    // - login (public login page)
    // - api/auth (auth endpoints)
    // - public files/extensions
    '/((?!_next/static|_next/image|favicon.ico|login|api/auth/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
