const crypto = require('crypto');
const password = process.argv[2] || 'genesis2026';
const salt = crypto.randomBytes(24);
const hash = crypto.pbkdf2Sync(password, salt, 1000, 24, 'sha1');
console.log('Traccar PBKDF2 Hash Generator');
console.log('Password:', password);
console.log('Salt:', salt.toString('hex'));
console.log('Hash:', hash.toString('hex'));
console.log('');
console.log('SQL para inserir/atualizar:');
console.log(`UPDATE tc_users SET hashedpassword = '${hash.toString('hex')}', salt = '${salt.toString('hex')}' WHERE id = 1;
-- ou para novo usuário:
-- INSERT INTO tc_users (id, name, email, login, hashedpassword, salt, readonly, administrator, disabled, expirationtime, devicelimit, userlimit) VALUES (nextval('tc_users_id_seq'), 'admin', 'admin@genesisits.com.br', 'admin', '${hash.toString('hex')}', '${salt.toString('hex')}', false, true, false, '2030-12-31T23:59:59.000Z', -1, -1);`);
