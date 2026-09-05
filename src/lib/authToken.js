export const AUTH_COOKIE_NAME = 'pv_auth';

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 ngày

function toBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - (str.length % 4)) % 4, '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function sign(secret, payload) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return toBase64Url(new Uint8Array(sig));
}

// Token = base64url(username) . hetHan(unix giây) . chữ ký HMAC(secret, "usernameEncoded.hetHan)
// Gắn với từng username + có hạn dùng riêng, khác với thiết kế cũ (1 token tĩnh dùng chung mọi tài khoản).
export async function createSessionToken(secret, username, ttlSeconds = SESSION_TTL_SECONDS) {
  const usernameEncoded = toBase64Url(new TextEncoder().encode(username));
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${usernameEncoded}.${exp}`;
  const sig = await sign(secret, payload);
  return `${payload}.${sig}`;
}

export async function verifySessionToken(secret, token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [usernameEncoded, expStr, sig] = parts;
  const payload = `${usernameEncoded}.${expStr}`;
  const expected = await sign(secret, payload);
  if (expected !== sig) return null;

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() / 1000 > exp) return null;

  try {
    const username = new TextDecoder().decode(fromBase64Url(usernameEncoded));
    return { username, exp };
  } catch {
    return null;
  }
}
