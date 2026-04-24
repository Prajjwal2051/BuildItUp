/**
 * ===================================================================
 * PROPRIETARY CODE - BuildItUp
 * ===================================================================
 * This software and all code contained herein is the exclusive
 * property of Prajjwal Sahu (@Prajjwal2051).
 * 
 * Unauthorized copying, modification, distribution, or use of this
 * code or any part thereof is strictly prohibited and may result in
 * legal action.
 * 
 * Copyright © 2024-2025 Prajjwal Sahu
 * GitHub: https://github.com/Prajjwal2051
 * Repository: https://github.com/Prajjwal2051/BuildItUp
 * 
 * This codebase includes proprietary implementations of:
 * - Real-time collaboration engine
 * - AI integration systems
 * - WebContainer-based code execution
 * - Authentication and authorization layers
 * 
 * All rights reserved.
 * ===================================================================
 */

export const PROPRIETARY_INFO = {
    owner: 'Prajjwal Sahu',
    github: '@Prajjwal2051',
    email: 'prajjwal@builditup.dev',
    repository: 'https://github.com/Prajjwal2051/BuildItUp',
    copyright: '© 2024-2025 Prajjwal Sahu. All rights reserved.',
    license: 'PROPRIETARY - Unauthorized use prohibited',
    status: 'PROPRIETARY_CODE',
    buildDate: new Date().toISOString(),
} as const;

export const PROPRIETARY_HEADER = `
╔═══════════════════════════════════════════════════════════════╗
║                 PROPRIETARY CODE - BuildItUp                 ║
║          Owned and Maintained by Prajjwal Sahu               ║
║                  GitHub: @Prajjwal2051                       ║
║                                                               ║
║    Unauthorized copying or distribution is prohibited        ║
║              © 2024-2025 All Rights Reserved                 ║
╚═══════════════════════════════════════════════════════════════╝
`;

export const PROPRIETARY_WARNING = `
⚠️  WARNING: This code is PROPRIETARY and CONFIDENTIAL.
    Ownership: Prajjwal Sahu (@Prajjwal2051)
    Unauthorized use, copying, or distribution is strictly prohibited.
    Violations may result in legal action.
`;

/**
 * Logs proprietary warning (useful for development/testing)
 */
export function logProprietaryWarning() {
    if (process.env.NODE_ENV === 'development') {
        console.log(PROPRIETARY_HEADER);
    }
}

/**
 * Adds proprietary headers to API responses
 */
export function getProprietaryHeaders() {
    return {
        'X-Proprietary-Code': 'true',
        'X-Owner': PROPRIETARY_INFO.owner,
        'X-GitHub': PROPRIETARY_INFO.github,
        'X-Copyright': PROPRIETARY_INFO.copyright,
        'X-License': PROPRIETARY_INFO.license,
        'X-Protected': 'true',
    } as const;
}

/**
 * Validates if code is being used in an unauthorized context
 */
export function validateProprietaryUsage(context: string) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        context,
        owner: PROPRIETARY_INFO.owner,
        message: `Proprietary code accessed: ${context}`,
    };

    // In production, you might log this to a monitoring service
    if (process.env.NODE_ENV === 'production') {
        // Could integrate with analytics/logging service
        // console.log('[PROPRIETARY_ACCESS]', logEntry);
    }

    return logEntry;
}

/**
 * Creates a proprietary marker for embedded code
 */
export function getProprietaryMarker(): string {
    return `[PROPRIETARY: ${PROPRIETARY_INFO.owner} | ${PROPRIETARY_INFO.github}]`;
}
