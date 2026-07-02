import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { db, pool } from './db'
import * as schema from './db/schema'

if (!process.env.NEON_AUTH_COOKIE_SECRET) {
  throw new Error('NEON_AUTH_COOKIE_SECRET environment variable is not set')
}

// Determine the base URL for auth
const getBaseURL = () => {
  if (process.env.BETTER_AUTH_URL) {
    return process.env.BETTER_AUTH_URL
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }
  // Fallback for v0 preview environment
  return process.env.V0_RUNTIME_URL || 'http://localhost:3000'
}

const baseURL = getBaseURL()

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  baseURL,
  basePath: '/api/auth',
  secret: process.env.NEON_AUTH_COOKIE_SECRET,
  trustedOrigins:
    process.env.NODE_ENV === 'development'
      ? ['*']
      : [
          baseURL,
          ...(process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? [`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`]
            : []),
          ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
        ].filter(Boolean),
  advanced: {
    defaultCookieAttributes: {
      sameSite: process.env.NODE_ENV === 'development' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'development',
    },
  },
})
