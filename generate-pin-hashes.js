// Node.js Script zum Hashen der PINs
const crypto = require('crypto');

const adminPin = "00369";
const guestPin = "78963";

const adminHash = crypto.createHash('sha256').update(adminPin).digest('hex');
const guestHash = crypto.createHash('sha256').update(guestPin).digest('hex');

console.log('Admin PIN (00369) Hash:', adminHash);
console.log('Guest PIN (78963) Hash:', guestHash);
