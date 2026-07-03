'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface DashboardStats {
  totalObjectives: number
  completedObjectives: number
  activeHabits: number
  habitsCompletedToday: number
}

export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats>({
    totalObjectives: 0,
    completedObjectives: 0,
    activeHabits: 0,
    habitsCompletedToday: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const objectivesRes = await fetch('/api/objectives')
      const objectivesData = await objectivesRes.json()

      if (objectivesData.objectives) {
        const objectives = objectivesData.objectives
        setStats(prev => ({
          ...prev,
          totalObjectives: objectives.length,
          completedObjectives: objectives.filter((o: any) => o.progress === 1).length,
        }))
      }

      setLoading(false)
    } catch (error) {
      console.error('[v0] Failed to load stats:', error)
      setLoading(false)
    }
  }

  const handleLogout = () => {
    router.push('/sign-in')
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-foreground">NeuroPlanner</h1>
            <button
              onClick={handleLogout}
              className="px-4 py-2 border border-border rounded-md hover:bg-muted text-foreground"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Dashboard</h2>
          <p className="text-muted-foreground">Welcome back! Here's your progress overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Objectives"
            value={stats.totalObjectives}
            description="Goals, projects, and tasks"
          />
          <StatCard
            title="Completed"
            value={stats.completedObjectives}
            description="Finished objectives"
          />
          <StatCard
            title="Active Habits"
            value={stats.activeHabits}
            description="Daily habit templates"
          />
          <StatCard
            title="Today's Habits"
            value={stats.habitsCompletedToday}
            description="Completed today"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-card p-6 rounded-lg border border-border hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-bold text-foreground mb-2">Goals & Projects</h3>
            <p className="text-muted-foreground text-sm mb-4">Manage your long-term objectives and projects</p>
            <Link href="/dashboard/objectives">
              <button className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90">
                Manage Objectives
              </button>
            </Link>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border hover:shadow-lg transition-shadow">
            <h3 className="text-lg font-bold text-foreground mb-2">Daily Habits</h3>
            <p className="text-muted-foreground text-sm mb-4">Build and track your daily habits</p>
            <Link href="/dashboard/habits">
              <button className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90">
                Manage Habits
              </button>
            </Link>
          </div>
        </div>

        {/* Content Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-card p-6 rounded-lg border border-border">
            <h3 className="text-lg font-bold text-foreground mb-2">Goals</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Set long-term goals and track your progress toward your biggest aspirations.
            </p>
            <Link href="/dashboard/objectives">
              <button className="w-full px-4 py-2 border border-border rounded-md hover:bg-muted text-foreground text-sm">
                View Goals
              </button>
            </Link>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border">
            <h3 className="text-lg font-bold text-foreground mb-2">Projects</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Break down goals into manageable projects with specific milestones.
            </p>
            <Link href="/dashboard/objectives">
              <button className="w-full px-4 py-2 border border-border rounded-md hover:bg-muted text-foreground text-sm">
                View Projects
              </button>
            </Link>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border">
            <h3 className="text-lg font-bold text-foreground mb-2">Tasks</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create actionable tasks under your projects to stay focused on what matters.
            </p>
            <Link href="/dashboard/objectives">
              <button className="w-full px-4 py-2 border border-border rounded-md hover:bg-muted text-foreground text-sm">
                View Tasks
              </button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}

function StatCard({
  title,
  value,
  description,
}: {
  title: string
  value: number
  description: string
}) {
  return (
    <div className="bg-card p-6 rounded-lg border border-border">
      <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  )
}
