import React, { useEffect, useMemo, useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, enableIndexedDbPersistence, collection, doc, getDoc, setDoc, getDocs, addDoc } from 'firebase/firestore'
import { useTheme } from './ThemeContext'
import Dashboard from './pages/Dashboard'
import Tasks from './pages/Tasks'
import Budget from './pages/Budget'
import Reports from './pages/Reports'
import DailyReports from './pages/DailyReports'
import Contractors from './pages/Contractors'
import Media from './pages/Media'
import AskGemini from './pages/AskGemini'
import GeminiPro from './pages/GeminiPro'
import Expenses from './pages/Expenses'
import BudgetDashboard from './pages/BudgetDashboard'
import TaskStatus from './pages/TaskStatus'
import BudgetAllocationManager from './pages/BudgetAllocationManager'
import TeamManagement from './pages/TeamManagement'
import TeamPerformance from './pages/TeamPerformance'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

// PRD Constants and Initialization
const PRD_DATA = {
  PROJECT_WORK_VALUE: 110000,
  TOTAL_SCHEDULED_DRAWS: 127400,
  MONTHLY_INTEREST: 2900,
  PROJECT_DURATION_MONTHS: 6,
  PROPERTY_ADDRESS: '4821 Briscoe St & 4829 Briscoe St, Houston, TX 77033',
  PROJECT_NAME: 'RED CARPET CONTRACTORS Project: Tech Camp 1'
}

const DRAW_SCHEDULE = [
  { drawNumber: 1, taskAllocation: 0.40, interestMonths: 2, amount: 49800 },
  { drawNumber: 2, taskAllocation: 0.35, interestMonths: 1.33, amount: 29466.67 },
  { drawNumber: 3, taskAllocation: 0.25, interestMonths: 1.33, amount: 24966.67 },
  { drawNumber: 4, taskAllocation: 1.0, interestMonths: 1.33, amount: 23166.66 }
]

// Initialize PRD data in Firestore
const initializePRDData = async (db: any) => {
  if (!db) return

  try {
    // Set PRD constants
    const prdRef = doc(db, 'config', 'prd')
    const prdSnap = await getDoc(prdRef)
    if (!prdSnap.exists()) {
      await setDoc(prdRef, PRD_DATA)
    }

    // Initialize draw schedule
    const drawsSnap = await getDocs(collection(db, 'draws'))
    if (drawsSnap.empty) {
      for (const draw of DRAW_SCHEDULE) {
        await addDoc(collection(db, 'draws'), {
          ...draw,
          status: 'not_scheduled'
        })
      }
    }
  } catch (error) {
    console.error('Error initializing PRD data:', error)
  }
}

const tabs = [
  { key: 'dashboard', label: 'Dashboard', icon: '' },
  { key: 'tasks', label: 'Tasks', icon: '' },
  { key: 'task-status', label: 'Task Status', icon: '' },
  { key: 'team-management', label: 'Teams', icon: '' },
  { key: 'team-performance', label: 'Performance', icon: '' },
  { key: 'budget', label: 'Budget', icon: '' },
  { key: 'budget-dashboard', label: 'Analysis', icon: '' },
  { key: 'budget-allocation', label: 'Allocation', icon: '' },
  { key: 'expenses', label: 'Expenses', icon: '' },
  { key: 'daily-reports', label: 'Reports', icon: '' },
  { key: 'contractors', label: 'Contractors', icon: '' },
  { key: 'media', label: 'Media', icon: '' },
  { key: 'ask', label: 'Ask AI', icon: '' },
  { key: 'pro', label: 'AI Pro', icon: '' }
]

function App() {
  const [active, setActive] = useState('dashboard')
  const [role, setRole] = useState<Role>('site_manager')
  const [online, setOnline] = useState(true)
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const config = useMemo(() => ({
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
  }), [])

  const firebaseEnabled = !!(config.apiKey && config.projectId)
  const firebaseApp = useMemo(() => firebaseEnabled ? initializeApp(config) : null, [firebaseEnabled, config])
  const auth = useMemo(() => firebaseApp ? getAuth(firebaseApp) : null, [firebaseApp])
  const db = useMemo(() => firebaseApp ? getFirestore(firebaseApp) : null, [firebaseApp])

  useEffect(() => {
    if (auth) {
      signInAnonymously(auth).catch(() => {})
      onAuthStateChanged(auth, () => setReady(true))
    } else {
      setReady(true)
    }
    if (db) {
      enableIndexedDbPersistence(db).catch(() => {})
      initializePRDData(db)
    }
    const handler = () => setOnline(navigator.onLine)
    handler()
    window.addEventListener('online', handler)
    window.addEventListener('offline', handler)
    return () => {
      window.removeEventListener('online', handler)
      window.removeEventListener('offline', handler)
    }
  }, [auth, db])

  const handleTabClick = (key: string) => {
    setActive(key)
    setSidebarOpen(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 dark flex">
      <style>{`
        :root {
          color-scheme: dark;
        }
      `}</style>

      {/* Sidebar */}
      <aside className={`${
        sidebarOpen ? 'fixed' : 'hidden'
      } lg:sticky lg:flex flex-col w-64 bg-slate-900 border-r border-slate-800 shadow-xl top-0 left-0 h-screen z-40 overflow-y-auto transition-all duration-300`}>
        {/* Sidebar Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">●</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-base font-bold text-white">FPM BuildTrack</div>
              <div className="text-xs text-slate-400">Project Manager</div>
            </div>
          </div>
          {!online && (
            <div className="mt-2 text-xs px-2 py-1 bg-amber-900 text-amber-200 rounded font-medium text-center">⚠️ Offline</div>
          )}
        </div>

        {/* Role Selector */}
        <div className="px-4 sm:px-6 py-4 border-b border-slate-800">
          <label className="text-xs font-bold text-slate-400 uppercase">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="w-full mt-2 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="site_manager">Site Manager</option>
            <option value="project_manager">Project Manager</option>
            <option value="portfolio_manager">Portfolio Manager</option>
          </select>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab.key)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                active === tab.key
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-slate-800 p-4 text-xs text-slate-500 text-center">
          <p>v1.0.0</p>
          <p className="mt-1">BuildTrack © 2025</p>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 bg-slate-900 border-b border-slate-800 shadow-sm">
          <div className="px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all"
              title="Toggle sidebar"
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>
            <div className="flex-1 text-center lg:text-left">
              <h1 className="text-lg sm:text-xl font-bold text-white">{tabs.find(t => t.key === active)?.label || 'Dashboard'}</h1>
            </div>
            <div className="w-8 sm:w-10" /> {/* Spacer for alignment */}
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-8 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
          {!ready && (
            <div className="text-center py-12">
              <div className="inline-block">
                <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
              </div>
              <p className="mt-4 text-slate-400">Initializing...</p>
            </div>
          )}
          {ready && (
            <>
              {!firebaseEnabled && (
                <div className="p-4 bg-amber-900 border border-amber-800 rounded-lg text-sm text-amber-200 flex items-center gap-3 mb-4">
                  <span>⚠️</span>
                  <span>Firebase is not configured. Add values to .env for full functionality.</span>
                </div>
              )}
              {firebaseEnabled && active === 'dashboard' && <Dashboard db={db} role={role} />}
              {firebaseEnabled && active === 'tasks' && <Tasks db={db} role={role} />}
              {firebaseEnabled && active === 'task-status' && <TaskStatus db={db} role={role} />}
              {firebaseEnabled && active === 'team-management' && <TeamManagement db={db} role={role} />}
              {firebaseEnabled && active === 'team-performance' && <TeamPerformance db={db} role={role} />}
              {firebaseEnabled && active === 'budget' && <Budget db={db} role={role} />}
              {firebaseEnabled && active === 'budget-dashboard' && <BudgetDashboard db={db} />}
              {firebaseEnabled && active === 'budget-allocation' && <BudgetAllocationManager db={db} role={role} />}
              {firebaseEnabled && active === 'expenses' && <Expenses db={db} />}
              {firebaseEnabled && active === 'daily-reports' && <DailyReports db={db} role={role} />}
              {firebaseEnabled && active === 'contractors' && <Contractors db={db} />}
              {firebaseEnabled && active === 'media' && <Media db={db} />}
              {active === 'ask' && <AskGemini db={db} role={role} />}
              {active === 'pro' && <GeminiPro db={db} role={role} />}
            </>
          )}
        </main>
      </div>
    </div>
  )
}

export default App
