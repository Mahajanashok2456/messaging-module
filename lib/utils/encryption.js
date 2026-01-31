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
const generateIV = () => {
  return CryptoJS.lib.WordArray.random(16);
};

// Encrypt message with random IV
const encryptMessage = (message) => {
  try {
    if (!message || typeof message !== "string") {
      throw new Error("Invalid message for encryption");
    }
    
    const iv = generateIV();
    const encrypted = CryptoJS.AES.encrypt(message, ENCRYPTION_KEY, { iv });
    
    // Combine IV and encrypted data
    const combined = iv.concat(encrypted.ciphertext);
    return CryptoJS.enc.Base64.stringify(combined);
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Encryption failed");
  }
};

// Decrypt message with IV
const decryptMessage = (encryptedMessage) => {
  try {
    if (!encryptedMessage || typeof encryptedMessage !== "string") {
      throw new Error("Invalid encrypted message for decryption");
    }
    
    const combined = CryptoJS.enc.Base64.parse(encryptedMessage);
    const iv = CryptoJS.lib.WordArray.create(combined.words.slice(0, 4));
    const ciphertext = CryptoJS.lib.WordArray.create(combined.words.slice(4));
    
    const decrypted = CryptoJS.AES.decrypt({ ciphertext }, ENCRYPTION_KEY, { iv });
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Decryption failed");
  }
};

module.exports = {
  encryptMessage,
  decryptMessage,
};
