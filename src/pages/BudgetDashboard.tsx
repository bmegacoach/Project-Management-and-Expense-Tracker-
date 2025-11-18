import React, { useEffect, useMemo, useState } from 'react'
import { Firestore, collection, onSnapshot, query, getDocs } from 'firebase/firestore'

type BudgetReport = {
  totalBudget: number
  totalSpent: number
  remaining: number
  percentageSpent: number
  byPhase: Record<string, BudgetBreakdown>
  byCategory: Record<string, BudgetBreakdown>
  forecast: {
    projectedAtCompletion: number
    variance: number
    variancePercent: number
  }
}

type BudgetBreakdown = {
  budgeted: number
  spent: number
  remaining: number
  percentageSpent: number
  forecast: number
}

const PHASE_IDS = [
  'phase-1-pre-construction-demolition',
  'phase-2-structural-envelope',
  'phase-3-mep-rough-in',
  'phase-4-interior-finishes-exterior-cladding',
  'phase-5-fixtures-appliances-final-touches'
]

const PHASE_NAMES: Record<string, string> = {
  'phase-1-pre-construction-demolition': 'Phase 1: Pre-Construction & Demolition',
  'phase-2-structural-envelope': 'Phase 2: Structural & Envelope',
  'phase-3-mep-rough-in': 'Phase 3: MEP Rough-in',
  'phase-4-interior-finishes-exterior-cladding': 'Phase 4: Interior Finishes & Exterior Cladding',
  'phase-5-fixtures-appliances-final-touches': 'Phase 5: Fixtures, Appliances & Final Touches'
}

// Example budget allocation - in production, this would be configurable
const DEFAULT_BUDGET: Record<string, number> = {
  'phase-1-pre-construction-demolition': 15000,
  'phase-2-structural-envelope': 35000,
  'phase-3-mep-rough-in': 28000,
  'phase-4-interior-finishes-exterior-cladding': 30000,
  'phase-5-fixtures-appliances-final-touches': 12000
}

const CATEGORY_BUDGET: Record<string, number> = {
  labor: 50000,
  materials: 80000,
  equipment: 25000,
  permits: 5000,
  other: 10000
}

function BudgetDashboard({ db }: { db: Firestore | null }) {
  const [budgetReport, setBudgetReport] = useState<BudgetReport | null>(null)
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!db) return

    setLoading(true)
    const unsubscribe = onSnapshot(
      collection(db, 'expenses'),
      snapshot => {
        const loadedExpenses: any[] = []
        snapshot.forEach(doc => {
          const data = doc.data()
          loadedExpenses.push({
            id: doc.id,
            ...data,
            date: data.date?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date()
          })
        })
        setExpenses(loadedExpenses)

        // Calculate budget report
        const report: BudgetReport = {
          totalBudget: Object.values(DEFAULT_BUDGET).reduce((a, b) => a + b, 0),
          totalSpent: 0,
          remaining: 0,
          percentageSpent: 0,
          byPhase: {},
          byCategory: {},
          forecast: {
            projectedAtCompletion: 0,
            variance: 0,
            variancePercent: 0
          }
        }

        // Initialize phase breakdown
        PHASE_IDS.forEach(phaseId => {
          report.byPhase[phaseId] = {
            budgeted: DEFAULT_BUDGET[phaseId] || 0,
            spent: 0,
            remaining: 0,
            percentageSpent: 0,
            forecast: 0
          }
        })

        // Initialize category breakdown
        Object.entries(CATEGORY_BUDGET).forEach(([category, budget]) => {
          report.byCategory[category] = {
            budgeted: budget,
            spent: 0,
            remaining: 0,
            percentageSpent: 0,
            forecast: 0
          }
        })

        // Sum up expenses
        loadedExpenses.forEach(expense => {
          report.totalSpent += expense.amount || 0
          
          if (report.byPhase[expense.phaseId]) {
            report.byPhase[expense.phaseId].spent += expense.amount || 0
          }
          
          if (report.byCategory[expense.category]) {
            report.byCategory[expense.category].spent += expense.amount || 0
          }
        })

        // Calculate remaining and percentages
        report.remaining = report.totalBudget - report.totalSpent
        report.percentageSpent = report.totalBudget > 0 ? (report.totalSpent / report.totalBudget) * 100 : 0

        Object.keys(report.byPhase).forEach(phaseId => {
          const phase = report.byPhase[phaseId]
          phase.remaining = phase.budgeted - phase.spent
          phase.percentageSpent = phase.budgeted > 0 ? (phase.spent / phase.budgeted) * 100 : 0
          phase.forecast = phase.spent > 0 ? (phase.spent / phase.percentageSpent) * 100 : phase.budgeted
        })

        Object.keys(report.byCategory).forEach(category => {
          const cat = report.byCategory[category]
          cat.remaining = cat.budgeted - cat.spent
          cat.percentageSpent = cat.budgeted > 0 ? (cat.spent / cat.budgeted) * 100 : 0
          cat.forecast = cat.spent > 0 ? (cat.spent / cat.percentageSpent) * 100 : cat.budgeted
        })

        // Calculate forecast
        report.forecast.projectedAtCompletion = Object.values(report.byPhase).reduce((sum, p) => sum + p.forecast, 0)
        report.forecast.variance = report.forecast.projectedAtCompletion - report.totalBudget
        report.forecast.variancePercent = report.totalBudget > 0 ? (report.forecast.variance / report.totalBudget) * 100 : 0

        setBudgetReport(report)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [db])

  if (loading || !budgetReport) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading budget data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:gap-8">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Budget Dashboard</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Budget vs. Actual Spending Analysis</p>
          </div>
          <span className="text-3xl sm:text-4xl flex-shrink-0">📊</span>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-4">
            <div className="text-xs font-bold text-blue-600 dark:text-blue-300 uppercase">Total Budget</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-200 mt-2">${budgetReport.totalBudget.toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900 dark:to-red-800 rounded-lg p-4">
            <div className="text-xs font-bold text-red-600 dark:text-red-300 uppercase">Total Spent</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-200 mt-2">${budgetReport.totalSpent.toLocaleString()}</div>
          </div>
          <div className={`bg-gradient-to-br rounded-lg p-4 ${
            budgetReport.remaining >= 0
              ? 'from-green-50 to-green-100 dark:from-green-900 dark:to-green-800'
              : 'from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800'
          }`}>
            <div className={`text-xs font-bold uppercase ${
              budgetReport.remaining >= 0
                ? 'text-green-600 dark:text-green-300'
                : 'text-orange-600 dark:text-orange-300'
            }`}>
              Remaining
            </div>
            <div className={`text-2xl font-bold mt-2 ${
              budgetReport.remaining >= 0
                ? 'text-green-700 dark:text-green-200'
                : 'text-orange-700 dark:text-orange-200'
            }`}>
              ${Math.abs(budgetReport.remaining).toLocaleString()}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-4">
            <div className="text-xs font-bold text-purple-600 dark:text-purple-300 uppercase">Spent %</div>
            <div className="text-2xl font-bold text-purple-700 dark:text-purple-200 mt-2">{budgetReport.percentageSpent.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Overall Progress Bar */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
        <div className="flex justify-between mb-2">
          <h4 className="font-semibold text-slate-900 dark:text-white">Overall Budget Progress</h4>
          <span className="text-sm font-bold text-slate-600 dark:text-slate-400">{budgetReport.percentageSpent.toFixed(1)}%</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-4 overflow-hidden">
          <div
            className={`h-full transition-all rounded-full ${
              budgetReport.percentageSpent > 100
                ? 'bg-red-500'
                : budgetReport.percentageSpent > 80
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(budgetReport.percentageSpent, 100)}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
          {budgetReport.remaining >= 0
            ? `${budgetReport.remaining > 0 ? '$' + budgetReport.remaining.toLocaleString() + ' remaining' : 'On budget'}`
            : `$${Math.abs(budgetReport.remaining).toLocaleString()} over budget`}
        </p>
      </div>

      {/* Budget by Phase */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Budget by Phase</h4>
        <div className="grid gap-4">
          {PHASE_IDS.map(phaseId => {
            const phase = budgetReport.byPhase[phaseId]
            return (
              <div key={phaseId} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
                <div className="flex justify-between mb-2">
                  <h5 className="font-medium text-slate-900 dark:text-white text-sm">{PHASE_NAMES[phaseId].split(':')[0]}</h5>
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-400">${phase.spent.toLocaleString()} / ${phase.budgeted.toLocaleString()}</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden mb-2">
                  <div
                    className={`h-full transition-all rounded-full ${
                      phase.percentageSpent > 100
                        ? 'bg-red-500'
                        : phase.percentageSpent > 80
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(phase.percentageSpent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{phase.percentageSpent.toFixed(1)}% spent</span>
                  <span>{phase.remaining >= 0 ? `$${phase.remaining.toLocaleString()} remaining` : `$${Math.abs(phase.remaining).toLocaleString()} over`}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Budget by Category */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Budget by Category</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(budgetReport.byCategory).map(([category, breakdown]) => (
            <div key={category} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4">
              <div className="flex justify-between mb-2">
                <h5 className="font-medium text-slate-900 dark:text-white text-sm capitalize">{category}</h5>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{breakdown.percentageSpent.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden mb-2">
                <div
                  className={`h-full transition-all rounded-full ${
                    breakdown.percentageSpent > 100
                      ? 'bg-red-500'
                      : breakdown.percentageSpent > 80
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(breakdown.percentageSpent, 100)}%` }}
                />
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                ${breakdown.spent.toLocaleString()} / ${breakdown.budgeted.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forecast */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-4">Project Forecast</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">Projected Cost</div>
            <div className="text-2xl font-bold text-slate-900 dark:text-white">${budgetReport.forecast.projectedAtCompletion.toLocaleString()}</div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">Variance</div>
            <div className={`text-2xl font-bold ${budgetReport.forecast.variance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {budgetReport.forecast.variance > 0 ? '+' : ''}{budgetReport.forecast.variance.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase mb-2">Variance %</div>
            <div className={`text-2xl font-bold ${budgetReport.forecast.variancePercent > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {budgetReport.forecast.variancePercent > 0 ? '+' : ''}{budgetReport.forecast.variancePercent.toFixed(1)}%
            </div>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="bg-blue-50 dark:bg-blue-900 border-l-4 border-blue-500 rounded-lg p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          📌 <strong>Note:</strong> This dashboard shows budget allocation and spending tracking. To update budget amounts, contact your project manager. Forecasts are based on current spending patterns.
        </p>
      </div>
    </div>
  )
}

export default BudgetDashboard
