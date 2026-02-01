const CryptoJS = require("crypto-js");

// Encryption key - must be provided via environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is required");
}

if (ENCRYPTION_KEY.length < 32) {
  throw new Error("ENCRYPTION_KEY must be at least 32 characters long");
}

// Generate random IV for each encryption
const generateIV = () => CryptoJS.lib.WordArray.random(16);

// Derive a fixed 256-bit key from ENCRYPTION_KEY
const getDerivedKey = () => CryptoJS.SHA256(ENCRYPTION_KEY);

// Encrypt message with random IV (versioned format)
const encryptMessage = (message) => {
  try {
    if (!message || typeof message !== "string") {
      throw new Error("Invalid message for encryption");
    }

    const iv = generateIV();
    const key = getDerivedKey();
    const encrypted = CryptoJS.AES.encrypt(message, key, { iv });

    // Combine IV and encrypted data
    const combined = iv.concat(encrypted.ciphertext);
    return `v2:${CryptoJS.enc.Base64.stringify(combined)}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Encryption failed");
  }
};

// Decrypt message with IV (supports versioned and legacy formats)
const decryptMessage = (encryptedMessage) => {
  try {
    if (!encryptedMessage || typeof encryptedMessage !== "string") {
      return null;
    }

    // Versioned format v2: Base64(IV + ciphertext)
    if (encryptedMessage.startsWith("v2:")) {
      const payload = encryptedMessage.slice(3);
      const combined = CryptoJS.enc.Base64.parse(payload);
      const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
      const ciphertextBytes = Math.max(combined.sigBytes - 16, 0);
      const ciphertext = CryptoJS.lib.WordArray.create(
        combined.words.slice(4),
        ciphertextBytes,
      );
      const key = getDerivedKey();
      const decrypted = CryptoJS.AES.decrypt({ ciphertext }, key, { iv });
      return decrypted.toString(CryptoJS.enc.Utf8);
    }

    // Legacy CryptoJS OpenSSL format (Salted__)
    if (encryptedMessage.startsWith("U2FsdGVkX1")) {
      const decrypted = CryptoJS.AES.decrypt(encryptedMessage, ENCRYPTION_KEY);
      return decrypted.toString(CryptoJS.enc.Utf8);
    }

    // Legacy custom format (best-effort)
    const combined = CryptoJS.enc.Base64.parse(encryptedMessage);
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4), 16);
    const ciphertextBytes = Math.max(combined.sigBytes - 16, 0);
    const ciphertext = CryptoJS.lib.WordArray.create(
      combined.words.slice(4),
      ciphertextBytes,
    );
    const key = getDerivedKey();
    const decrypted = CryptoJS.AES.decrypt({ ciphertext }, key, { iv });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption error:", error);
    return null;
  }
};

module.exports = {
  encryptMessage,
  decryptMessage,
};
