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
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'tasks', label: 'Tasks' },
  { key: 'budget', label: 'Budget & Draws' },
  { key: 'daily-reports', label: 'Daily Reports' },
  { key: 'contractors', label: 'Contractors' },
  { key: 'media', label: 'Pictures & Videos' },
  { key: 'ask', label: 'Ask Gemini' },
  { key: 'pro', label: 'Gemini Pro' }
]

function App() {
  const [active, setActive] = useState('dashboard')
  const [role, setRole] = useState<Role>('site_manager')
  const [online, setOnline] = useState(true)
  const [ready, setReady] = useState(false)
  const { theme, toggleTheme } = useTheme()

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

  return (
    <div className={`min-h-screen bg-white dark:bg-slate-950 ${theme === 'dark' ? 'dark' : ''}`}>
      <style>{`
        :root {
          color-scheme: ${theme === 'dark' ? 'dark' : 'light'};
        }
      `}</style>
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-6">
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <div className="w-8 sm:w-10 h-8 sm:h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-base sm:text-lg">📐</span>
            </div>
            <div className="min-w-0">
              <div className="text-base sm:text-xl font-bold text-slate-900 dark:text-white truncate">FPM BuildTrack</div>
              <div className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">Project Management</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4 flex-shrink-0">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <div className="hidden sm:flex items-center gap-2 sm:gap-3 bg-slate-50 dark:bg-slate-800 px-3 sm:px-4 py-2 rounded-lg">
              <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">Role:</span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as Role)}
                className="bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md px-2 sm:px-3 py-1 text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="site_manager">Site Manager</option>
                <option value="project_manager">Project Manager</option>
                <option value="portfolio_manager">Portfolio Manager</option>
              </select>
            </div>
            {!online && (
              <span className="text-xs px-2 py-1 sm:px-3 sm:py-2 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-200 rounded-full font-medium flex-shrink-0">⚠</span>
            )}
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-3 sm:px-6 pb-2 sm:pb-4 flex gap-1 overflow-x-auto scrollbar-hide">
          {tabs.map(t => (
            <button
              key={t.key}
              className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
                active === t.key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
              onClick={() => setActive(t.key)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-8 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 min-h-[calc(100vh-120px)]">
        {!ready && (
          <div className="text-center py-12">
            <div className="inline-block">
              <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            </div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Initializing...</p>
          </div>
        )}
        {ready && (
          <>
            {!firebaseEnabled && (
              <div className="p-4 bg-amber-50 dark:bg-amber-900 border border-amber-200 dark:border-amber-800 rounded-lg text-sm text-amber-800 dark:text-amber-200 flex items-center gap-3">
                <span>⚠️</span>
                <span>Firebase is not configured. Add values to .env for full functionality.</span>
              </div>
            )}
            {firebaseEnabled && active === 'dashboard' && <Dashboard db={db} role={role} />}
            {firebaseEnabled && active === 'tasks' && <Tasks db={db} role={role} />}
            {firebaseEnabled && active === 'budget' && <Budget db={db} role={role} />}
            {firebaseEnabled && active === 'daily-reports' && <DailyReports db={db} role={role} />}
            {firebaseEnabled && active === 'contractors' && <Contractors db={db} />}
            {firebaseEnabled && active === 'media' && <Media db={db} />}
            {active === 'ask' && <AskGemini db={db} role={role} />}
            {active === 'pro' && <GeminiPro db={db} role={role} />}
          </>
        )}
      </main>
    </div>
  )
}

export default App
