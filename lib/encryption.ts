import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12  // 96-bit IV recommended for GCM
const TAG_LENGTH = 16 // 128-bit auth tag

function getEncryptionKey(): Buffer {
    const secret = process.env.AI_SETTINGS_SECRET
    if (!secret || secret.length < 32) {
        throw new Error(
            'AI_SETTINGS_SECRET env variable must be set and at least 32 characters long',
        )
    }
    // Use first 32 bytes of the secret as the key (AES-256 requires exactly 32 bytes)
    return Buffer.from(secret.slice(0, 32), 'utf8')
}

// Encrypts plaintext using AES-256-GCM. Returns a base64 string: iv:tag:ciphertext
export function encrypt(plaintext: string): string {
    const key = getEncryptionKey()
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, key, iv)

    const encrypted = Buffer.concat([
        cipher.update(plaintext, 'utf8'),
        cipher.final(),
    ])
    const tag = cipher.getAuthTag()

    return [
        iv.toString('base64'),
        tag.toString('base64'),
        encrypted.toString('base64'),
    ].join(':')
}

// Decrypts a base64 string produced by encrypt(). Throws if tampered.
export function decrypt(ciphertext: string): string {
    const key = getEncryptionKey()
    const parts = ciphertext.split(':')
    if (parts.length !== 3) {
        throw new Error('Invalid encrypted value format')
    }
    const [ivB64, tagB64, encB64] = parts
    const iv = Buffer.from(ivB64, 'base64')
    const tag = Buffer.from(tagB64, 'base64')
    const encryptedData = Buffer.from(encB64, 'base64')

    if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
        throw new Error('Invalid encrypted value: bad iv or tag length')
    }

    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)

    return Buffer.concat([
        decipher.update(encryptedData),
        decipher.final(),
    ]).toString('utf8')
}
