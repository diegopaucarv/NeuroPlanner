'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Calendar, Target, Zap, BarChart2, Settings, LogOut } from 'lucide-react'

type NavView = 'today' | 'rewards' | 'aims' | 'monitor' | 'settings'

interface NavItem {
  id: NavView
  label: string
  icon: React.ReactNode
  lightColor: string
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'today',
    label: 'Today',
    icon: <Calendar size={24} />,
    lightColor: 'rgba(139,195,74,0.5)',
  },
  {
    id: 'rewards',
    label: 'Rewards',
    icon: <Zap size={24} />,
    lightColor: 'rgba(0,188,212,0.5)',
  },
  {
    id: 'aims',
    label: 'Aims',
    icon: <Target size={24} />,
    lightColor: 'rgba(156,39,176,0.5)',
  },
  {
    id: 'monitor',
    label: 'Monitor',
    icon: <BarChart2 size={24} />,
    lightColor: 'rgba(255,127,171,0.5)',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings size={24} />,
    lightColor: 'rgba(255,235,59,0.5)',
  },
]

export default function DashboardPage() {
  const router = useRouter()
  const [currentView, setCurrentView] = useState<NavView>('today')
  const activeItem = NAV_ITEMS.find(item => item.id === currentView)

  const handleLogout = () => {
    router.push('/sign-in')
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col overflow-hidden pb-32">
      {/* Header with colored bar */}
      <header className="flex items-center px-6 py-4 gap-3 bg-black border-b border-gray-800">
        <div
          className="w-2 h-10 rounded-sm transition-all"
          style={{ backgroundColor: activeItem?.lightColor || '#2563eb' }}
        />
        <h1 className="text-3xl font-bold">{activeItem?.label || 'NeuroPlanner'}</h1>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto px-6 py-6">
        {/* View: Today */}
        {currentView === 'today' && (
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-6">Today's Tasks</h2>
            <div className="space-y-3">
              <TaskCard title="Review project goals" completed={false} category="Work" />
              <TaskCard title="Exercise for 30 minutes" completed={true} category="Health" />
              <TaskCard title="Plan tomorrow's schedule" completed={false} category="Planning" />
              <TaskCard title="Team meeting at 2 PM" completed={false} category="Work" />
            </div>
            <button className="mt-6 px-6 py-3 bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition">
              + Add Task
            </button>
          </div>
        )}

        {/* View: Rewards */}
        {currentView === 'rewards' && (
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-6">Rewards & Achievements</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <RewardCard title="7-Day Streak" description="Complete 7 consecutive days" progress={5} />
              <RewardCard title="30 Tasks Done" description="Complete 30 tasks this month" progress={18} />
              <RewardCard title="Perfect Week" description="Zero missed days" progress={6} />
            </div>
          </div>
        )}

        {/* View: Aims */}
        {currentView === 'aims' && (
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-6">Goals & Objectives</h2>
            <div className="space-y-4">
              <AimCard title="Learn React" progress={65} category="Learning" />
              <AimCard title="Fitness Goal" progress={40} category="Health" />
              <AimCard title="Side Project" progress={25} category="Work" />
              <AimCard title="Reading Challenge" progress={50} category="Personal" />
            </div>
            <Link href="/dashboard/objectives">
              <button className="mt-6 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                Manage Goals
              </button>
            </Link>
          </div>
        )}

        {/* View: Monitor */}
        {currentView === 'monitor' && (
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-6">Progress & Analytics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <StatsCard title="This Week" value="12" label="Tasks Completed" />
              <StatsCard title="Streak" value="7" label="Days Active" />
              <StatsCard title="Habits" value="85%" label="Completion Rate" />
              <StatsCard title="Goals" value="3" label="In Progress" />
            </div>
          </div>
        )}

        {/* View: Settings */}
        {currentView === 'settings' && (
          <div className="max-w-4xl">
            <h2 className="text-2xl font-bold mb-6">Settings</h2>
            <div className="space-y-4">
              <SettingItem label="Dark Mode" value="ON" />
              <SettingItem label="Notifications" value="ON" />
              <SettingItem label="Time Zone" value="UTC-5" />
              <SettingItem label="Theme" value="Dark" />
              <button
                onClick={handleLogout}
                className="mt-8 w-full px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition flex items-center justify-center gap-2"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 px-4 py-3 flex justify-between items-center">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setCurrentView(item.id)}
            className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${
              currentView === item.id
                ? `text-white`
                : 'text-gray-500 hover:text-gray-400'
            }`}
            style={
              currentView === item.id
                ? { backgroundColor: item.lightColor }
                : {}
            }
          >
            <div className="text-gray-400">{item.icon}</div>
            <span className="text-xs font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

function TaskCard({ title, completed, category }: { title: string; completed: boolean; category: string }) {
  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 flex items-center gap-4 hover:bg-gray-800 transition">
      <input
        type="checkbox"
        checked={completed}
        readOnly
        className="w-6 h-6 rounded accent-lime-600"
      />
      <div className="flex-1">
        <p className={`${completed ? 'line-through text-gray-500' : 'text-white'}`}>{title}</p>
        <p className="text-xs text-gray-500">{category}</p>
      </div>
    </div>
  )
}

function RewardCard({ title, description, progress }: { title: string; description: string; progress: number }) {
  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800">
      <h3 className="font-bold text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-4">{description}</p>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div className="bg-cyan-600 h-2 rounded-full" style={{ width: `${progress}%` }} />
      </div>
      <p className="text-xs text-gray-500 mt-2">{progress}/10</p>
    </div>
  )
}

function AimCard({ title, progress, category }: { title: string; progress: number; category: string }) {
  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-white">{title}</h3>
          <p className="text-xs text-gray-500">{category}</p>
        </div>
        <span className="text-sm font-bold text-purple-400">{progress}%</span>
      </div>
      <div className="w-full bg-gray-800 rounded-full h-2">
        <div className="bg-purple-600 h-2 rounded-full" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

function StatsCard({ title, value, label }: { title: string; value: string; label: string }) {
  return (
    <div className="bg-gray-900 p-6 rounded-lg border border-gray-800 text-center">
      <p className="text-sm text-gray-500 mb-2">{title}</p>
      <p className="text-4xl font-bold text-pink-400 mb-2">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  )
}

function SettingItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-900 p-4 rounded-lg border border-gray-800 flex justify-between items-center">
      <span className="text-white">{label}</span>
      <span className="text-yellow-500 font-medium">{value}</span>
    </div>
  )
}
