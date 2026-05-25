import * as crypto from 'crypto';

const password = 'genesis2026';
const salt = crypto.randomBytes(24);
const hash = crypto.pbkdf2Sync(password, salt, 1000, 24, 'sha1');

console.log('Salt:', salt.toString('hex'));
console.log('Hash:', hash.toString('hex'));
