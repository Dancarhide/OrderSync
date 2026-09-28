import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex'); // 32 bytes for AES-256
const IV_LENGTH = 16; // 16 bytes for AES

export class EncryptionService {
  /**
   * Encrypts text using AES-256-GCM.
   * Returns a Buffer that includes the IV, auth tag, and encrypted data.
   */
  static encrypt(text: string): Buffer {
    if (!text) return Buffer.from('');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
    
    let encrypted = cipher.update(text, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    
    // Structure: [IV (16 bytes)][AuthTag (16 bytes)][EncryptedData]
    return Buffer.concat([iv, authTag, encrypted]);
  }

  /**
   * Decrypts a Buffer that was encrypted using AES-256-GCM.
   */
  static decrypt(buffer: Buffer): string {
    if (!buffer || buffer.length === 0) return '';
    try {
      const iv = buffer.subarray(0, IV_LENGTH);
      const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16);
      const encryptedText = buffer.subarray(IV_LENGTH + 16);

      const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encryptedText);
      decrypted = Buffer.concat([decrypted, decipher.final()]);
      
      return decrypted.toString('utf8');
    } catch (error) {
      console.error('Decryption failed:', error);
      return '[Decryption Error]';
    }
  }
}
