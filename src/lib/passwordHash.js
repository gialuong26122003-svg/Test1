// PBKDF2-SHA256 qua Web Crypto — chạy được cả trên Edge runtime (middleware/proxy)
// lẫn Node runtime (route handler, script CLI), luôn cho cùng 1 kết quả.
const ITERATIONS = 100000;
const KEY_LENGTH_BITS = 256;

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

export function generateSaltHex() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return bytesToHex(bytes);
}

export async function derivePasswordHash(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: hexToBytes(saltHex), iterations: ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH_BITS
  );
  return bytesToHex(new Uint8Array(bits));
}

// So sánh 2 chuỗi hex cùng độ dài theo thời gian không đổi, tránh timing attack.
export function timingSafeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
