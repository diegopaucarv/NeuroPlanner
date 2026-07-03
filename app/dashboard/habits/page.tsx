'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Habit {
  id: string
  name: string
  description?: string
  frequency: string
  streak: number
  isActive: boolean
  createdAt: Date
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([])
  const [newHabitName, setNewHabitName] = useState('')
  const [newHabitFrequency, setNewHabitFrequency] = useState('daily')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadHabits()
  }, [])

  const loadHabits = async () => {
    try {
      setLoading(true)
      // TODO: Create habits API endpoint
      setHabits([])
      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading habits')
      setLoading(false)
    }
  }

  const handleCreateHabit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newHabitName.trim()) return

    try {
      // TODO: Create API endpoint for habits
      // For now, add to local state
      const newHabit: Habit = {
        id: Math.random().toString(),
        name: newHabitName,
        frequency: newHabitFrequency,
        streak: 0,
        isActive: true,
        createdAt: new Date(),
      }
      setHabits([...habits, newHabit])
      setNewHabitName('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating habit')
    }
  }

  const handleCompleteHabit = async (id: string) => {
    try {
      // TODO: Create API endpoint to mark habit as completed
      setHabits(habits.map(h => h.id === id ? { ...h, streak: h.streak + 1 } : h))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error completing habit')
    }
  }

  const handleDeleteHabit = async (id: string) => {
    try {
      // TODO: Create API endpoint to delete habit
      setHabits(habits.filter(h => h.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting habit')
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Daily Habits</h1>
          <p className="text-muted-foreground">Build consistency with daily habit tracking</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Create New Habit */}
        <div className="bg-card p-6 rounded-lg border border-border mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Create New Habit</h2>
          <form onSubmit={handleCreateHabit} className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Enter habit name..."
                value={newHabitName}
                onChange={e => setNewHabitName(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
              />
              <select
                value={newHabitFrequency}
                onChange={e => setNewHabitFrequency(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </select>
              <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90">
                Create
              </button>
            </div>
          </form>
        </div>

        {/* Loading State */}
        {loading && <div className="text-center py-8 text-muted-foreground">Loading habits...</div>}

        {/* Habits List */}
        {!loading && habits.length > 0 && (
          <div className="space-y-4 mb-8">
            {habits.map(habit => (
              <HabitCard
                key={habit.id}
                habit={habit}
                onComplete={() => handleCompleteHabit(habit.id)}
                onDelete={() => handleDeleteHabit(habit.id)}
              />
            ))}
          </div>
        )}

        {!loading && habits.length === 0 && (
          <div className="bg-card p-6 rounded-lg border border-border text-center text-muted-foreground">
            No habits yet. Create one to get started!
          </div>
        )}

        {/* Navigation */}
        <div className="mt-12 flex gap-4">
          <Link href="/dashboard">
            <button className="px-4 py-2 border border-border rounded-md hover:bg-muted text-foreground">
              Back to Dashboard
            </button>
          </Link>
          <Link href="/dashboard/objectives">
            <button className="px-4 py-2 border border-border rounded-md hover:bg-muted text-foreground">
              View Objectives
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

function HabitCard({
  habit,
  onComplete,
  onDelete,
}: {
  habit: Habit
  onComplete: () => void
  onDelete: () => void
}) {
  return (
    <div className="bg-card p-6 rounded-lg border border-border space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-foreground">{habit.name}</h3>
          {habit.description && <p className="text-muted-foreground text-sm">{habit.description}</p>}
        </div>
        <button onClick={onDelete} className="text-sm text-destructive hover:text-destructive/80">
          Delete
        </button>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-medium text-foreground">Streak</span>
          <div className="text-2xl font-bold text-foreground">{habit.streak} days</div>
        </div>
        <div>
          <span className="text-sm font-medium text-foreground">Frequency</span>
          <div className="text-lg capitalize text-foreground">{habit.frequency}</div>
        </div>
      </div>

      <button onClick={onComplete} className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90">
        Mark Complete Today
      </button>
    </div>
  )
}
