import { NextResponse } from 'next/server';
import { computeAuthToken, AUTH_COOKIE_NAME } from '@/lib/authToken';

export async function POST(request) {
  const { username, password } = await request.json();

  const validUser = process.env.PV_ADMIN_USER;
  const validPass = process.env.PV_ADMIN_PASS;
  const secret = process.env.AUTH_SECRET;

  if (!validUser || !validPass || !secret) {
    return NextResponse.json({ error: 'Server chưa cấu hình tài khoản quản trị' }, { status: 500 });
  }

  if (username !== validUser || password !== validPass) {
    return NextResponse.json({ error: 'Tài khoản hoặc mật khẩu không đúng' }, { status: 401 });
  }

  const token = await computeAuthToken(secret);
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
