import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12  // 96-bit IV recommended for GCM
const TAG_LENGTH = 16 // 128-bit auth tag

function getEncryptionKey(): Buffer {
    const secret =
        process.env.AI_SETTINGS_SECRET ??
        process.env.AUTH_SECRET ??
        process.env.NEXTAUTH_SECRET ??
        process.env.BETTER_AUTH_SECRET
    if (!secret) {
        throw new Error(
            'Set AI_SETTINGS_SECRET or reuse AUTH_SECRET / NEXTAUTH_SECRET / BETTER_AUTH_SECRET',
        )
    }

    // Derive a stable 32-byte key from any non-empty secret so AES-256-GCM can
    // be used without forcing callers to manage raw key length.
    return createHash('sha256').update(secret, 'utf8').digest()
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
