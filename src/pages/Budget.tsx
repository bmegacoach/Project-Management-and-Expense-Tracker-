import React, { useEffect, useMemo, useState } from 'react'
import { Firestore, collection, doc, onSnapshot, updateDoc, addDoc, deleteDoc } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type BudgetDoc = { totalBudget?: number }
type Draw = { id: string; amount?: number; status?: string; scheduledAt?: string }
type Task = { id: string; status?: string; approvedValue?: number }

function Budget({ db, role }: { db: Firestore | null; role: Role }) {
  const [budget, setBudget] = useState<BudgetDoc>({})
  const [draws, setDraws] = useState<Draw[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [showDrawForm, setShowDrawForm] = useState(false)
  const [editingDrawId, setEditingDrawId] = useState<string | null>(null)
  const [drawAmount, setDrawAmount] = useState('')

  useEffect(() => {
    if (!db) return
    const u1 = onSnapshot(collection(db, 'budget'), s => {
      const doc = s.docs[0]
      setBudget(doc ? (doc.data() as any) : {})
    })
    const u2 = onSnapshot(collection(db, 'draws'), s => {
      const list: Draw[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setDraws(list)
    })
    const u3 = onSnapshot(collection(db, 'tasks'), s => {
      const list: Task[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setTasks(list)
    })
    return () => { u1(); u2(); u3() }
  }, [db])

  const totalBudget = budget.totalBudget || 0
  const approvedWorkValue = tasks.reduce((a, t) => a + (t.status === 'pm_approved' ? (t.approvedValue || 0) : 0), 0)
  const milestoneReached = totalBudget > 0 && approvedWorkValue / totalBudget >= 0.7

  const scheduleDraw = async (drawId: string) => {
    if (role !== 'portfolio_manager') return
    if (!db) return
    await updateDoc(doc(db, 'draws', drawId), { status: 'scheduled' })
    const mailto = `mailto:?subject=Draw%20Scheduled&body=Draw%20${drawId}%20scheduled%20for%20amount%3A%20${encodeURIComponent(String(draws.find(x => x.id === drawId)?.amount || ''))}`
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

  return (
    <div className="grid gap-4 sm:gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">Draw Eligibility</span>
            <span className="text-xl sm:text-2xl">🎯</span>
          </div>
          <div className={`text-xl sm:text-2xl font-bold ${milestoneReached ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
            {milestoneReached ? 'Eligible' : 'Not Eligible'}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">
            {milestoneReached ? '70% milestone reached' : 'Need 70% of work approved'}
          </p>
        </div>
      </div>

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
                      onClick={() => scheduleDraw(d.id)}
                    >
                      Schedule
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
    </div>
  )
}

export default Budget
