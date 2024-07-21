const speakeasy = require('speakeasy');

// Example secret (base32 format)
const secret = '';

// Simulate OTP generation (on the client-side)
const token = speakeasy.totp({
  secret: secret,
  encoding: 'base32'
});
console.log('Generated OTP:', token);

// Simulate OTP verification (on the server-side)
const verified = speakeasy.totp.verify({
  secret: secret,
  encoding: 'base32',
  token: token, // Token should be from the client
  window: 1 // Allow a 1-period time window for minor drift (default is usually 1)
});

console.log('OTP Verified:', verified);
