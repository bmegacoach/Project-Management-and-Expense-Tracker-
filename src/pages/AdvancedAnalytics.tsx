import React, { useEffect, useState, useMemo } from 'react'
import { Firestore, collection, doc, onSnapshot, query, where, getDocs } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type Expense = {
  id: string
  category: string
  amount: number
  description?: string
  date: string
  phaseId?: string
  status: 'pending' | 'approved' | 'rejected'
}

type BudgetAllocation = {
  id: string
  phase: string
  category: string
  allocated: number
  spent: number
}

type Task = {
  id: string
  name: string
  status: string
  phaseId: string
}

type DailyReport = {
  id: string
  date: string
  phaseId: string
  workCompleted?: string
  issuesEncountered?: string
  plannedWork?: string
  weatherConditions?: string
}

const PHASE_IDS = [
  'phase-1-pre-construction-demolition',
  'phase-2-structural-envelope',
  'phase-3-mep-rough-in',
  'phase-4-interior-finishes-exterior-cladding',
  'phase-5-fixtures-appliances-final-touches'
]

const PHASE_NAMES: Record<string, string> = {
  'phase-1-pre-construction-demolition': 'Phase 1: Pre-Construction',
  'phase-2-structural-envelope': 'Phase 2: Structural & Envelope',
  'phase-3-mep-rough-in': 'Phase 3: MEP Rough-in',
  'phase-4-interior-finishes-exterior-cladding': 'Phase 4: Interior & Exterior',
  'phase-5-fixtures-appliances-final-touches': 'Phase 5: Fixtures & Final'
}

const EXPENSE_CATEGORIES = [
  'Labor',
  'Materials',
  'Equipment',
  'Permits',
  'Subcontractors',
  'Safety',
  'Other'
]

interface AnalyticsData {
  totalBudget: number
  totalSpent: number
  totalRemaining: number
  totalExpenses: number
  approvedExpenses: number
  pendingExpenses: number
  rejectedExpenses: number
  taskStats: {
    total: number
    completed: number
    inProgress: number
    pending: number
  }
  phaseProgress: Record<string, { tasksCompleted: number; totalTasks: number; percentage: number }>
  categoryBreakdown: Record<string, { amount: number; percentage: number; count: number }>
  monthlyTrend: Array<{ month: string; spent: number; allocated: number }>
  dailyReportCount: number
  averageReportPerDay: number
}

function AdvancedAnalytics({ db, role }: { db: Firestore | null; role: Role }) {
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalBudget: 0,
    totalSpent: 0,
    totalRemaining: 0,
    totalExpenses: 0,
    approvedExpenses: 0,
    pendingExpenses: 0,
    rejectedExpenses: 0,
    taskStats: { total: 0, completed: 0, inProgress: 0, pending: 0 },
    phaseProgress: {},
    categoryBreakdown: {},
    monthlyTrend: [],
    dailyReportCount: 0,
    averageReportPerDay: 0
  })

  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'overview' | 'expenses' | 'phases' | 'trends'>('overview')
  const [dateRange, setDateRange] = useState<'all' | '30' | '60' | '90'>('all')

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }

    const unsubscribers: (() => void)[] = []
    let budgetAllocations: BudgetAllocation[] = []
    let expenses: Expense[] = []
    let tasks: Task[] = []
    let dailyReports: DailyReport[] = []

    // Load budget allocations
    const loadBudgetAllocations = async () => {
      const snapshot = await getDocs(collection(db, 'budgetAllocations'))
      budgetAllocations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BudgetAllocation[]
      updateAnalytics()
    }

    // Real-time expenses listener
    const expensesUnsub = onSnapshot(collection(db, 'expenses'), snapshot => {
      expenses = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Expense[]
      updateAnalytics()
    })
    unsubscribers.push(expensesUnsub)

    // Load tasks from all phases
    const loadTasks = async () => {
      const allTasks: Task[] = []
      for (const phaseId of PHASE_IDS) {
        const snapshot = await getDocs(collection(db, 'phases', phaseId, 'tasks'))
        const phaseTasks = snapshot.docs.map(doc => ({
          id: doc.id,
          phaseId,
          ...doc.data()
        })) as Task[]
        allTasks.push(...phaseTasks)
      }
      tasks = allTasks
      updateAnalytics()
    }

    // Real-time daily reports listener
    const loadDailyReports = async () => {
      const allReports: DailyReport[] = []
      for (const phaseId of PHASE_IDS) {
        const snapshot = await getDocs(collection(db, 'phases', phaseId, 'dailyReports'))
        const phaseReports = snapshot.docs.map(doc => ({
          id: doc.id,
          phaseId,
          ...doc.data()
        })) as DailyReport[]
        allReports.push(...phaseReports)
      }
      dailyReports = allReports
      updateAnalytics()
    }

    const updateAnalytics = () => {
      const newAnalytics = calculateAnalytics(budgetAllocations, expenses, tasks, dailyReports)
      setAnalytics(newAnalytics)
    }

    const calculateAnalytics = (
      allocations: BudgetAllocation[],
      expensesList: Expense[],
      tasksList: Task[],
      reportsList: DailyReport[]
    ): AnalyticsData => {
      // Budget calculations
      const totalBudget = allocations.reduce((sum, a) => sum + a.allocated, 0)
      const totalSpent = allocations.reduce((sum, a) => sum + a.spent, 0)
      const totalRemaining = totalBudget - totalSpent

      // Expense status breakdown
      const totalExpenses = expensesList.length
      const approvedExpenses = expensesList.filter(e => e.status === 'approved').length
      const pendingExpenses = expensesList.filter(e => e.status === 'pending').length
      const rejectedExpenses = expensesList.filter(e => e.status === 'rejected').length

      // Task statistics
      const taskStats = {
        total: tasksList.length,
        completed: tasksList.filter(t => t.status === 'completed').length,
        inProgress: tasksList.filter(t => t.status === 'in-progress').length,
        pending: tasksList.filter(t => t.status === 'pending' || t.status === 'not-started').length
      }

      // Phase progress
      const phaseProgress: Record<string, { tasksCompleted: number; totalTasks: number; percentage: number }> = {}
      PHASE_IDS.forEach(phaseId => {
        const phaseTasks = tasksList.filter(t => t.phaseId === phaseId)
        const completed = phaseTasks.filter(t => t.status === 'completed').length
        phaseProgress[phaseId] = {
          tasksCompleted: completed,
          totalTasks: phaseTasks.length,
          percentage: phaseTasks.length > 0 ? Math.round((completed / phaseTasks.length) * 100) : 0
        }
      })

      // Category breakdown
      const categoryBreakdown: Record<string, { amount: number; percentage: number; count: number }> = {}
      EXPENSE_CATEGORIES.forEach(cat => {
        const catExpenses = expensesList.filter(e => e.category === cat)
        const amount = catExpenses.reduce((sum, e) => sum + (e.amount || 0), 0)
        categoryBreakdown[cat] = {
          amount,
          percentage: totalSpent > 0 ? Math.round((amount / totalSpent) * 100) : 0,
          count: catExpenses.length
        }
      })

      // Monthly trend
      const monthlyData: Record<string, { spent: number; allocated: number }> = {}
      expensesList.forEach(exp => {
        const date = new Date(exp.date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { spent: 0, allocated: 0 }
        }
        monthlyData[monthKey].spent += exp.amount || 0
      })

      allocations.forEach(alloc => {
        const monthKey = new Date().getFullYear() + '-01' // Simplified
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { spent: 0, allocated: 0 }
        }
        monthlyData[monthKey].allocated += alloc.allocated
      })

      const monthlyTrend = Object.entries(monthlyData)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6)
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
          spent: data.spent,
          allocated: data.allocated
        }))

      // Daily reports metrics
      const dailyReportCount = reportsList.length
      const dateRange = new Set(reportsList.map(r => r.date.split('T')[0])).size
      const averageReportPerDay = dateRange > 0 ? Math.round(dailyReportCount / dateRange * 10) / 10 : 0

      return {
        totalBudget,
        totalSpent,
        totalRemaining,
        totalExpenses,
        approvedExpenses,
        pendingExpenses,
        rejectedExpenses,
        taskStats,
        phaseProgress,
        categoryBreakdown,
        monthlyTrend,
        dailyReportCount,
        averageReportPerDay
      }
    }

    loadBudgetAllocations()
    loadTasks()
    loadDailyReports()

    setLoading(false)
    return () => unsubscribers.forEach(unsub => unsub())
  }, [db])

  const getHealthColor = (value: number, max: number): string => {
    const percentage = (value / max) * 100
    if (percentage >= 80) return 'text-red-600 dark:text-red-400'
    if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-green-600 dark:text-green-400'
  }

  const getBudgetStatus = (): { status: string; color: string; message: string } => {
    const percentageUsed = analytics.totalBudget > 0 ? (analytics.totalSpent / analytics.totalBudget) * 100 : 0
    if (percentageUsed >= 95) return { status: 'Critical', color: 'bg-red-100 dark:bg-red-900', message: 'Budget nearly exhausted' }
    if (percentageUsed >= 80) return { status: 'Warning', color: 'bg-yellow-100 dark:bg-yellow-900', message: 'High budget usage' }
    return { status: 'Healthy', color: 'bg-green-100 dark:bg-green-900', message: 'Budget on track' }
  }

  const getTaskCompletionRate = (): number => {
    return analytics.taskStats.total > 0 ? Math.round((analytics.taskStats.completed / analytics.taskStats.total) * 100) : 0
  }

  const getOverallPhaseProgress = (): number => {
    const totalCompleted = Object.values(analytics.phaseProgress).reduce((sum, p) => sum + p.tasksCompleted, 0)
    const totalTasks = Object.values(analytics.phaseProgress).reduce((sum, p) => sum + p.totalTasks, 0)
    return totalTasks > 0 ? Math.round((totalCompleted / totalTasks) * 100) : 0
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading analytics...</p>
        </div>
      </div>
    )
  }

  const budgetStatus = getBudgetStatus()
  const taskCompletionRate = getTaskCompletionRate()
  const overallPhaseProgress = getOverallPhaseProgress()

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">📊 Advanced Analytics</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Comprehensive project insights and performance metrics</p>
          </div>
          <span className="text-4xl">📈</span>
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-2 overflow-x-auto">
          {['overview', 'expenses', 'phases', 'trends'].map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode as any)}
              className={`px-4 py-2 rounded-lg font-semibold whitespace-nowrap transition-all ${
                viewMode === mode
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Mode */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {/* Budget Status */}
            <div className={`${budgetStatus.color} rounded-lg p-4 border-2 border-slate-200 dark:border-slate-700`}>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Budget Status</p>
              <p className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">{budgetStatus.status}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{budgetStatus.message}</p>
            </div>

            {/* Task Completion */}
            <div className="bg-blue-100 dark:bg-blue-900 rounded-lg p-4 border-2 border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Task Completion</p>
              <p className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{taskCompletionRate}%</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{analytics.taskStats.completed}/{analytics.taskStats.total}</p>
            </div>

            {/* Phase Progress */}
            <div className="bg-purple-100 dark:bg-purple-900 rounded-lg p-4 border-2 border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Overall Progress</p>
              <p className="text-lg sm:text-2xl font-bold text-purple-600 dark:text-purple-400">{overallPhaseProgress}%</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Across all phases</p>
            </div>

            {/* Reports Logged */}
            <div className="bg-orange-100 dark:bg-orange-900 rounded-lg p-4 border-2 border-slate-200 dark:border-slate-700">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">Reports Logged</p>
              <p className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-400">{analytics.dailyReportCount}</p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{analytics.averageReportPerDay}/day avg</p>
            </div>
          </div>

          {/* Budget Overview */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">💰 Budget Overview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Total Budget */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Total Budget</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                  ${(analytics.totalBudget / 1000).toFixed(1)}K
                </p>
                <div className="mt-3 h-2 bg-blue-200 dark:bg-blue-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-600" style={{ width: '100%' }}></div>
                </div>
              </div>

              {/* Spent */}
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Amount Spent</p>
                <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                  ${(analytics.totalSpent / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
                  {analytics.totalBudget > 0 ? Math.round((analytics.totalSpent / analytics.totalBudget) * 100) : 0}% of budget
                </p>
              </div>

              {/* Remaining */}
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Remaining Budget</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  ${(analytics.totalRemaining / 1000).toFixed(1)}K
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Available for expenses</p>
              </div>
            </div>
          </div>

          {/* Task Statistics */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">📋 Task Statistics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 text-center">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">Total Tasks</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white">{analytics.taskStats.total}</p>
              </div>

              <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4 text-center">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">Completed</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{analytics.taskStats.completed}</p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 text-center">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">In Progress</p>
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{analytics.taskStats.inProgress}</p>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4 text-center">
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 mb-2">Pending</p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{analytics.taskStats.pending}</p>
              </div>
            </div>
          </div>

          {/* Expense Status */}
          <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">✅ Expense Status</h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-4xl font-bold text-slate-900 dark:text-white">{analytics.totalExpenses}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold mt-2">Total Expenses</p>
              </div>

              <div className="text-center">
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">{analytics.approvedExpenses}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold mt-2">Approved</p>
              </div>

              <div className="text-center">
                <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{analytics.pendingExpenses}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold mt-2">Pending Review</p>
              </div>

              <div className="text-center">
                <p className="text-4xl font-bold text-red-600 dark:text-red-400">{analytics.rejectedExpenses}</p>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-semibold mt-2">Rejected</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expenses Mode */}
      {viewMode === 'expenses' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">💸 Expense Breakdown by Category</h3>

            {Object.entries(analytics.categoryBreakdown)
              .filter(([_, data]) => data.amount > 0)
              .sort(([_, a], [__, b]) => b.amount - a.amount)
              .map(([category, data]) => (
                <div key={category} className="mb-6 pb-6 border-b border-slate-200 dark:border-slate-700 last:border-b-0 last:pb-0 last:mb-0">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-slate-900 dark:text-white">{category}</h4>
                    <div className="text-right">
                      <p className="font-bold text-slate-900 dark:text-white">${(data.amount / 1000).toFixed(1)}K</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">{data.percentage}% • {data.count} items</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                      style={{ width: `${data.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}

            {Object.values(analytics.categoryBreakdown).every(data => data.amount === 0) && (
              <p className="text-center text-slate-600 dark:text-slate-400">No expense data available</p>
            )}
          </div>
        </div>
      )}

      {/* Phases Mode */}
      {viewMode === 'phases' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">📊 Phase Progress</h3>

            <div className="space-y-6">
              {PHASE_IDS.map(phaseId => {
                const progress = analytics.phaseProgress[phaseId]
                const percentage = progress?.percentage || 0

                return (
                  <div key={phaseId} className="pb-6 border-b border-slate-200 dark:border-slate-700 last:border-b-0 last:pb-0">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-slate-900 dark:text-white">{PHASE_NAMES[phaseId]}</h4>
                      <div className="text-right">
                        <p className="font-bold text-slate-900 dark:text-white text-lg">{percentage}%</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">
                          {progress?.tasksCompleted || 0}/{progress?.totalTasks || 0} tasks
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          percentage >= 80
                            ? 'bg-gradient-to-r from-green-500 to-green-600'
                            : percentage >= 50
                            ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                            : 'bg-gradient-to-r from-yellow-500 to-yellow-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Trends Mode */}
      {viewMode === 'trends' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">📈 Monthly Spending Trend</h3>

            {analytics.monthlyTrend.length > 0 ? (
              <div className="space-y-6">
                {analytics.monthlyTrend.map((month, idx) => (
                  <div key={idx} className="pb-6 border-b border-slate-200 dark:border-slate-700 last:border-b-0 last:pb-0">
                    <p className="font-bold text-slate-900 dark:text-white mb-3">{month.month}</p>
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-xs text-slate-600 dark:text-slate-400">Spent</span>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            ${(month.spent / 1000).toFixed(1)}K
                          </span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-orange-500"
                            style={{
                              width: `${month.allocated > 0 ? (month.spent / month.allocated) * 100 : 0}%`
                            }}
                          ></div>
                        </div>
                      </div>
                      {month.allocated > 0 && (
                        <div>
                          <div className="flex justify-between mb-1">
                            <span className="text-xs text-slate-600 dark:text-slate-400">Allocated</span>
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              ${(month.allocated / 1000).toFixed(1)}K
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-600 dark:text-slate-400">No trend data available</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdvancedAnalytics
