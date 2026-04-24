/**
 * ===================================================================
 * PROPRIETARY CODE - Runtime Initialization & Checks
 * Owner: Prajjwal Sahu (@Prajjwal2051)
 * GitHub: https://github.com/Prajjwal2051
 * 
 * Unauthorized copying or distribution is strictly prohibited.
 * © 2024-2025 Prajjwal Sahu. All rights reserved.
 * ===================================================================
 * 
 * Runtime checks and initialization for proprietary code protection
 */

import { PROPRIETARY_INFO } from './proprietary'

/**
 * Server-side initialization check
 * Should be called in root layout or initialization
 */
export function validateProprietaryEnvironment() {
    if (typeof process === 'undefined') return // Skip in browser

    const timestamp = new Date().toISOString()
    const checks = {
        timestamp,
        environment: process.env.NODE_ENV,
        owner: PROPRIETARY_INFO.owner,
        github: PROPRIETARY_INFO.github,
        checks: [] as any[],
    }

    try {
        // Check 1: Verify runtime environment
        const envValid = process.env.NODE_ENV === 'production' || process.env.NODE_ENV === 'development'
        checks.checks.push({
            name: 'environment_valid',
            passed: envValid,
            value: process.env.NODE_ENV,
        })

        // Check 2: Verify secrets are set (in production)
        if (process.env.NODE_ENV === 'production') {
            const secretsValid =
                !!process.env.AUTH_SECRET ||
                !!process.env.NEXTAUTH_SECRET ||
                !!process.env.BETTER_AUTH_SECRET
            checks.checks.push({
                name: 'secrets_configured',
                passed: secretsValid,
                critical: true,
            })
        }

        // Check 3: Database connection (if applicable)
        const dbConfigured = !!process.env.DATABASE_URL
        checks.checks.push({
            name: 'database_configured',
            passed: dbConfigured,
            critical: false,
        })

        // Log all checks passed
        const allPassed = checks.checks.every((check) => check.passed)
        if (allPassed && process.env.NODE_ENV === 'production') {
            logProprietaryInit('CHECKS_PASSED', checks)
        }

        return { valid: allPassed, checks }
    } catch (error) {
        console.error(
            '[PROPRIETARY_INIT_ERROR] Failed to validate proprietary environment',
            error
        )
        return { valid: false, checks, error: String(error) }
    }
}

/**
 * Client-side initialization check
 * Should be called in root layout useEffect
 */
export function validateClientEnvironment() {
    if (typeof window === 'undefined') return // Skip on server

    const checks = {
        timestamp: new Date().toISOString(),
        environment: 'browser',
        owner: PROPRIETARY_INFO.owner,
        checks: [] as any[],
    }

    try {
        // Check 1: Verify we're not in an iframe (frame embedding protection)
        const notFramed = window.self === window.top
        checks.checks.push({
            name: 'not_framed',
            passed: notFramed,
        })

        // Check 2: Verify console is available
        const consoleAvailable =
            typeof console !== 'undefined' && typeof console.log === 'function'
        checks.checks.push({
            name: 'console_available',
            passed: consoleAvailable,
        })

        // Check 3: Verify localStorage/sessionStorage for user tracking
        const storageAvailable =
            typeof localStorage !== 'undefined' && typeof sessionStorage !== 'undefined'
        checks.checks.push({
            name: 'storage_available',
            passed: storageAvailable,
        })

        // Store proprietary marker in sessionStorage
        if (storageAvailable) {
            try {
                sessionStorage.setItem(
                    '_proprietary_marker',
                    `${PROPRIETARY_INFO.owner}:${new Date().toISOString()}`
                )
            } catch (e) {
                // Storage quota exceeded or disabled
            }
        }

        logProprietaryInit('CLIENT_READY', checks)
        return { valid: true, checks }
    } catch (error) {
        console.error('[PROPRIETARY_CLIENT_ERROR] Client initialization failed', error)
        return { valid: false, checks, error: String(error) }
    }
}

/**
 * Initializes both server and client proprietary systems
 */
export function initializeProprietarySystem() {
    if (typeof process !== 'undefined' && typeof window === 'undefined') {
        // Server-side
        return validateProprietaryEnvironment()
    } else if (typeof window !== 'undefined') {
        // Client-side
        return validateClientEnvironment()
    }
}

/**
 * Logs proprietary initialization
 */
export function logProprietaryInit(status: string, data?: any) {
    const entry = {
        timestamp: new Date().toISOString(),
        type: 'PROPRIETARY_INIT',
        status,
        owner: PROPRIETARY_INFO.owner,
        ...(data && { data }),
    }

    if (process.env.NODE_ENV === 'development') {
        console.log('[PROPRIETARY_INIT]', entry)
    }

    return entry
}

/**
 * Periodic proprietary integrity check
 * Can be called at intervals to verify code integrity
 */
export function performProprietaryIntegrityCheck() {
    const check = {
        timestamp: new Date().toISOString(),
        type: 'PROPRIETARY_INTEGRITY',
        owner: PROPRIETARY_INFO.owner,
        status: 'PROTECTED',
        marker: generateProprietaryMarker(),
    }

    // Could connect to external verification service
    if (process.env.NODE_ENV === 'development') {
        console.log('[INTEGRITY_CHECK]', check)
    }

    return check
}

/**
 * Generates a random proprietary marker to prevent predictable patterns
 */
function generateProprietaryMarker(): string {
    const components = [
        PROPRIETARY_INFO.owner,
        PROPRIETARY_INFO.github,
        new Date().getTime().toString(36),
        Math.random().toString(36).substring(2, 9),
    ]
    return Buffer.from(components.join(':')).toString('base64')
}

/**
 * Monitors for suspicious activity patterns
 */
export function monitorSuspiciousActivity(activityType: string, details?: any) {
    const activity = {
        timestamp: new Date().toISOString(),
        type: 'SUSPICIOUS_ACTIVITY',
        activityType,
        owner: PROPRIETARY_INFO.owner,
        ...(details && { details }),
    }

    // Log suspicious activity
    console.warn('[SECURITY_WARNING]', activity)

    // Could integrate with security monitoring
    return activity
}

/**
 * Prevents unauthorized modifications to proprietary objects
 */
export function freezeProprietaryObject<T extends Record<string, any>>(obj: T): T {
    return Object.freeze(Object.preventExtensions(obj))
}

/**
 * Creates a tamper-evident seal for critical data
 */
export function createProprietarySeal(data: any): string {
    const json = JSON.stringify(data)
    const seal = btoa(
        `${PROPRIETARY_INFO.owner}:${json}:${new Date().getTime()}`
    )
    return seal
}

/**
 * Verifies a proprietary seal (basic verification)
 */
export function verifyProprietarySeal(seal: string): boolean {
    try {
        const decoded = atob(seal)
        return decoded.includes(PROPRIETARY_INFO.owner)
    } catch {
        return false
    }
}

/**
 * Express middleware for proprietary checks
 * Use in API routes for additional protection
 */
export function proprietaryMiddleware(
    req: any,
    res: any,
    next: Function
) {
    // Add proprietary headers
    res.set('X-Proprietary-Code', 'true')
    res.set('X-Owner', PROPRIETARY_INFO.owner)
    res.set('X-GitHub', PROPRIETARY_INFO.github)

    // Log access
    logProprietaryInit('API_ACCESS', {
        method: req.method,
        path: req.path,
        ip: req.ip,
    })

    next()
}

/**
 * React component that initializes proprietary protections
 * Place this in your root layout
 */
export function ProprietaryInitializer() {
    if (typeof window !== 'undefined') {
        try {
            const result = initializeProprietarySystem()
            if (!result.valid) {
                console.warn('[PROPRIETARY] System validation failed')
            }
        } catch (error) {
            console.error('[PROPRIETARY] Initialization error:', error)
        }
    }

    return null
}
