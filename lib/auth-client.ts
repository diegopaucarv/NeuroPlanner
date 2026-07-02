import { createAuthClient } from 'better-auth/react'
import { useRouter } from 'next/navigation'

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_URL || '',
})

export const useAuth = () => {
  const router = useRouter()
  
  return {
    ...authClient,
    router,
  }
}
