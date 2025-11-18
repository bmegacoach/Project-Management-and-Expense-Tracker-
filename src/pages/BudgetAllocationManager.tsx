import React, { useState, useEffect } from 'react'
import { Firestore, collection, doc, onSnapshot, updateDoc, setDoc, Timestamp } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type BudgetAllocation = {
  id?: string
  phaseId: string
  phaseName: string
  allocatedBudget: number
  spent: number
  remaining: number
  percentageSpent: number
  lastUpdatedAt?: string
  lastUpdatedBy?: string
}

type CategoryBudget = {
  id?: string
  category: 'labor' | 'materials' | 'equipment' | 'permits' | 'other'
  allocatedBudget: number
  spent: number
  remaining: number
  percentageSpent: number
  lastUpdatedAt?: string
  lastUpdatedBy?: string
}

type BudgetData = {
  totalProjectBudget: number
  phaseAllocations: BudgetAllocation[]
  categoryBudgets: CategoryBudget[]
  createdAt?: string
  updatedAt?: string
}

function BudgetAllocationManager({ db, role }: { db: Firestore | null; role: Role }) {
  const [budgetData, setBudgetData] = useState<BudgetData>({
    totalProjectBudget: 120000,
    phaseAllocations: [],
    categoryBudgets: []
  })
  
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editingPhase, setEditingPhase] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<string | null>(null)
  const [showPhaseForm, setShowPhaseForm] = useState(false)
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [formData, setFormData] = useState({ budget: 0 })

  const PHASE_IDS = [
    { id: 'phase-1-pre-construction-demolition', name: 'Phase 1: Pre-Construction & Demolition' },
    { id: 'phase-2-structural-envelope', name: 'Phase 2: Structural Envelope' },
    { id: 'phase-3-mep-rough-in', name: 'Phase 3: MEP Rough-In' },
    { id: 'phase-4-interior-finishes-exterior-cladding', name: 'Phase 4: Interior Finishes & Exterior Cladding' },
    { id: 'phase-5-fixtures-appliances-final-touches', name: 'Phase 5: Fixtures, Appliances & Final Touches' }
  ]

  const DEFAULT_PHASE_BUDGETS = {
    'phase-1-pre-construction-demolition': 15000,
    'phase-2-structural-envelope': 35000,
    'phase-3-mep-rough-in': 28000,
    'phase-4-interior-finishes-exterior-cladding': 30000,
    'phase-5-fixtures-appliances-final-touches': 12000
  }

  const DEFAULT_CATEGORY_BUDGETS = {
    labor: 50000,
    materials: 80000,
    equipment: 25000,
    permits: 5000,
    other: 10000
  }

  const CATEGORIES = [
    { id: 'labor', name: '👤 Labor', icon: '👤' },
    { id: 'materials', name: '📦 Materials', icon: '📦' },
    { id: 'equipment', name: '🏗️ Equipment', icon: '🏗️' },
    { id: 'permits', name: '📋 Permits', icon: '📋' },
    { id: 'other', name: '📌 Other', icon: '📌' }
  ]

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }

    const loadBudgetData = async () => {
      try {
        // Load or initialize budget document
        const budgetRef = doc(db, 'budgetAllocations', 'main')
        const unsubscribe = onSnapshot(budgetRef, (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as BudgetData
            setBudgetData(data)
          } else {
            // Initialize with defaults
            initializeBudgetData()
          }
          setLoading(false)
        })

        return () => unsubscribe()
      } catch (error) {
        console.error('Error loading budget data:', error)
        setLoading(false)
      }
    }

    loadBudgetData()
  }, [db])

  const initializeBudgetData = async () => {
    if (!db) return

    const phaseAllocations: BudgetAllocation[] = PHASE_IDS.map(phase => ({
      phaseId: phase.id,
      phaseName: phase.name,
      allocatedBudget: DEFAULT_PHASE_BUDGETS[phase.id as keyof typeof DEFAULT_PHASE_BUDGETS] || 0,
      spent: 0,
      remaining: DEFAULT_PHASE_BUDGETS[phase.id as keyof typeof DEFAULT_PHASE_BUDGETS] || 0,
      percentageSpent: 0,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: role
    }))

    const categoryBudgets: CategoryBudget[] = CATEGORIES.map(cat => ({
      category: cat.id as any,
      allocatedBudget: DEFAULT_CATEGORY_BUDGETS[cat.id as keyof typeof DEFAULT_CATEGORY_BUDGETS] || 0,
      spent: 0,
      remaining: DEFAULT_CATEGORY_BUDGETS[cat.id as keyof typeof DEFAULT_CATEGORY_BUDGETS] || 0,
      percentageSpent: 0,
      lastUpdatedAt: new Date().toISOString(),
      lastUpdatedBy: role
    }))

    const newData: BudgetData = {
      totalProjectBudget: 120000,
      phaseAllocations,
      categoryBudgets,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    try {
      await setDoc(doc(db, 'budgetAllocations', 'main'), newData)
      setBudgetData(newData)
      setMessage({ type: 'success', text: 'Budget allocations initialized' })
    } catch (error) {
      console.error('Error initializing budget data:', error)
      setMessage({ type: 'error', text: 'Failed to initialize budget data' })
    }
  }

  const handleUpdatePhaseBudget = async (phaseId: string) => {
    if (!db || !formData.budget) return

    try {
      const budgetRef = doc(db, 'budgetAllocations', 'main')
      const updatedPhases = budgetData.phaseAllocations.map(phase =>
        phase.phaseId === phaseId
          ? {
              ...phase,
              allocatedBudget: formData.budget,
              remaining: formData.budget - phase.spent,
              percentageSpent: Math.round((phase.spent / formData.budget) * 100) || 0,
              lastUpdatedAt: new Date().toISOString(),
              lastUpdatedBy: role
            }
          : phase
      )

      await updateDoc(budgetRef, {
        phaseAllocations: updatedPhases,
        updatedAt: new Date().toISOString()
      })

      setMessage({ type: 'success', text: 'Phase budget updated successfully' })
      setEditingPhase(null)
      setFormData({ budget: 0 })
      setShowPhaseForm(false)
    } catch (error) {
      console.error('Error updating phase budget:', error)
      setMessage({ type: 'error', text: 'Failed to update phase budget' })
    }
  }

  const handleUpdateCategoryBudget = async (category: string) => {
    if (!db || !formData.budget) return

    try {
      const budgetRef = doc(db, 'budgetAllocations', 'main')
      const updatedCategories = budgetData.categoryBudgets.map(cat =>
        cat.category === category
          ? {
              ...cat,
              allocatedBudget: formData.budget,
              remaining: formData.budget - cat.spent,
              percentageSpent: Math.round((cat.spent / formData.budget) * 100) || 0,
              lastUpdatedAt: new Date().toISOString(),
              lastUpdatedBy: role
            }
          : cat
      )

      await updateDoc(budgetRef, {
        categoryBudgets: updatedCategories,
        updatedAt: new Date().toISOString()
      })

      setMessage({ type: 'success', text: 'Category budget updated successfully' })
      setEditingCategory(null)
      setFormData({ budget: 0 })
      setShowCategoryForm(false)
    } catch (error) {
      console.error('Error updating category budget:', error)
      setMessage({ type: 'error', text: 'Failed to update category budget' })
    }
  }

  const startEditPhase = (phaseId: string) => {
    const phase = budgetData.phaseAllocations.find(p => p.phaseId === phaseId)
    if (phase) {
      setEditingPhase(phaseId)
      setFormData({ budget: phase.allocatedBudget })
      setShowPhaseForm(true)
    }
  }

  const startEditCategory = (category: string) => {
    const cat = budgetData.categoryBudgets.find(c => c.category === category)
    if (cat) {
      setEditingCategory(category)
      setFormData({ budget: cat.allocatedBudget })
      setShowCategoryForm(true)
    }
  }

  const cancelEditPhase = () => {
    setEditingPhase(null)
    setFormData({ budget: 0 })
    setShowPhaseForm(false)
  }

  const cancelEditCategory = () => {
    setEditingCategory(null)
    setFormData({ budget: 0 })
    setShowCategoryForm(false)
  }

  const totalAllocated = budgetData.phaseAllocations.reduce((sum, p) => sum + p.allocatedBudget, 0)
  const totalSpent = budgetData.phaseAllocations.reduce((sum, p) => sum + p.spent, 0)
  const totalRemaining = totalAllocated - totalSpent

  const getProgressColor = (percentage: number) => {
    if (percentage <= 70) return 'bg-green-500'
    if (percentage <= 90) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading budget data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">💰 Budget Allocation Manager</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Set and manage budget allocations by phase and category</p>
          </div>
          <span className="text-4xl">💼</span>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border-2 ${
            message.type === 'success'
              ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700'
              : 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700'
          }`}>
            <p className={`${
              message.type === 'success'
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            } font-semibold`}>
              {message.type === 'success' ? '✓' : '✕'} {message.text}
            </p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
            <p className="text-sm font-semibold opacity-90">Total Allocated</p>
            <p className="text-3xl font-bold mt-2">${totalAllocated.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
            <p className="text-sm font-semibold opacity-90">Total Spent</p>
            <p className="text-3xl font-bold mt-2">${totalSpent.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
            <p className="text-sm font-semibold opacity-90">Total Remaining</p>
            <p className="text-3xl font-bold mt-2">${totalRemaining.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Phase Budgets */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 sm:px-8 py-4 sm:py-6">
          <h3 className="text-lg sm:text-2xl font-bold text-white">📋 Phase Budgets</h3>
        </div>

        <div className="space-y-4 p-4 sm:p-8">
          {budgetData.phaseAllocations.map(phase => (
            <div key={phase.phaseId} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 sm:p-6 border border-slate-200 dark:border-slate-600">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{phase.phaseName}</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{phase.phaseId}</p>
                </div>
                <button
                  onClick={() => startEditPhase(phase.phaseId)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all whitespace-nowrap"
                >
                  ✏️ Edit Budget
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Allocated</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">${phase.allocatedBudget.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Spent</p>
                  <p className="text-lg font-bold text-slate-900 dark:text-white">${phase.spent.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Remaining</p>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">${phase.remaining.toLocaleString()}</p>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Spent Percentage</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{phase.percentageSpent}%</span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3">
                  <div
                    className={`${getProgressColor(phase.percentageSpent)} h-3 rounded-full transition-all`}
                    style={{ width: `${phase.percentageSpent}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category Budgets */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 sm:px-8 py-4 sm:py-6">
          <h3 className="text-lg sm:text-2xl font-bold text-white">🎯 Category Budgets</h3>
        </div>

        <div className="space-y-4 p-4 sm:p-8">
          {budgetData.categoryBudgets.map(category => {
            const categoryInfo = CATEGORIES.find(c => c.id === category.category)
            return (
              <div key={category.category} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 sm:p-6 border border-slate-200 dark:border-slate-600">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm sm:text-base">{categoryInfo?.name}</h4>
                  </div>
                  <button
                    onClick={() => startEditCategory(category.category)}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm transition-all whitespace-nowrap"
                  >
                    ✏️ Edit Budget
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Allocated</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">${category.allocatedBudget.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Spent</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">${category.spent.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">Remaining</p>
                    <p className="text-lg font-bold text-green-600 dark:text-green-400">${category.remaining.toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Spent Percentage</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{category.percentageSpent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3">
                    <div
                      className={`${getProgressColor(category.percentageSpent)} h-3 rounded-full transition-all`}
                      style={{ width: `${category.percentageSpent}%` }}
                    />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Edit Phase Budget Modal */}
      {showPhaseForm && editingPhase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Edit Phase Budget
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {budgetData.phaseAllocations.find(p => p.phaseId === editingPhase)?.phaseName}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleUpdatePhaseBudget(editingPhase)
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Budget Amount *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.budget}
                  onChange={(e) => setFormData({ budget: parseInt(e.target.value) || 0 })}
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all"
                >
                  Update Budget
                </button>
                <button
                  type="button"
                  onClick={cancelEditPhase}
                  className="flex-1 px-4 py-2 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Budget Modal */}
      {showCategoryForm && editingCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-md w-full">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Edit Category Budget
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {CATEGORIES.find(c => c.id === editingCategory)?.name}
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleUpdateCategoryBudget(editingCategory)
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Budget Amount *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.budget}
                  onChange={(e) => setFormData({ budget: parseInt(e.target.value) || 0 })}
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold transition-all"
                >
                  Update Budget
                </button>
                <button
                  type="button"
                  onClick={cancelEditCategory}
                  className="flex-1 px-4 py-2 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default BudgetAllocationManager
