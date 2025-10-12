const CryptoJS = require('crypto-js');

// Encryption key - in production, this should be stored securely
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-characters!!';

// Encrypt message
const encryptMessage = (message) => {
  try {
    if (!message || typeof message !== 'string') {
      throw new Error('Invalid message for encryption');
    }
    const ciphertext = CryptoJS.AES.encrypt(message, ENCRYPTION_KEY).toString();
    return ciphertext;
  } catch (error) {
    console.error('Encryption error:', error);
    return message; // Return original message if encryption fails
  }
};

// Decrypt message
const decryptMessage = (encryptedMessage) => {
  try {
    if (!encryptedMessage || typeof encryptedMessage !== 'string') {
      throw new Error('Invalid encrypted message for decryption');
    }
    const bytes = CryptoJS.AES.decrypt(encryptedMessage, ENCRYPTION_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText;
  } catch (error) {
    console.error('Decryption error:', error);
    return encryptedMessage; // Return encrypted message if decryption fails
  }
};

module.exports = {
  encryptMessage,
  decryptMessage
};