import React, { useEffect, useMemo, useState } from 'react'
import { Firestore, collection, doc, onSnapshot, updateDoc, setDoc } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type Task = { id: string; phase?: string; status?: string; approvedValue?: number }
type Budget = { totalBudget?: number }
type Draw = { id: string; amount?: number; status?: string }

function Dashboard({ db, role }: { db: Firestore | null; role: Role }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [budget, setBudget] = useState<Budget>({})
  const [draws, setDraws] = useState<Draw[]>([])
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [budgetAmount, setBudgetAmount] = useState('')

  useEffect(() => {
    if (!db) return
    const unsub1 = onSnapshot(collection(db, 'tasks'), s => {
      const list: Task[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setTasks(list)
    })
    const unsub2 = onSnapshot(collection(db, 'budget'), s => {
      const doc = s.docs[0]
      setBudget(doc ? (doc.data() as any) : {})
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

  const totalBudget = budget.totalBudget || 0
  const approvedWorkValue = tasks.reduce((a, t) => a + (t.status === 'pm_approved' ? (t.approvedValue || 0) : 0), 0)
  const remainingBudget = Math.max(totalBudget - approvedWorkValue, 0)
  const totalDraws = draws.reduce((a, d) => a + (d.amount || 0), 0)
  const progress = totalBudget > 0 ? Math.min(Math.round((approvedWorkValue / totalBudget) * 100), 100) : 0

  const handleSetBudget = async () => {
    if (!db || !budgetAmount) return
    const docRef = doc(db, 'budget', 'totals')
    await setDoc(docRef, { totalBudget: parseFloat(budgetAmount) }, { merge: true })
    setBudgetAmount('')
    setShowBudgetForm(false)
  }

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
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Remaining</span>
            <span className="text-xl sm:text-2xl">📊</span>
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">${remainingBudget.toLocaleString()}</div>
          <div className="mt-2 h-1 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full"></div>
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
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Project Progress</h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">{progress}% of budget allocated</p>
          </div>
          <span className="text-2xl sm:text-3xl flex-shrink-0">🎯</span>
        </div>
        <div className="space-y-2">
          <div className="flex h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 dark:text-white">Set Total Budget</h3>
          <span className="text-2xl sm:text-3xl flex-shrink-0">⚙️</span>
        </div>
        {!showBudgetForm && (
          <button
            className="w-full sm:w-auto px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg sm:rounded-lg font-medium text-sm sm:text-base hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
            onClick={() => setShowBudgetForm(true)}
          >
            {totalBudget > 0 ? '✏️ Edit Budget' : '+ Set Budget'}
          </button>
        )}
        {showBudgetForm && (
          <div className="space-y-3 sm:space-y-4">
            <input
              className="w-full border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400 dark:placeholder-slate-500"
              type="number"
              placeholder="Enter total budget amount"
              value={budgetAmount}
              onChange={(e) => setBudgetAmount(e.target.value)}
            />
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium text-sm sm:text-base hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
                onClick={handleSetBudget}
              >
                Save Budget
              </button>
              <button
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-medium text-sm sm:text-base hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
                onClick={() => setShowBudgetForm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
