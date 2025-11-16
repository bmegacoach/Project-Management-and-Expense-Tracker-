import React, { useEffect, useMemo, useState } from 'react'
import { Firestore, collection, doc, onSnapshot, updateDoc, addDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type BudgetDoc = { totalBudget?: number }
type Draw = { id: string; drawNumber?: number; amount?: number; status?: string; scheduledAt?: string; taskAllocation?: number; interestMonths?: number }
type Task = { id: string; phase?: string; name?: string; status?: string; approvedValue?: number }
type PRDConfig = { PROJECT_WORK_VALUE?: number; TOTAL_SCHEDULED_DRAWS?: number; MONTHLY_INTEREST?: number; PROPERTY_ADDRESS?: string; PROJECT_NAME?: string }
type BudgetLineItem = { id: string; name?: string; value?: number; spent?: number; remaining?: number }

function Budget({ db, role }: { db: Firestore | null; role: Role }) {
  // Default PRD Constants (will be overridden by DB)
  const DEFAULT_PRD = {
    PROJECT_WORK_VALUE: 110000,
    TOTAL_SCHEDULED_DRAWS: 127400,
    MONTHLY_INTEREST: 2900,
    PROJECT_DURATION_MONTHS: 6,
    PROPERTY_ADDRESS: '4821 Briscoe St & 4829 Briscoe St, Houston, TX 77033',
    PROJECT_NAME: 'RED CARPET CONTRACTORS Project: Tech Camp 1'
  }

  const [budget, setBudget] = useState<BudgetDoc>({})
  const [draws, setDraws] = useState<Draw[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [budgetLineItems, setBudgetLineItems] = useState<BudgetLineItem[]>([])
  const [prdConfig, setPRDConfig] = useState<PRDConfig>(DEFAULT_PRD)
  const [showDrawForm, setShowDrawForm] = useState(false)
  const [showBudgetForm, setShowBudgetForm] = useState(false)
  const [editingDrawId, setEditingDrawId] = useState<string | null>(null)
  const [drawAmount, setDrawAmount] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')

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

    const u1 = onSnapshot(doc(db, 'budget', 'totals'), s => {
      setBudget(s.exists() ? (s.data() as any) : {})
    })
    const u2 = onSnapshot(collection(db, 'draws'), s => {
      const list: Draw[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setDraws(list.sort((a, b) => (a.drawNumber || 0) - (b.drawNumber || 0)))
    })
    const u3 = onSnapshot(collection(db, 'tasks'), s => {
      const list: Task[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setTasks(list)
    })
    const u4 = onSnapshot(collection(db, 'budgetLineItems'), s => {
      const list: BudgetLineItem[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setBudgetLineItems(list.sort((a, b) => (a.name || '').localeCompare(b.name || '')))
    })
    return () => { u1(); u2(); u3(); u4() }
  }, [db])

  const totalBudget = prdConfig.PROJECT_WORK_VALUE || 110000
  const approvedWorkValue = tasks.reduce((a, t) => a + (t.status === 'pm_approved' ? (t.approvedValue || 0) : 0), 0)
  const cwpPercentage = totalBudget > 0 ? (approvedWorkValue / totalBudget) * 100 : 0
  const milestoneReached = cwpPercentage >= 70
  const nextDrawNumber = Math.max(...draws.map(d => d.drawNumber || 0), 0) + 1

  const scheduleDraw = async (draw: Draw) => {
    if (role !== 'portfolio_manager' || !db) return
    
    // Update draw status to scheduled
    await updateDoc(doc(db, 'draws', draw.id), { status: 'scheduled' })
    
    // Get newly approved tasks for this draw
    const drawThreshold = draw.taskAllocation ? draw.taskAllocation * totalBudget : 0
    const approvedTasksForDraw = tasks.filter(t => 
      t.status === 'pm_approved' && 
      (t.approvedValue || 0) > 0
    )
    
    // Build mailto subject and body
    const drawNumber = draw.drawNumber || '?'
    const drawAmount = draw.amount?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || '$0'
    
    const tasksList = approvedTasksForDraw
      .map(t => `- ${t.name || `Task (${t.phase})`}: $${(t.approvedValue || 0).toLocaleString()}`)
      .join('\n')
    
    const subject = `Draw #${drawNumber} Request - ${drawAmount}`
    const body = `
Draw #${drawNumber} Submission
Amount: ${drawAmount}
Completed Work Percentage: ${cwpPercentage.toFixed(1)}%

Approved Tasks:
${tasksList || 'None'}

Project Value: $${totalBudget.toLocaleString()}
Total Scheduled Draws: $${(prdConfig.TOTAL_SCHEDULED_DRAWS || 127400).toLocaleString()}
Property: ${prdConfig.PROPERTY_ADDRESS || '4821 Briscoe St & 4829 Briscoe St, Houston, TX 77033'}
Project: ${prdConfig.PROJECT_NAME || 'RED CARPET CONTRACTORS - Tech Camp 1'}
    `.trim()
    
    const mailto = `mailto:bmegacoach1@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
  }

  const markDisbursed = async (drawId: string) => {
    if (role !== 'portfolio_manager') return
    if (!db) return
    await updateDoc(doc(db, 'draws', drawId), { status: 'disbursed' })
  }

  const handleAddDraw = async () => {
    if (!db || !drawAmount) return
    if (editingDrawId) {
      await updateDoc(doc(db, 'draws', editingDrawId), {
        amount: parseFloat(drawAmount)
      })
      setEditingDrawId(null)
    } else {
      await addDoc(collection(db, 'draws'), {
        amount: parseFloat(drawAmount),
        status: 'pending'
      })
    }
    setDrawAmount('')
    setShowDrawForm(false)
  }

  const handleEditDraw = (draw: Draw) => {
    setDrawAmount(draw.amount?.toString() || '')
    setEditingDrawId(draw.id)
    setShowDrawForm(true)
  }

  const handleDeleteDraw = async (drawId: string) => {
    if (!db || !window.confirm('Are you sure you want to delete this draw request?')) return
    await deleteDoc(doc(db, 'draws', drawId))
  }

  const handleCancel = () => {
    setShowDrawForm(false)
    setEditingDrawId(null)
    setDrawAmount('')
  }

  const handleSetBudget = async () => {
    if (!db || !budgetAmount) return
    const docRef = doc(db, 'budget', 'totals')
    await setDoc(docRef, { totalBudget: parseFloat(budgetAmount) }, { merge: true })
    setBudgetAmount('')
    setShowBudgetForm(false)
  }

  const handleCancelBudget = () => {
    setShowBudgetForm(false)
    setBudgetAmount('')
  }

  return (
    <div className="grid gap-4 sm:gap-8">
      {/* Draw Requests */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Add Draw Request</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Request project fund draws</p>
          </div>
          <span className="text-3xl sm:text-4xl flex-shrink-0">📝</span>
        </div>
        {!showDrawForm && (
          <button
            className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg hover:shadow-xl hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
            onClick={() => setShowDrawForm(true)}
          >
            + Add Draw Request
          </button>
        )}
        {showDrawForm && (
          <div className="space-y-4 sm:space-y-5 bg-slate-50 dark:bg-slate-700 rounded-lg sm:rounded-xl p-4 sm:p-6">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Draw Amount ($) *</label>
              <input
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all text-sm sm:text-base"
                type="number"
                placeholder="Enter draw amount"
                value={drawAmount}
                onChange={(e) => setDrawAmount(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
              <button
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
                onClick={handleAddDraw}
              >
                {editingDrawId ? 'Update Draw' : 'Create Draw'}
              </button>
              <button
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 dark:from-slate-700 to-blue-50 dark:to-slate-700">
          <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
            <span>💰</span> Draw Requests
          </h4>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {draws.length === 0 ? (
            <div className="p-4 sm:p-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center">No draw requests yet</div>
          ) : (
            draws.map(d => (
              <div key={d.id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4 mb-3">
                  <div className="flex-1">
                    <h5 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">Draw Request</h5>
                    <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">${d.amount?.toLocaleString() || 0}</p>
                  </div>
                  <div className="w-full sm:w-auto flex flex-col items-start sm:items-end gap-2 sm:gap-3">
                    <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium ${
                      d.status === 'disbursed' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                      d.status === 'scheduled' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300' :
                      'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {d.status === 'disbursed' ? '✓ Disbursed' :
                       d.status === 'scheduled' ? '📅 Scheduled' :
                       '⏳ Pending'}
                    </span>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleEditDraw(d)}
                        className="flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg font-medium transition-colors text-xs sm:text-sm"
                        title="Edit draw"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDeleteDraw(d.id)}
                        className="flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg font-medium transition-colors text-xs sm:text-sm"
                        title="Delete draw"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
                {role === 'portfolio_manager' && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      className="flex-1 px-3 sm:px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!milestoneReached}
                      onClick={() => scheduleDraw(d)}
                    >
                      Schedule Draw
                    </button>
                    <button
                      className="flex-1 px-3 sm:px-4 py-2 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                      onClick={() => markDisbursed(d.id)}
                    >
                      Mark Disbursed
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Budget Line Items */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Budget Line Items</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Project budget breakdown and spending tracking</p>
          </div>
          <span className="text-3xl sm:text-4xl flex-shrink-0">📊</span>
        </div>
        
        {budgetLineItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400 text-sm">
            No budget line items yet. Run migration to populate.
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {budgetLineItems.map(item => {
              const percentage = item.value && item.value > 0 
                ? ((item.spent || 0) / item.value) * 100 
                : 0
              
              return (
                <div key={item.id} className="border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm break-words">{item.name}</h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Spent: ${(item.spent || 0).toLocaleString()} / ${(item.value || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <span className={`text-sm sm:text-base font-bold ${
                        percentage <= 50 ? 'text-green-600 dark:text-green-400' :
                        percentage <= 90 ? 'text-yellow-600 dark:text-yellow-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 sm:h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        percentage <= 50 ? 'bg-gradient-to-r from-green-500 to-green-600' :
                        percentage <= 90 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600' :
                        'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400 mt-2">
                    <span>Remaining: ${((item.value || 0) - (item.spent || 0)).toLocaleString()}</span>
                    <span>Budget: ${(item.value || 0).toLocaleString()}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Summary Stats */}
        {budgetLineItems.length > 0 && (
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 sm:p-4">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total Budget</p>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                  ${budgetLineItems.reduce((a, i) => a + (i.value || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 sm:p-4">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Total Spent</p>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                  ${budgetLineItems.reduce((a, i) => a + (i.spent || 0), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 sm:p-4">
                <p className="text-xs text-slate-600 dark:text-slate-400 font-medium">Remaining</p>
                <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
                  ${(budgetLineItems.reduce((a, i) => a + (i.value || 0), 0) - budgetLineItems.reduce((a, i) => a + (i.spent || 0), 0)).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Budget
