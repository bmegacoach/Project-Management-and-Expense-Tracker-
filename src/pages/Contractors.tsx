import React, { useEffect, useMemo, useState } from 'react'
import { Firestore, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'

type Contractor = { id: string; name?: string; description?: string; phase?: string; phone?: string; email?: string; status?: string }
type Task = { id: string; contractor?: string; status?: string }

function Contractors({ db }: { db: Firestore | null }) {
  const [contractors, setContractors] = useState<Contractor[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [phase, setPhase] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    if (!db) return
    const u1 = onSnapshot(collection(db, 'contractors'), s => {
      const list: Contractor[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setContractors(list)
    })
    const u2 = onSnapshot(collection(db, 'tasks'), s => {
      const list: Task[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setTasks(list)
    })
    return () => { u1(); u2() }
  }, [db])

  const grouped = useMemo(() => {
    const map: Record<string, Contractor[]> = {}
    contractors.forEach(c => {
      const key = c.phase || 'Unassigned'
      if (!map[key]) map[key] = []
      map[key].push(c)
    })
    return map
  }, [contractors])

  const progressOf = (name?: string) => {
    const assigned = tasks.filter(t => t.contractor === name)
    if (assigned.length === 0) return 0
    const approved = assigned.filter(t => t.status === 'pm_approved').length
    return Math.round((approved / assigned.length) * 100)
  }

  const handleAddContractor = async () => {
    if (!db || !name || !phase) return
    if (editingId) {
      await updateDoc(doc(db, 'contractors', editingId), {
        name,
        description,
        phase,
        phone,
        email
      })
      setEditingId(null)
    } else {
      await addDoc(collection(db, 'contractors'), {
        name,
        description,
        phase,
        phone,
        email,
        status: 'active'
      })
    }
    setName('')
    setDescription('')
    setPhase('')
    setPhone('')
    setEmail('')
    setShowForm(false)
  }

  const handleEdit = (contractor: Contractor) => {
    setName(contractor.name || '')
    setDescription(contractor.description || '')
    setPhase(contractor.phase || '')
    setPhone(contractor.phone || '')
    setEmail(contractor.email || '')
    setEditingId(contractor.id)
    setShowForm(true)
  }

  const handleDelete = async (contractorId: string) => {
    if (!db || !window.confirm('Are you sure you want to delete this contractor?')) return
    await deleteDoc(doc(db, 'contractors', contractorId))
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setName('')
    setDescription('')
    setPhase('')
    setPhone('')
    setEmail('')
  }

  return (
    <div className="grid gap-4 sm:gap-8">
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Add New Contractor</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Manage project contractors and teams</p>
          </div>
          <span className="text-3xl sm:text-4xl flex-shrink-0">👷</span>
        </div>
        {!showForm && (
          <button
            className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg hover:shadow-xl hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
            onClick={() => setShowForm(true)}
          >
            + Add New Contractor
          </button>
        )}
        {showForm && (
          <div className="space-y-4 sm:space-y-5 bg-slate-50 dark:bg-slate-700 rounded-lg sm:rounded-xl p-4 sm:p-6">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Name *</label>
              <input
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all text-sm sm:text-base"
                placeholder="Contractor name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
              <textarea
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all text-sm sm:text-base"
                placeholder="Brief description of contractor services"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Phase *</label>
                <input
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all text-sm sm:text-base"
                  placeholder="e.g., Phase 1"
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Phone</label>
                <input
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all text-sm sm:text-base"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email</label>
              <input
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all text-sm sm:text-base"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
              <button
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
                onClick={handleAddContractor}
              >
                {editingId ? 'Update Contractor' : 'Create Contractor'}
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

      <div className="space-y-3 sm:space-y-4">
        {Object.entries(grouped).map(([phase, list]) => (
          <div key={phase} className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 dark:from-slate-700 to-blue-50 dark:to-slate-700">
              <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                <span>🏗️</span> {phase}
              </h4>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {list.length === 0 ? (
                <div className="p-4 sm:p-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400">No contractors in this phase</div>
              ) : (
                list.map(c => (
                  <div key={c.id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex flex-col sm:flex-row items-start sm:items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base break-words">{c.name || c.id}</h5>
                      {c.description && <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">{c.description}</p>}
                      <div className="flex flex-col gap-1 mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                        {c.phone && <span>📱 {c.phone}</span>}
                        {c.email && <span>📧 {c.email}</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 sm:gap-3 flex-shrink-0">
                      <div className="text-right">
                        <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{progressOf(c.name)}%</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed</div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(c)}
                          className="px-2 sm:px-3 py-1 sm:py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg font-medium transition-colors text-xs sm:text-sm"
                          title="Edit contractor"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="px-2 sm:px-3 py-1 sm:py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg font-medium transition-colors text-xs sm:text-sm"
                          title="Delete contractor"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                    <div className="space-y-2">
                      <div className="flex h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-green-500 to-green-600 transition-all"
                          style={{ width: `${progressOf(c.name)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Progress</span>
                        <span>{progressOf(c.name)}%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Contractors
