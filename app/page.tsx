'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authClient } from '@/lib/auth-client'

export default function Home() {
  const router = useRouter()
  const [session, setSession] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await authClient.getSession()
        if (!response.data?.session) {
          router.push('/sign-in')
          return
        }
        setSession(response.data.session)
      } catch (error) {
        router.push('/sign-in')
      } finally {
        setIsLoading(false)
      }
    }

    checkSession()
  }, [router])

  const handleSignOut = async () => {
    try {
      await authClient.signOut()
      router.push('/sign-in')
      router.refresh()
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-input shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-foreground">NeuroPlanner</h1>
          <button
            onClick={handleSignOut}
            className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md font-medium hover:bg-destructive/90 transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-card rounded-lg shadow-md p-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Welcome, {session?.user?.name || 'User'}!
          </h2>
          <p className="text-muted-foreground mb-6">
            Your NeuroPlanner web application is ready. This is the foundation for your planning system.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-muted rounded-lg p-6 border border-input">
              <h3 className="font-semibold text-foreground mb-2">Goals</h3>
              <p className="text-sm text-muted-foreground">
                Set and track your long-term objectives
              </p>
            </div>
            <div className="bg-muted rounded-lg p-6 border border-input">
              <h3 className="font-semibold text-foreground mb-2">Projects</h3>
              <p className="text-sm text-muted-foreground">
                Organize and manage your projects
              </p>
            </div>
            <div className="bg-muted rounded-lg p-6 border border-input">
              <h3 className="font-semibold text-foreground mb-2">Tasks</h3>
              <p className="text-sm text-muted-foreground">
                Break down your work into actionable tasks
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
