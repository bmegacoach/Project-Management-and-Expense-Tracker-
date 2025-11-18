import React, { useEffect, useMemo, useState } from 'react'
import { Firestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy } from 'firebase/firestore'

type Expense = {
  id: string
  description: string
  amount: number
  category: 'labor' | 'materials' | 'equipment' | 'permits' | 'other'
  phaseId: string
  teamId?: string
  lineItem: string
  date: Date
  vendor?: string
  invoiceNumber?: string
  paymentStatus: 'pending' | 'paid'
  notes?: string
  createdAt: Date
  updatedAt: Date
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

const EXPENSE_CATEGORIES = [
  { value: 'labor', label: '👷 Labor' },
  { value: 'materials', label: '📦 Materials' },
  { value: 'equipment', label: '🔧 Equipment' },
  { value: 'permits', label: '📋 Permits' },
  { value: 'other', label: '📌 Other' }
]

function Expenses({ db }: { db: Firestore | null }) {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filterPhase, setFilterPhase] = useState<string>('All')
  const [filterCategory, setFilterCategory] = useState<string>('All')
  const [filterStatus, setFilterStatus] = useState<string>('All')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Form state
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState<'labor' | 'materials' | 'equipment' | 'permits' | 'other'>('materials')
  const [phaseId, setPhaseId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [lineItem, setLineItem] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [vendor, setVendor] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid'>('pending')
  const [notes, setNotes] = useState('')

  // Load expenses from Firestore
  useEffect(() => {
    if (!db) return

    const unsubscribe = onSnapshot(
      collection(db, 'expenses'),
      snapshot => {
        const loadedExpenses: Expense[] = []
        snapshot.forEach(doc => {
          const data = doc.data()
          loadedExpenses.push({
            id: doc.id,
            ...data,
            date: data.date?.toDate() || new Date(),
            createdAt: data.createdAt?.toDate() || new Date(),
            updatedAt: data.updatedAt?.toDate() || new Date()
          } as Expense)
        })
        setExpenses(loadedExpenses.sort((a, b) => b.date.getTime() - a.date.getTime()))
      }
    )

    return () => unsubscribe()
  }, [db])

  const filtered = useMemo(() => {
    return expenses.filter(exp => {
      const phaseMatch = filterPhase === 'All' || exp.phaseId === filterPhase
      const categoryMatch = filterCategory === 'All' || exp.category === filterCategory
      const statusMatch = filterStatus === 'All' || exp.paymentStatus === filterStatus
      return phaseMatch && categoryMatch && statusMatch
    })
  }, [expenses, filterPhase, filterCategory, filterStatus])

  const totals = useMemo(() => {
    return {
      total: filtered.reduce((sum, exp) => sum + exp.amount, 0),
      paid: filtered.filter(exp => exp.paymentStatus === 'paid').reduce((sum, exp) => sum + exp.amount, 0),
      pending: filtered.filter(exp => exp.paymentStatus === 'pending').reduce((sum, exp) => sum + exp.amount, 0)
    }
  }, [filtered])

  const resetForm = () => {
    setDescription('')
    setAmount('')
    setCategory('materials')
    setPhaseId('')
    setTeamId('')
    setLineItem('')
    setDate(new Date().toISOString().split('T')[0])
    setVendor('')
    setInvoiceNumber('')
    setPaymentStatus('pending')
    setNotes('')
    setEditingId(null)
    setShowForm(false)
  }

  const handleAddExpense = async () => {
    if (!db || !description || !amount || !phaseId || !lineItem) {
      setMessage({ type: 'error', text: '❌ Please fill in all required fields' })
      return
    }

    setIsSubmitting(true)
    try {
      const expenseData = {
        description,
        amount: parseFloat(amount),
        category,
        phaseId,
        teamId: teamId || null,
        lineItem,
        date: new Date(date),
        vendor: vendor || null,
        invoiceNumber: invoiceNumber || null,
        paymentStatus,
        notes: notes || null,
        updatedAt: new Date()
      }

      if (editingId) {
        await updateDoc(doc(db, 'expenses', editingId), expenseData)
        setMessage({ type: 'success', text: '✅ Expense updated successfully!' })
      } else {
        await addDoc(collection(db, 'expenses'), {
          ...expenseData,
          createdAt: new Date()
        })
        setMessage({ type: 'success', text: '✅ Expense added successfully!' })
      }

      resetForm()
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Error saving expense' })
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (expense: Expense) => {
    setDescription(expense.description)
    setAmount(expense.amount.toString())
    setCategory(expense.category)
    setPhaseId(expense.phaseId)
    setTeamId(expense.teamId || '')
    setLineItem(expense.lineItem)
    setDate(expense.date.toISOString().split('T')[0])
    setVendor(expense.vendor || '')
    setInvoiceNumber(expense.invoiceNumber || '')
    setPaymentStatus(expense.paymentStatus)
    setNotes(expense.notes || '')
    setEditingId(expense.id)
    setShowForm(true)
  }

  const handleDelete = async (id: string, desc: string) => {
    if (!db || !confirm(`Delete expense "${desc}"?`)) return
    try {
      await deleteDoc(doc(db, 'expenses', id))
      setMessage({ type: 'success', text: '✅ Expense deleted successfully!' })
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      setMessage({ type: 'error', text: '❌ Error deleting expense' })
      console.error(error)
    }
  }

  return (
    <div className="grid gap-4 sm:gap-8">
      {/* Message Alert */}
      {message && (
        <div className={`p-4 rounded-lg border-2 ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900 border-green-300 dark:border-green-700 text-green-700 dark:text-green-200'
            : 'bg-red-50 dark:bg-red-900 border-red-300 dark:border-red-700 text-red-700 dark:text-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Header & Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Expense Tracking</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Manage project expenses and budget</p>
          </div>
          <span className="text-3xl sm:text-4xl flex-shrink-0">💰</span>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
            <div className="text-xs font-bold text-blue-600 dark:text-blue-300 uppercase">Total Expenses</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-200 mt-1">${totals.total.toFixed(2)}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4">
            <div className="text-xs font-bold text-green-600 dark:text-green-300 uppercase">Paid</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-200 mt-1">${totals.paid.toFixed(2)}</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900 rounded-lg p-4">
            <div className="text-xs font-bold text-yellow-600 dark:text-yellow-300 uppercase">Pending</div>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-200 mt-1">${totals.pending.toFixed(2)}</div>
          </div>
        </div>

        {!showForm && (
          <button
            className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg hover:shadow-xl hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
            onClick={() => setShowForm(true)}
          >
            + Add New Expense
          </button>
        )}

        {showForm && (
          <div className="space-y-4 sm:space-y-5 bg-slate-50 dark:bg-slate-700 rounded-lg sm:rounded-xl p-4 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description *</label>
                <input
                  type="text"
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  placeholder="e.g., Concrete delivery"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Amount *</label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-slate-600 dark:text-slate-400 font-bold">$</span>
                  <input
                    type="number"
                    className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg pl-8 pr-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Category *</label>
                <select
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  disabled={isSubmitting}
                >
                  {EXPENSE_CATEGORIES.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Phase *</label>
                <select
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  value={phaseId}
                  onChange={(e) => setPhaseId(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Select a phase...</option>
                  {PHASE_IDS.map(pid => (
                    <option key={pid} value={pid}>{PHASE_NAMES[pid]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Line Item *</label>
                <input
                  type="text"
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  placeholder="e.g., Materials - Phase 1"
                  value={lineItem}
                  onChange={(e) => setLineItem(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Date *</label>
                <input
                  type="date"
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Vendor</label>
                <input
                  type="text"
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  placeholder="Vendor name"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Invoice #</label>
                <input
                  type="text"
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                  placeholder="Invoice number"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Payment Status</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="pending"
                    checked={paymentStatus === 'pending'}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">⏳ Pending</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="paid"
                    checked={paymentStatus === 'paid'}
                    onChange={(e) => setPaymentStatus(e.target.value as any)}
                    disabled={isSubmitting}
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">✅ Paid</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Notes</label>
              <textarea
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
                placeholder="Additional details..."
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
              <button
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:shadow-lg transition-all active:scale-95"
                onClick={handleAddExpense}
                disabled={isSubmitting}
              >
                {isSubmitting ? '⏳ Saving...' : editingId ? '💾 Update Expense' : '➕ Add Expense'}
              </button>
              <button
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:bg-slate-100 dark:hover:bg-slate-600 transition-all disabled:opacity-50"
                onClick={resetForm}
                disabled={isSubmitting}
              >
                ✕ Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
        <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Filters</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Phase</label>
            <select
              className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded px-3 py-2 text-sm"
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
            >
              <option value="All">All Phases</option>
              {PHASE_IDS.map(pid => (
                <option key={pid} value={pid}>{PHASE_NAMES[pid].split(':')[0]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Category</label>
            <select
              className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded px-3 py-2 text-sm"
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
            >
              <option value="All">All Categories</option>
              {EXPENSE_CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">Payment Status</label>
            <select
              className="w-full border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 rounded px-3 py-2 text-sm"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="pending">⏳ Pending</option>
              <option value="paid">✅ Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 text-center">
            <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">📭 No expenses found</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(exp => (
              <div key={exp.id} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4 sm:p-6 hover:shadow-md transition-shadow">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">{exp.description}</h4>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                        {PHASE_NAMES[exp.phaseId].split(':')[0]}
                      </span>
                      <span className="text-xs bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 px-2 py-1 rounded">
                        {EXPENSE_CATEGORIES.find(c => c.value === exp.category)?.label}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded font-semibold ${
                        exp.paymentStatus === 'paid'
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                      }`}>
                        {exp.paymentStatus === 'paid' ? '✅ Paid' : '⏳ Pending'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{exp.lineItem} • {exp.date.toLocaleDateString()}</p>
                    {exp.vendor && <p className="text-xs text-slate-500 dark:text-slate-500">Vendor: {exp.vendor}</p>}
                    {exp.notes && <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">📝 {exp.notes}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-lg sm:text-2xl font-bold text-blue-600 dark:text-blue-400">${exp.amount.toFixed(2)}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Amount</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(exp)}
                        className="px-3 py-1 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded text-xs font-medium transition-colors"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(exp.id, exp.description)}
                        className="px-3 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded text-xs font-medium transition-colors"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Expenses
