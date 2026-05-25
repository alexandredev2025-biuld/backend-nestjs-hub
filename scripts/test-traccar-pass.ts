import * as crypto from 'crypto';

const passwords = ['genesis2026', '123456', 'admin123', 'traccar2026', 'senha123', 'dev_secret_123'];

// User 1: dev@genesisits.com.br
const storedHash = '67f3b204513cddc14e59944c822205345bf77c1f249db98e';
const storedSalt = '63c3a6b32273d192eecb0507a3aa4dcaa327375dbd4c8302';
console.log('=== dev@genesisits.com.br ===');
for (const pwd of passwords) {
  const hash = crypto.pbkdf2Sync(pwd, Buffer.from(storedSalt, 'hex'), 1000, 24, 'sha1').toString('hex');
  console.log(pwd, '=>', hash, hash === storedHash ? '<<< MATCH' : '');
}

// User 2: c.alexandre2000@gmail.com
const storedHash2 = '8c72cb133aee7ea24c9fbc362046f7459ae152d6ffa7aaee';
const storedSalt2 = 'a15ee1a18d6594e44ac8fb9391e54548a1adcb748f4028f1';
console.log('\n=== c.alexandre2000@gmail.com ===');
for (const pwd of passwords) {
  const hash = crypto.pbkdf2Sync(pwd, Buffer.from(storedSalt2, 'hex'), 1000, 24, 'sha1').toString('hex');
  console.log(pwd, '=>', hash, hash === storedHash2 ? '<<< MATCH' : '');
}
