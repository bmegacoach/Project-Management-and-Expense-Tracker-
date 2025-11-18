import React, { useEffect, useState } from 'react'
import { Firestore, collection, doc, onSnapshot, getDoc, getDocs } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type Task = { id: string; phase?: string; name?: string; status?: string; approvedValue?: number }
type Budget = { totalBudget?: number }
type Draw = { id: string; amount?: number; status?: string }
type PRDConfig = { PROJECT_WORK_VALUE?: number; TOTAL_SCHEDULED_DRAWS?: number; MONTHLY_INTEREST?: number; PROPERTY_ADDRESS?: string; PROJECT_NAME?: string }
type Expense = { id: string; category: string; amount: number; date: string; status: 'pending' | 'approved' | 'rejected' }
type BudgetAllocation = { id: string; allocated: number; spent: number; category?: string }
type DailyReport = { id: string; date: string; phaseId: string }

const PHASE_IDS = [
  'phase-1-pre-construction-demolition',
  'phase-2-structural-envelope',
  'phase-3-mep-rough-in',
  'phase-4-interior-finishes-exterior-cladding',
  'phase-5-fixtures-appliances-final-touches'
]

const PHASE_NAMES: Record<string, string> = {
  'phase-1-pre-construction-demolition': 'Phase 1: Pre-Construction',
  'phase-2-structural-envelope': 'Phase 2: Structural',
  'phase-3-mep-rough-in': 'Phase 3: MEP',
  'phase-4-interior-finishes-exterior-cladding': 'Phase 4: Interior & Exterior',
  'phase-5-fixtures-appliances-final-touches': 'Phase 5: Fixtures & Final'
}

function Dashboard({ db, role }: { db: Firestore | null; role: Role }) {
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
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [budgetAllocations, setBudgetAllocations] = useState<BudgetAllocation[]>([])
  const [dailyReports, setDailyReports] = useState<DailyReport[]>([])
  const [phaseProgress, setPhaseProgress] = useState<Record<string, { completed: number; total: number }>>({})
  const [viewMode, setViewMode] = useState<'overview' | 'budget' | 'team' | 'phase'>('overview')

  useEffect(() => {
    if (!db) return
    
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

    const unsub4 = onSnapshot(collection(db, 'expenses'), s => {
      const list: Expense[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setExpenses(list)
    })

    const loadBudgetAllocations = async () => {
      const snapshot = await getDocs(collection(db, 'budgetAllocations'))
      const list: BudgetAllocation[] = []
      snapshot.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setBudgetAllocations(list)
    }
    loadBudgetAllocations()

    const loadPhaseData = async () => {
      const progress: Record<string, { completed: number; total: number }> = {}
      const allReports: DailyReport[] = []

      for (const phaseId of PHASE_IDS) {
        const tasksSnap = await getDocs(collection(db, 'phases', phaseId, 'tasks'))
        const completed = tasksSnap.docs.filter(d => d.data().status === 'completed').length
        const total = tasksSnap.size
        progress[phaseId] = { completed, total }

        const reportsSnap = await getDocs(collection(db, 'phases', phaseId, 'dailyReports'))
        reportsSnap.forEach(d => {
          allReports.push({ id: d.id, phaseId, ...(d.data() as any) })
        })
      }

      setPhaseProgress(progress)
      setDailyReports(allReports)
    }
    loadPhaseData()

    return () => {
      unsub1()
      unsub2()
      unsub3()
      unsub4()
    }
  }, [db])

  // Calculate metrics
  const totalBudget = prdConfig.PROJECT_WORK_VALUE || 110000
  const approvedWorkValue = tasks.reduce((a, t) => a + (t.status === 'pm_approved' ? (t.approvedValue || 0) : 0), 0)
  const cwpPercentage = totalBudget > 0 ? (approvedWorkValue / totalBudget) * 100 : 0
  const remainingBudget = Math.max(totalBudget - approvedWorkValue, 0)
  const totalDraws = draws.reduce((a, d) => a + (d.amount || 0), 0)

  const allocatedBudget = budgetAllocations.reduce((a, b) => a + b.allocated, 0)
  const spentBudget = budgetAllocations.reduce((a, b) => a + b.spent, 0)
  const totalExpenses = expenses.length
  const approvedExpenses = expenses.filter(e => e.status === 'approved').length
  const pendingExpenses = expenses.filter(e => e.status === 'pending').length

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.status === 'completed').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    pending: tasks.filter(t => !['completed', 'in-progress'].includes(t.status || '')).length
  }

  const overallPhasePercentage = Object.values(phaseProgress).length > 0
    ? Math.round(
        Object.values(phaseProgress).reduce((sum, p) => sum + (p.total > 0 ? (p.completed / p.total) * 100 : 0), 0) /
        Object.values(phaseProgress).length
      )
    : 0

  const budgetStatus = spentBudget > 0 && allocatedBudget > 0
    ? Math.round((spentBudget / allocatedBudget) * 100)
    : 0

  const getBudgetStatusColor = (percentage: number) => {
    if (percentage >= 95) return 'text-red-600 dark:text-red-400'
    if (percentage >= 80) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  return (
    <div className="space-y-6">
      {/* Header with View Mode Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Dashboard</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Real-time project analytics</p>
          </div>
          <span className="text-4xl">📊</span>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {[
            { mode: 'overview', label: '📈 Overview' },
            { mode: 'budget', label: '💰 Budget' },
            { mode: 'team', label: '👥 Team' },
            { mode: 'phase', label: '📋 Phases' }
          ].map(tab => (
            <button
              key={tab.mode}
              onClick={() => setViewMode(tab.mode as any)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all text-sm ${
                viewMode === tab.mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* OVERVIEW MODE */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Top KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Budget</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">${(totalBudget/1000).toFixed(0)}K</p>
              <div className="mt-2 h-2 bg-blue-200 dark:bg-blue-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: '100%' }}></div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Spent</p>
              <p className={`text-2xl sm:text-3xl font-bold ${getBudgetStatusColor(budgetStatus)}`}>${(spentBudget/1000).toFixed(0)}K</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{budgetStatus}% used</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Remaining</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">${((allocatedBudget-spentBudget)/1000).toFixed(0)}K</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Progress</p>
              <p className="text-2xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{overallPhasePercentage}%</p>
            </div>
          </div>

          {/* Work Progress */}
          <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-8">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Approved Work Progress</h3>
            <div className="space-y-4">
              <div className="flex h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${Math.min(cwpPercentage, 100)}%` }}></div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">${(approvedWorkValue/1000).toFixed(0)}K</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Approved</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{cwpPercentage.toFixed(1)}%</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Complete</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">${(remainingBudget/1000).toFixed(0)}K</p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Remaining</p>
                </div>
              </div>
            </div>
          </div>

          {/* Task Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 text-center">
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{taskStats.total}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Total Tasks</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 text-center">
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">{taskStats.completed}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Completed</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 text-center">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{taskStats.inProgress}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">In Progress</p>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 text-center">
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{taskStats.pending}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Pending</p>
            </div>
          </div>

          {/* Reports Activity */}
          <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Daily Reports</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{dailyReports.length}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Reports Logged</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                  {dailyReports.length > 0 ? (dailyReports.length / 5).toFixed(1) : 0}
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Per Phase (Avg)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BUDGET MODE */}
      {viewMode === 'budget' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Allocated Budget</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">${(allocatedBudget/1000).toFixed(1)}K</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Total Spent</p>
              <p className={`text-2xl sm:text-3xl font-bold ${getBudgetStatusColor(budgetStatus)}`}>${(spentBudget/1000).toFixed(1)}K</p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Remaining</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">${((allocatedBudget - spentBudget)/1000).toFixed(1)}K</p>
            </div>
          </div>

          {/* Expense Summary */}
          <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Expense Summary</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-slate-900 dark:text-white">{totalExpenses}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">Total</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">{approvedExpenses}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">Approved</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{pendingExpenses}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">Pending</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold text-red-600 dark:text-red-400">{totalExpenses - approvedExpenses - pendingExpenses}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">Rejected</p>
              </div>
            </div>
          </div>

          {/* Budget Utilization */}
          <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Budget Utilization</h3>
            <div className="space-y-4">
              <div className="flex h-4 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className={`bg-gradient-to-r ${
                  budgetStatus >= 95 ? 'from-red-500 to-red-600' :
                  budgetStatus >= 80 ? 'from-yellow-500 to-yellow-600' :
                  'from-green-500 to-green-600'
                }`} style={{ width: `${Math.min(budgetStatus, 100)}%` }}></div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600 dark:text-slate-400">0%</span>
                <span className={`font-bold ${getBudgetStatusColor(budgetStatus)}`}>{budgetStatus}%</span>
                <span className="text-slate-600 dark:text-slate-400">100%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEAM MODE */}
      {viewMode === 'team' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Team Activity Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Daily Reports Logged</p>
                <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{dailyReports.length}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Tracking site progress</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">Task Completion Rate</p>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {taskStats.total > 0 ? Math.round((taskStats.completed / taskStats.total) * 100) : 0}%
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{taskStats.completed}/{taskStats.total} tasks</p>
              </div>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 text-center">
              Visit Team Management & Performance tabs for detailed team metrics
            </p>
          </div>
        </div>
      )}

      {/* PHASE MODE */}
      {viewMode === 'phase' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">Phase Progress Overview</h3>
            <div className="space-y-4">
              {PHASE_IDS.map(phaseId => {
                const progress = phaseProgress[phaseId] || { completed: 0, total: 0 }
                const percentage = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0
                return (
                  <div key={phaseId}>
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">{PHASE_NAMES[phaseId]}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{percentage}%</span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{progress.completed}/{progress.total} tasks completed</p>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Overall Progress</h3>
            <p className="text-5xl font-bold text-blue-600 dark:text-blue-400 text-center">{overallPhasePercentage}%</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 text-center mt-4">Average across all phases</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
