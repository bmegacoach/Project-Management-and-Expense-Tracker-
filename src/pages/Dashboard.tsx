import React, { useEffect, useMemo, useState } from 'react'
import { Firestore, collection, doc, onSnapshot, getDoc } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type Task = { id: string; phase?: string; name?: string; status?: string; approvedValue?: number }
type Budget = { totalBudget?: number }
type Draw = { id: string; amount?: number; status?: string }
type PRDConfig = { PROJECT_WORK_VALUE?: number; TOTAL_SCHEDULED_DRAWS?: number; MONTHLY_INTEREST?: number; PROPERTY_ADDRESS?: string; PROJECT_NAME?: string }

function Dashboard({ db, role }: { db: Firestore | null; role: Role }) {
  // Default PRD Constants (will be overridden by DB)
  const DEFAULT_PRD = {
    PROJECT_WORK_VALUE: 110000,
    TOTAL_SCHEDULED_DRAWS: 127400,
    MONTHLY_INTEREST: 2900,
    PROJECT_DURATION_MONTHS: 6,
    PROPERTY_ADDRESS: '4821 Briscoe St & 4829 Briscoe St, Houston, TX 77033',
    PROJECT_NAME: 'RED CARPET CONTRACTORS Project: Tech Camp 1'
  }
  
  const [tasks, setTasks] = useState<Task[]>([])
  const [budget, setBudget] = useState<Budget>({})
  const [draws, setDraws] = useState<Draw[]>([])
  const [prdConfig, setPRDConfig] = useState<PRDConfig>(DEFAULT_PRD)

  useEffect(() => {
    if (!db) return
    
    // Load PRD config
    const loadPRDConfig = async () => {
      try {
        const prdSnap = await getDoc(doc(db, 'config', 'prd'))
        if (prdSnap.exists()) {
          setPRDConfig(prdSnap.data() as PRDConfig)
        }
      } catch (error) {
        console.error('Error loading PRD config:', error)
      }
    }
    loadPRDConfig()

    const unsub1 = onSnapshot(collection(db, 'tasks'), s => {
      const list: Task[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setTasks(list)
    })
    const unsub2 = onSnapshot(doc(db, 'budget', 'totals'), s => {
      setBudget(s.exists() ? (s.data() as any) : {})
    })
    const unsub3 = onSnapshot(collection(db, 'draws'), s => {
      const list: Draw[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setDraws(list)
    })
    return () => {
      unsub1()
      unsub2()
      unsub3()
    }
  }, [db])

  const totalBudget = prdConfig.PROJECT_WORK_VALUE || 110000
  const approvedWorkValue = tasks.reduce((a, t) => a + (t.status === 'pm_approved' ? (t.approvedValue || 0) : 0), 0)
  const cwpPercentage = totalBudget > 0 ? (approvedWorkValue / totalBudget) * 100 : 0
  const remainingBudget = Math.max(totalBudget - approvedWorkValue, 0)
  const totalDraws = draws.reduce((a, d) => a + (d.amount || 0), 0)
  const progress = totalBudget > 0 ? Math.min(Math.round((approvedWorkValue / totalBudget) * 100), 100) : 0



  return (
    <div className="grid gap-4 sm:gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Total Budget</span>
            <span className="text-xl sm:text-2xl">💰</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">${totalBudget.toLocaleString()}</div>
          <div className="mt-2 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Approved Work</span>
            <span className="text-xl sm:text-2xl">✓</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">${approvedWorkValue.toLocaleString()}</div>
          <div className="mt-2 h-1 bg-gradient-to-r from-green-500 to-green-600 rounded-full"></div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Completed Work %</span>
            <span className="text-xl sm:text-2xl">📊</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{cwpPercentage.toFixed(1)}%</div>
          <div className="mt-2 h-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" style={{ width: `${Math.min(cwpPercentage, 100)}%` }}></div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Total Draws</span>
            <span className="text-xl sm:text-2xl">💵</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">${totalDraws.toLocaleString()}</div>
          <div className="mt-2 h-1 bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Completed Work Progress</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">{cwpPercentage.toFixed(1)}% of $110,000 work approved</p>
          </div>
          <span className="text-2xl sm:text-3xl flex-shrink-0">🎯</span>
        </div>
        <div className="space-y-2">
          <div className="flex h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${Math.min(cwpPercentage, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>0%</span>
            <span>70% (Draw Eligible)</span>
            <span>100%</span>
          </div>
        </div>
      </div>


    </div>
  )
}

export default Dashboard
