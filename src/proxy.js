import { NextResponse } from 'next/server';
import { computeAuthToken, AUTH_COOKIE_NAME } from '@/lib/authToken';

export const config = {
  matcher: ['/index.html', '/js/:path*', '/css/:path*'],
};

export async function proxy(request) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return new NextResponse('Server chưa cấu hình biến môi trường AUTH_SECRET', { status: 500 });
  }

  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const expected = await computeAuthToken(secret);
  if (cookie === expected) {
    return NextResponse.next();
  }

  return NextResponse.redirect(new URL('/login', request.url));
}
