/**
 * ===================================================================
 * PROPRIETARY CODE - BuildItUp Next.js Configuration
 * Owner: Prajjwal Sahu (@Prajjwal2051)
 * GitHub: https://github.com/Prajjwal2051
 * 
 * Unauthorized copying or distribution is strictly prohibited.
 * © 2024-2025 Prajjwal Sahu. All rights reserved.
 * ===================================================================
 */

import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
          // ─── Proprietary Code Headers ────────────────────────────────────
          {
            key: 'X-Proprietary-Code',
            value: 'true',
          },
          {
            key: 'X-Owner',
            value: 'Prajjwal Sahu',
          },
          {
            key: 'X-GitHub',
            value: '@Prajjwal2051',
          },
          {
            key: 'X-Copyright',
            value: '© 2024-2025 Prajjwal Sahu. All rights reserved.',
          },
          {
            key: 'X-License',
            value: 'PROPRIETARY - Unauthorized use prohibited',
          },
          {
            key: 'X-Protected',
            value: 'true',
          },
          {
            key: 'X-Repository',
            value: 'https://github.com/Prajjwal2051/BuildItUp',
          },
        ],
      },
      // ─── API Routes: Enhanced Proprietary Protection ────────────────────
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'X-Proprietary-Code',
            value: 'true',
          },
          {
            key: 'X-Owner',
            value: 'Prajjwal Sahu',
          },
          {
            key: 'X-GitHub',
            value: '@Prajjwal2051',
          },
          {
            key: 'X-Copyright',
            value: '© 2024-2025 Prajjwal Sahu. All rights reserved.',
          },
          {
            key: 'X-License',
            value: 'PROPRIETARY - Unauthorized use prohibited',
          },
          {
            key: 'X-Protected',
            value: 'true',
          },
          {
            key: 'X-Repository',
            value: 'https://github.com/Prajjwal2051/BuildItUp',
          },
          {
            key: 'X-API-Access-Logged',
            value: 'true',
          },
        ],
      },
    ]
  },
}

export default nextConfig
