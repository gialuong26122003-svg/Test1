import { NextResponse } from 'next/server';
import { createSessionToken, AUTH_COOKIE_NAME } from '@/lib/authToken';
import { findUser, verifyPassword } from '@/lib/users';

export async function POST(request) {
  const { username, password } = await request.json();

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'Server chưa cấu hình biến môi trường AUTH_SECRET' }, { status: 500 });
  }

  const user = findUser(username);
  const passwordOk = user ? await verifyPassword(user, password) : false;
  if (!user || user.active === false || !passwordOk) {
    return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không đúng' }, { status: 401 });
  }

  const token = await createSessionToken(secret, user.username);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
