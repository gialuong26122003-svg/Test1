import users from '@/data/users.json';
import { derivePasswordHash, timingSafeEqualHex } from './passwordHash';

export function findUser(username) {
  if (!username) return null;
  return users.find(u => u.username === username) ?? null;
}

export async function verifyPassword(user, password) {
  if (!user || !password) return false;
  const hash = await derivePasswordHash(password, user.salt);
  return timingSafeEqualHex(hash, user.hash);
}
