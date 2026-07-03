'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Objective {
  id: string
  title: string
  description?: string
  type: 'Goal' | 'Project' | 'Task'
  progress: number
  isActive: boolean
  parentId?: string
  dueDate?: number
}

export default function ObjectivesPage() {
  const [objectives, setObjectives] = useState<Objective[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [objectiveType, setObjectiveType] = useState<'Goal' | 'Project' | 'Task'>('Goal')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadObjectives()
  }, [])

  const loadObjectives = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/objectives')
      if (!response.ok) throw new Error('Failed to load objectives')
      const data = await response.json()
      setObjectives(data.objectives || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading objectives')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateObjective = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    try {
      const response = await fetch('/api/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          type: objectiveType,
          description: '',
          progress: 0,
          isActive: true,
        }),
      })

      if (!response.ok) throw new Error('Failed to create objective')

      const data = await response.json()
      setObjectives([...objectives, data.objective])
      setNewTitle('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating objective')
    }
  }

  const handleUpdateProgress = async (id: string, newProgress: number) => {
    try {
      const response = await fetch(`/api/objectives/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress: newProgress }),
      })

      if (!response.ok) throw new Error('Failed to update progress')

      setObjectives(objectives.map(obj => obj.id === id ? { ...obj, progress: newProgress } : obj))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error updating progress')
    }
  }

  const handleDeleteObjective = async (id: string) => {
    try {
      const response = await fetch(`/api/objectives/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete objective')

      setObjectives(objectives.filter(obj => obj.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting objective')
    }
  }

  const goals = objectives.filter(o => o.type === 'Goal' && o.isActive)
  const projects = objectives.filter(o => o.type === 'Project' && o.isActive)
  const tasks = objectives.filter(o => o.type === 'Task' && o.isActive)

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Objectives</h1>
          <p className="text-muted-foreground">Manage your goals, projects, and tasks</p>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* Create New Objective */}
        <div className="bg-card p-6 rounded-lg border border-border mb-8">
          <h2 className="text-lg font-bold text-foreground mb-4">Create New Objective</h2>
          <div>
            <form onSubmit={handleCreateObjective} className="space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter objective title..."
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground"
                />
                <select
                  value={objectiveType}
                  onChange={e => setObjectiveType(e.target.value as 'Goal' | 'Project' | 'Task')}
                  className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
                >
                  <option value="Goal">Goal</option>
                  <option value="Project">Project</option>
                  <option value="Task">Task</option>
                </select>
                <button type="submit" className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90">
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Loading State */}
        {loading && <div className="text-center py-8 text-muted-foreground">Loading objectives...</div>}

        {/* Goals Section */}
        {!loading && goals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Goals</h2>
            <div className="space-y-4">
              {goals.map(goal => (
                <ObjectiveCard
                  key={goal.id}
                  objective={goal}
                  onProgressChange={newProgress => handleUpdateProgress(goal.id, newProgress)}
                  onDelete={() => handleDeleteObjective(goal.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Projects Section */}
        {!loading && projects.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Projects</h2>
            <div className="space-y-4">
              {projects.map(project => (
                <ObjectiveCard
                  key={project.id}
                  objective={project}
                  onProgressChange={newProgress => handleUpdateProgress(project.id, newProgress)}
                  onDelete={() => handleDeleteObjective(project.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tasks Section */}
        {!loading && tasks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 text-foreground">Tasks</h2>
            <div className="space-y-4">
              {tasks.map(task => (
                <ObjectiveCard
                  key={task.id}
                  objective={task}
                  onProgressChange={newProgress => handleUpdateProgress(task.id, newProgress)}
                  onDelete={() => handleDeleteObjective(task.id)}
                />
              ))}
            </div>
          </div>
        )}

        {!loading && objectives.length === 0 && (
          <div className="bg-card p-6 rounded-lg border border-border text-center text-muted-foreground">
            No objectives yet. Create one to get started!
          </div>
        )}

        {/* Navigation */}
        <div className="mt-12 flex gap-4">
          <Link href="/dashboard">
            <button className="px-4 py-2 border border-border rounded-md hover:bg-muted text-foreground">
              Back to Dashboard
            </button>
          </Link>
          <Link href="/dashboard/habits">
            <button className="px-4 py-2 border border-border rounded-md hover:bg-muted text-foreground">
              View Habits
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}

// ObjectiveCard Component
function ObjectiveCard({
  objective,
  onProgressChange,
  onDelete,
}: {
  objective: Objective
  onProgressChange: (progress: number) => void
  onDelete: () => void
}) {
  return (
    <div className="bg-card p-6 rounded-lg border border-border space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-bold text-foreground">{objective.title}</h3>
          {objective.description && <p className="text-muted-foreground text-sm">{objective.description}</p>}
        </div>
        <button
          onClick={onDelete}
          className="text-sm text-destructive hover:text-destructive/80"
        >
          Delete
        </button>
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Progress</span>
          <span className="text-sm text-muted-foreground">{Math.round(objective.progress * 100)}%</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${objective.progress * 100}%` }}
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => onProgressChange(Math.max(0, objective.progress - 0.1))}
          className="px-3 py-1 border border-border rounded-md hover:bg-muted text-foreground text-sm"
        >
          -
        </button>
        <button
          onClick={() => onProgressChange(Math.min(1, objective.progress + 0.1))}
          className="px-3 py-1 border border-border rounded-md hover:bg-muted text-foreground text-sm"
        >
          +
        </button>
        {objective.progress < 1 && (
          <button
            onClick={() => onProgressChange(1)}
            className="ml-auto px-4 py-1 bg-primary text-white rounded-md hover:bg-opacity-90 text-sm"
          >
            Mark Complete
          </button>
        )}
      </div>

      <div className="text-xs text-muted-foreground">
        Type: {objective.type}
      </div>
    </div>
  )
}
