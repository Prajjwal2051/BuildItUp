// This file contains functions for generating and validating share tokens for playgrounds.

import { createHmac, randomBytes } from 'crypto'

const SECRET = process.env.SHARE_LINK_SECRET! // this is the 32 byte random string in the .env file

export function generateShareToken(playgroundId: string): string {
    const nonce = randomBytes(16).toString('hex') // generate a random nonce

    const payload = `${playgroundId}:${nonce}`

    const sig = createHmac('sha256', SECRET).update(payload).digest('hex')

    // now return the URL- safe base64 of the combination of payload and sig
    const token = Buffer.from(`${payload}:${sig}`).toString('base64url')
    return token
}
