import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('rag_token')?.value;
  const role = request.cookies.get('rag_role')?.value;
  const { pathname } = request.nextUrl;

  const isAuthRoute = pathname === '/login' || pathname === '/register';
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isChatRoute = pathname.startsWith('/chat');
  const isProtectedRoute = isDashboardRoute || isChatRoute;

  // 1. Unauthenticated users trying to access protected routes
  if (!token && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Non-admin users trying to access /dashboard
  if (token && isDashboardRoute && role !== 'admin') {
    const chatUrl = new URL('/chat', request.url);
    return NextResponse.redirect(chatUrl);
  }

  // 3. Authenticated users trying to access /login or /register
  if (token && isAuthRoute) {
    const targetUrl = role === 'admin' ? new URL('/dashboard', request.url) : new URL('/chat', request.url);
    return NextResponse.redirect(targetUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
