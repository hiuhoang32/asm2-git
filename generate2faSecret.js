const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const fs = require("fs");
const path = require("path");

// Generate a 2FA secret
const secret = speakeasy.generateSecret({ name: "ASM-2" });

console.log("Secret:", secret.base32);
console.log("URL:", secret.otpauth_url);

// Generate a QR code for scanning and save it as a PNG file
const qrFilePath = path.join(__dirname, "2fa-qr.png");

qrcode.toFile(qrFilePath, secret.otpauth_url, (err) => {
    if (err) {
        console.log("Error generating QR code:", err);
    } else {
        console.log(`QR Code saved to ${qrFilePath}`);
    }
});

// Optionally save the secret to a file for later use
const secretFilePath = path.join(__dirname, "2fa-secret.json");
fs.writeFileSync(secretFilePath, JSON.stringify({ base32: secret.base32 }));

console.log(`Secret saved to ${secretFilePath}`);
