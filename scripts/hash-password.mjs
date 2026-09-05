// Tạo 1 tài khoản mới cho users.json.
// Chạy: node scripts/hash-password.mjs <username> <mật khẩu>
// rồi dán object JSON in ra vào mảng trong src/data/users.json, sau đó deploy lại.
import { generateSaltHex, derivePasswordHash } from '../src/lib/passwordHash.js';

const [, , username, password] = process.argv;

if (!username || !password) {
  console.error('Cách dùng: node scripts/hash-password.mjs <username> <mật khẩu>');
  process.exit(1);
}

const salt = generateSaltHex();
const hash = await derivePasswordHash(password, salt);

console.log('\nDán object sau vào mảng trong src/data/users.json:\n');
console.log(JSON.stringify({ username, salt, hash, active: true }, null, 2));
console.log('\nSau đó deploy lại để có hiệu lực.');
