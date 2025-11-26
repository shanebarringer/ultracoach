/**
 * Cryptographic utilities for secure token encryption/decryption
 *
 * Uses AES-256-GCM for authenticated encryption of sensitive data like OAuth tokens.
 * This provides both confidentiality (data is encrypted) and authenticity (tamper detection).
 *
 * Environment Variable Required:
 * - GARMIN_ENCRYPTION_KEY: 64-character hex string (32 bytes = 256 bits)
 *
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'crypto'

import { createLogger } from '@/lib/logger'

const logger = createLogger('crypto')

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12 // 96 bits - recommended for GCM
const TAG_LENGTH = 16 // 128 bits - GCM auth tag

/**
 * Get the encryption key from environment variables
 * @throws Error if GARMIN_ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.GARMIN_ENCRYPTION_KEY

  if (!keyHex) {
    logger.error('GARMIN_ENCRYPTION_KEY environment variable is not set')
    throw new Error('Encryption key not configured')
  }

  if (keyHex.length !== 64) {
    logger.error('GARMIN_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)')
    throw new Error('Invalid encryption key length')
  }

  return Buffer.from(keyHex, 'hex')
}

/**
 * Encrypt a plaintext string using AES-256-GCM
 *
 * Output format: iv:authTag:ciphertext (all base64 encoded)
 *
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format "iv:tag:ciphertext"
 * @throws Error if encryption fails or key is not configured
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)

    const cipher = createCipheriv(ALGORITHM, key, iv)
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()

    // Format: iv:authTag:ciphertext (all base64)
    const result = [
      iv.toString('base64'),
      authTag.toString('base64'),
      encrypted.toString('base64'),
    ].join(':')

    logger.debug('Token encrypted successfully', {
      plaintextLength: plaintext.length,
      ciphertextLength: encrypted.length,
    })

    return result
  } catch (error) {
    logger.error('Encryption failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    throw error
  }
}

/**
 * Decrypt a ciphertext string encrypted with AES-256-GCM
 *
 * @param ciphertext - The encrypted string in format "iv:tag:ciphertext"
 * @returns Decrypted plaintext string
 * @throws Error if decryption fails, tampering detected, or key is not configured
 */
export function decrypt(ciphertext: string): string {
  try {
    const key = getEncryptionKey()

    const parts = ciphertext.split(':')
    if (parts.length !== 3) {
      throw new Error('Invalid ciphertext format')
    }

    const [ivB64, tagB64, encryptedB64] = parts
    const iv = Buffer.from(ivB64, 'base64')
    const authTag = Buffer.from(tagB64, 'base64')
    const encrypted = Buffer.from(encryptedB64, 'base64')

    // Validate buffer sizes
    if (iv.length !== IV_LENGTH) {
      throw new Error('Invalid IV length')
    }
    if (authTag.length !== TAG_LENGTH) {
      throw new Error('Invalid auth tag length')
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()])

    logger.debug('Token decrypted successfully', {
      ciphertextLength: encrypted.length,
      plaintextLength: decrypted.length,
    })

    return decrypted.toString('utf8')
  } catch (error) {
    // Log specific error types for debugging
    if (error instanceof Error) {
      if (error.message.includes('Unsupported state or unable to authenticate data')) {
        logger.error('Decryption failed: Authentication failed (possible tampering or wrong key)')
      } else {
        logger.error('Decryption failed', { error: error.message })
      }
    }
    throw error
  }
}

/**
 * Check if a string appears to be encrypted (in our format)
 * Used to handle migration from base64-encoded to encrypted tokens
 *
 * @param value - The string to check
 * @returns true if the string appears to be in encrypted format
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false

  const parts = value.split(':')
  if (parts.length !== 3) return false

  // Check if all parts are valid base64
  try {
    const [ivB64, tagB64, encryptedB64] = parts
    const iv = Buffer.from(ivB64, 'base64')
    const tag = Buffer.from(tagB64, 'base64')
    Buffer.from(encryptedB64, 'base64')

    // Check expected lengths for our encryption format
    return iv.length === IV_LENGTH && tag.length === TAG_LENGTH
  } catch {
    return false
  }
}

/**
 * Create an HMAC signature for CSRF state parameter
 *
 * @param payload - The JSON string payload to sign
 * @returns Base64url-encoded HMAC signature
 */
export function createStateSignature(payload: string): string {
  const secret = process.env.CSRF_SECRET || process.env.GARMIN_ENCRYPTION_KEY

  if (!secret) {
    logger.error('CSRF_SECRET or GARMIN_ENCRYPTION_KEY environment variable is not set')
    throw new Error('CSRF secret not configured')
  }

  return createHmac('sha256', secret).update(payload).digest('base64url')
}

/**
 * Verify an HMAC signature for CSRF state parameter
 *
 * @param payload - The JSON string payload that was signed
 * @param signature - The signature to verify
 * @returns true if signature is valid
 */
export function verifyStateSignature(payload: string, signature: string): boolean {
  try {
    const expectedSignature = createStateSignature(payload)
    // Use timing-safe comparison
    if (signature.length !== expectedSignature.length) {
      return false
    }
    // Simple character-by-character comparison (Node's timingSafeEqual requires buffers)
    const sigBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)
    if (sigBuffer.length !== expectedBuffer.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < sigBuffer.length; i++) {
      result |= sigBuffer[i] ^ expectedBuffer[i]
    }
    return result === 0
  } catch {
    return false
  }
}

/**
 * Create a signed CSRF state parameter
 *
 * @param userId - The user ID to include in state
 * @returns Base64url-encoded state string with signature
 */
export function createSignedState(userId: string): string {
  const payload = JSON.stringify({
    userId,
    timestamp: Date.now(),
    nonce: randomBytes(8).toString('hex'),
  })

  const signature = createStateSignature(payload)
  return Buffer.from(`${payload}|${signature}`).toString('base64url')
}

/**
 * Verify and parse a signed CSRF state parameter
 *
 * @param state - The base64url-encoded state string
 * @param maxAgeMs - Maximum age of the state in milliseconds (default: 10 minutes)
 * @returns Parsed state object with userId and timestamp, or null if invalid
 */
export function verifySignedState(
  state: string,
  maxAgeMs: number = 10 * 60 * 1000
): { userId: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf8')
    const pipeIndex = decoded.lastIndexOf('|')

    if (pipeIndex === -1) {
      logger.warn('Invalid state format: missing signature separator')
      return null
    }

    const payload = decoded.slice(0, pipeIndex)
    const signature = decoded.slice(pipeIndex + 1)

    if (!verifyStateSignature(payload, signature)) {
      logger.warn('Invalid state: signature verification failed')
      return null
    }

    const parsed = JSON.parse(payload)

    // Check timestamp
    if (Date.now() - parsed.timestamp > maxAgeMs) {
      logger.warn('Invalid state: expired', {
        age: Date.now() - parsed.timestamp,
        maxAge: maxAgeMs,
      })
      return null
    }

    return {
      userId: parsed.userId,
      timestamp: parsed.timestamp,
    }
  } catch (error) {
    logger.error('Failed to verify state', {
      error: error instanceof Error ? error.message : 'Unknown error',
    })
    return null
  }
}
