'use client'

import { useRouter } from 'next/navigation'

export default function Dashboard() {
  const router = useRouter()

  const handleLogout = () => {
    router.push('/sign-in')
  }

  return (
    <div className="min-h-screen bg-background">
      <nav className="bg-card shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-foreground">NeuroPlanner</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-xl font-bold text-foreground mb-4">
          Welcome to NeuroPlanner
        </h2>
        <p className="text-foreground mb-6">
          You are successfully signed in! This is your dashboard.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-card p-6 rounded-lg shadow">
            <h3 className="font-bold text-foreground mb-2">Goals</h3>
            <p className="text-foreground text-sm">Manage your long-term goals</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow">
            <h3 className="font-bold text-foreground mb-2">Projects</h3>
            <p className="text-foreground text-sm">Track your projects</p>
          </div>
          <div className="bg-card p-6 rounded-lg shadow">
            <h3 className="font-bold text-foreground mb-2">Tasks</h3>
            <p className="text-foreground text-sm">Manage daily tasks</p>
          </div>
        </div>
      </main>
    </div>
  )
}
