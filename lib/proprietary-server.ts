/**
 * ===================================================================
 * PROPRIETARY CODE - Server-Side Ownership Tracking
 * Owner: Prajjwal Sahu (@Prajjwal2051)
 * GitHub: https://github.com/Prajjwal2051
 * 
 * Unauthorized copying or distribution is strictly prohibited.
 * © 2024-2025 Prajjwal Sahu. All rights reserved.
 * ===================================================================
 * 
 * Server-side utilities for tracking proprietary code usage,
 * adding ownership markers to server actions, and monitoring access.
 */

import { PROPRIETARY_INFO } from './proprietary'

/**
 * Server Action Wrapper - Adds proprietary metadata to server actions
 * Use this to wrap server actions with ownership markers and logging
 * 
 * @example
 * export const myAction = withProprietaryAction('my-action', async (data) => {
 *   // Your server action logic
 *   return result
 * })
 */
export function withProprietaryAction<T extends (...args: any[]) => Promise<any>>(
    actionName: string,
    action: T
): T {
    return (async (...args: any[]) => {
        try {
            logProprietaryAction(actionName, 'started')

            const result = await action(...args)

            logProprietaryAction(actionName, 'completed')

            return result
        } catch (error) {
            logProprietaryAction(actionName, 'error', error)
            throw error
        }
    }) as T
}

/**
 * Logs proprietary action access
 */
export function logProprietaryAction(
    actionName: string,
    status: 'started' | 'completed' | 'error',
    error?: any
) {
    const timestamp = new Date().toISOString()
    const logEntry = {
        timestamp,
        type: 'PROPRIETARY_ACTION',
        action: actionName,
        status,
        owner: PROPRIETARY_INFO.owner,
        github: PROPRIETARY_INFO.github,
        ...(error && { error: error.message }),
    }

    // In production, could send to monitoring service
    if (process.env.NODE_ENV === 'development') {
        console.log(
            `[${PROPRIETARY_INFO.owner}] ${actionName}: ${status}`,
            logEntry
        )
    }

    return logEntry
}

/**
 * Database Operation Wrapper - Embeds ownership in DB operations
 */
export function withProprietaryDb<T>(operation: () => Promise<T>): Promise<T> {
    return (async () => {
        try {
            logProprietaryDbAccess('db_operation_started')
            const result = await operation()
            logProprietaryDbAccess('db_operation_completed')
            return result
        } catch (error) {
            logProprietaryDbAccess('db_operation_failed', error)
            throw error
        }
    })()
}

/**
 * Logs database access
 */
export function logProprietaryDbAccess(status: string, error?: any) {
    const logEntry = {
        timestamp: new Date().toISOString(),
        type: 'PROPRIETARY_DB_ACCESS',
        status,
        owner: PROPRIETARY_INFO.owner,
        ...(error && { error: error.message }),
    }

    if (process.env.NODE_ENV === 'development') {
        console.log(`[PROPRIETARY_DB] ${status}`, logEntry)
    }

    return logEntry
}

/**
 * Adds proprietary metadata to data objects
 * Useful for embedding ownership in returned data
 */
export function embedProprietaryMetadata<T extends Record<string, any>>(
    data: T,
    options?: {
        visible?: boolean // Make metadata visible in response
        encrypted?: boolean // Flag that data is encrypted
    }
): T & { _metadata?: any } {
    if (options?.visible) {
        return {
            ...data,
            _metadata: {
                owner: PROPRIETARY_INFO.owner,
                github: PROPRIETARY_INFO.github,
                proprietary: true,
                timestamp: new Date().toISOString(),
                repository: PROPRIETARY_INFO.repository,
            },
        }
    }

    return data
}

/**
 * Validates proprietary code integrity
 * Can be used to verify that code hasn't been tampered with
 */
export function getProprietaryChecksum(): string {
    const data = `${PROPRIETARY_INFO.owner}:${PROPRIETARY_INFO.github}:${PROPRIETARY_INFO.copyright}`
    // Simple checksum - in production could be more sophisticated
    return Buffer.from(data).toString('base64')
}

/**
 * Security marker for critical operations
 */
export const PROPRIETARY_SECURITY_MARKER = `
[PROPRIETARY_SECURITY]
Owner: ${PROPRIETARY_INFO.owner}
GitHub: ${PROPRIETARY_INFO.github}
Protected: YES
Unauthorized Access Prohibited
`

/**
 * Creates audit trail entry
 */
export function createProprietaryAuditEntry(
    action: string,
    details: Record<string, any> = {}
) {
    return {
        timestamp: new Date().toISOString(),
        action,
        owner: PROPRIETARY_INFO.owner,
        proprietary: true,
        status: 'PROTECTED',
        ...details,
    }
}

/**
 * Logs suspicious access attempts
 */
export function logSuspiciousAccess(
    source: string,
    reason: string,
    metadata?: any
) {
    const entry = {
        timestamp: new Date().toISOString(),
        type: 'SUSPICIOUS_ACCESS',
        source,
        reason,
        owner: PROPRIETARY_INFO.owner,
        security: 'BREACH_ATTEMPT',
        ...metadata,
    }

    console.warn(
        `⚠️  SECURITY WARNING: Suspicious access detected - ${reason}`,
        entry
    )

    // Could integrate with security monitoring service
    return entry
}

/**
 * Middleware to add proprietary context to server-side operations
 */
export function getProprietaryContext() {
    return {
        owner: PROPRIETARY_INFO.owner,
        github: PROPRIETARY_INFO.github,
        proprietary: true,
        timestamp: new Date().toISOString(),
        secure: true,
    }
}
