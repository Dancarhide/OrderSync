import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'; // 32 bytes for AES-256
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
    
    let encrypted = cipher.update(String(text), 'utf8');
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

  /**
   * Encrypts a string to a safe formatted ciphertext string: "ENC[<base64>]".
   * Ideal for storing encrypted data in PostgreSQL VARCHAR or TEXT columns.
   */
  static encryptString(text: string | null | undefined): string {
    if (text === null || text === undefined || text === '') return '';
    const str = String(text);
    if (str.startsWith('ENC[') && str.endsWith(']')) {
      return str; // already encrypted
    }
    const buf = this.encrypt(str);
    return `ENC[${buf.toString('base64')}]`;
  }

  /**
   * Decrypts any value that is either a Buffer (BYTEA) or an "ENC[<base64>]" string.
   * If value is plaintext or unrecognized, safely returns the original value.
   */
  static decryptString(val: any): string {
    if (val === null || val === undefined) return '';
    if (Buffer.isBuffer(val)) {
      return this.decrypt(val);
    }
    if (typeof val === 'string') {
      if (val.startsWith('ENC[') && val.endsWith(']')) {
        try {
          const b64 = val.slice(4, -1);
          const buf = Buffer.from(b64, 'base64');
          return this.decrypt(buf);
        } catch {
          return val;
        }
      }
      return val;
    }
    return String(val);
  }

  /**
   * Encrypts a whole JSON object into a ciphertext string.
   */
  static encryptObject(obj: any): string {
    if (!obj) return '';
    return this.encryptString(JSON.stringify(obj));
  }

  /**
   * Decrypts and parses a JSON object.
   */
  static decryptObject<T = any>(val: any, fallback: T = {} as T): T {
    if (!val) return fallback;
    const decrypted = this.decryptString(val);
    try {
      return JSON.parse(decrypted);
    } catch {
      return fallback;
    }
  }
}
