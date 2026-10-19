/**
 * Need2Done (N2D) — Cryptography Service
 * Provides secure encryption, decryption, and data masking for sensitive financial and PII fields.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = crypto.createHash('sha256').update(process.env.JWT_SECRET || 'n2d_secure_fallback_key_2026').digest();

/**
 * Encrypts a plaintext string (e.g., bank account number)
 */
function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
    let encrypted = cipher.update(String(text), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted string
 */
function decrypt(cipherText) {
    if (!cipherText || !cipherText.includes(':')) return null;
    try {
        const [ivHex, authTagHex, encryptedHex] = cipherText.split(':');
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Decryption failed:', err.message);
        return null;
    }
}

/**
 * Masks a sensitive string like an account number, showing only the last 4 characters
 */
function maskLast4(value) {
    if (!value) return '';
    const clean = String(value).trim();
    if (clean.length <= 4) return clean;
    return '••••••••' + clean.slice(-4);
}

module.exports = {
    encrypt,
    decrypt,
    maskLast4
};
