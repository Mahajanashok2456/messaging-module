const crypto = require("crypto");
const CryptoJS = require("crypto-js");

// Encryption key - must be provided via environment variable
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

if (!ENCRYPTION_KEY) {
  throw new Error("ENCRYPTION_KEY is required");
}

if (ENCRYPTION_KEY.length < 32) {
  throw new Error("ENCRYPTION_KEY must be at least 32 characters long");
}

const GCM_IV_LENGTH = 12;
const GCM_TAG_LENGTH = 16;

// Derive a fixed 256-bit key from ENCRYPTION_KEY
const getDerivedKey = () =>
  crypto.createHash("sha256").update(ENCRYPTION_KEY).digest();

// Encrypt message with AES-256-GCM (versioned format v3)
const encryptMessage = (message) => {
  try {
    if (!message || typeof message !== "string") {
      throw new Error("Invalid message for encryption");
    }

    const iv = crypto.randomBytes(GCM_IV_LENGTH);
    const key = getDerivedKey();
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const ciphertext = Buffer.concat([
      cipher.update(message, "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();

    const payload = [
      iv.toString("base64"),
      tag.toString("base64"),
      ciphertext.toString("base64"),
    ].join(":");

    return `v3:${payload}`;
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Encryption failed");
  }
};

// Decrypt message with AES-256-GCM (supports versioned and legacy formats)
const decryptMessage = (encryptedMessage) => {
  try {
    if (!encryptedMessage || typeof encryptedMessage !== "string") {
      return null;
    }

    // Versioned format v3: base64(iv):base64(tag):base64(ciphertext)
    if (encryptedMessage.startsWith("v3:")) {
      const payload = encryptedMessage.slice(3);
      const [ivB64, tagB64, ciphertextB64] = payload.split(":");
      if (!ivB64 || !tagB64 || !ciphertextB64) return null;

      const iv = Buffer.from(ivB64, "base64");
      const tag = Buffer.from(tagB64, "base64");
      const ciphertext = Buffer.from(ciphertextB64, "base64");

      if (iv.length !== GCM_IV_LENGTH || tag.length !== GCM_TAG_LENGTH) {
        return null;
      }

      const key = getDerivedKey();
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
      return decrypted.toString("utf8");
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
      const key = CryptoJS.SHA256(ENCRYPTION_KEY);
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
    const key = CryptoJS.SHA256(ENCRYPTION_KEY);
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
