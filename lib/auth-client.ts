import { createAuthClient } from 'better-auth/react'

const baseURL = typeof window !== 'undefined' 
  ? window.location.origin 
  : (process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000')

export const authClient = createAuthClient({
  baseURL,
})

// Handle HMR chunk loading errors in iframe environments
if (typeof window !== 'undefined') {
  const originalError = console.error
  console.error = function(...args: any[]) {
    // Suppress HMR chunk load errors
    if (args[0]?.message?.includes?.('chunk') || args[0]?.includes?.('chunk')) {
      return
    }
    originalError.apply(console, args)
  }

  window.addEventListener('error', (event) => {
    if (event.message?.includes('chunk') || event.filename?.includes('turbopack')) {
      event.preventDefault()
    }
  }, true)

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('chunk') || event.reason?.toString?.()?.includes('chunk')) {
      event.preventDefault()
    }
  })
}
