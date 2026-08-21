export const AUTH_COOKIE_NAME = 'pv_auth';

const PAYLOAD = 'pv-yield-authenticated-v1';

function toBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// HMAC(secret, payload cố định) — dùng Web Crypto vì hàm này chạy được cả trên
// Edge runtime (middleware) lẫn Node runtime (route handler), cho ra cùng 1 kết quả.
export async function computeAuthToken(secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(PAYLOAD));
  return toBase64Url(sig);
}
