import React, { useEffect, useMemo, useState } from 'react'
import { Firestore, collection, doc, onSnapshot, updateDoc, addDoc, deleteDoc } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type SubTask = { id: string; title?: string; status?: 'pending' | 'site_completed' | 'pm_approved' }
type Task = { id: string; title?: string; phase?: string; contractor?: string; status?: string; subtasks?: SubTask[] }

function Tasks({ db, role }: { db: Firestore | null; role: Role }) {
  const [tasks, setTasks] = useState<Task[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [phase, setPhase] = useState('')
  const [contractor, setContractor] = useState('')
  const [status, setStatus] = useState('pending')

  useEffect(() => {
    if (!db) return
    const unsub = onSnapshot(collection(db, 'tasks'), s => {
      const list: Task[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setTasks(list)
    })
    return () => unsub()
  }, [db])

  const grouped = useMemo(() => {
    const map: Record<string, Task[]> = {}
    tasks.forEach(t => {
      const key = t.phase || 'Unassigned'
      if (!map[key]) map[key] = []
      map[key].push(t)
    })
    return map
  }, [tasks])

  const canUpdate = (from: SubTask['status'], to: SubTask['status']) => {
    if (role === 'site_manager') return from === 'pending' && to === 'site_completed'
    if (role === 'project_manager') return (from === 'pending' && to === 'site_completed') || (from === 'site_completed' && to === 'pm_approved')
    return false
  }

  const setSubStatus = async (taskId: string, subId: string, to: SubTask['status']) => {
    const t = tasks.find(x => x.id === taskId)
    if (!t) return
    const updated = (t.subtasks || []).map(s => s.id === subId ? { ...s, status: to } : s)
    if (!db) return
    await updateDoc(doc(db, 'tasks', taskId), { subtasks: updated })
  }

  const setTaskStatus = async (taskId: string, to: SubTask['status']) => {
    if (role === 'portfolio_manager') return
    if (!db) return
    await updateDoc(doc(db, 'tasks', taskId), { status: to })
  }

  const handleAddTask = async () => {
    if (!db || !title || !phase) return
    if (editingId) {
      await updateDoc(doc(db, 'tasks', editingId), { title, phase, contractor, status })
      setEditingId(null)
    } else {
      await addDoc(collection(db, 'tasks'), {
        title,
        phase,
        contractor,
        status,
        subtasks: []
      })
    }
    setTitle('')
    setPhase('')
    setContractor('')
    setStatus('pending')
    setShowForm(false)
  }

  const handleEdit = (task: Task) => {
    setTitle(task.title || '')
    setPhase(task.phase || '')
    setContractor(task.contractor || '')
    setStatus(task.status || 'pending')
    setEditingId(task.id)
    setShowForm(true)
  }

  const handleDelete = async (taskId: string) => {
    if (!db || !window.confirm('Are you sure you want to delete this task?')) return
    await deleteDoc(doc(db, 'tasks', taskId))
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setTitle('')
    setPhase('')
    setContractor('')
    setStatus('pending')
  }

  return (
    <div className="grid gap-8">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Add New Task</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Create and manage project tasks</p>
          </div>
          <span className="text-4xl">✨</span>
        </div>
        {!showForm && (
          <button
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95 text-lg"
            onClick={() => setShowForm(true)}
          >
            + Add New Task
          </button>
        )}
        {showForm && (
          <div className="space-y-5 bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Task Title *</label>
              <input
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all"
                placeholder="Enter task title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Phase *</label>
                <input
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all"
                  placeholder="e.g., Phase 1"
                  value={phase}
                  onChange={(e) => setPhase(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Contractor</label>
                <input
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all"
                  placeholder="Contractor name"
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Status</label>
              <select
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 font-medium transition-all"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="pending">⏳ Pending</option>
                <option value="site_completed">🔨 Site Completed</option>
                <option value="pm_approved">✓ PM Approved</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
                onClick={handleAddTask}
              >
                {editingId ? 'Update Task' : 'Create Task'}
              </button>
              <button
                className="flex-1 px-6 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                onClick={handleCancel}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {Object.entries(grouped).map(([phase, list]) => (
          <div key={phase} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 dark:from-slate-700 to-blue-50 dark:to-slate-700">
              <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                <span>📋</span> {phase}
              </h4>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-700">
              {list.map(t => (
                <div key={t.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <h5 className="font-semibold text-slate-900 dark:text-white">{t.title || t.id}</h5>
                      <div className="flex gap-2 flex-wrap mt-2">
                        {t.contractor && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                            👤 {t.contractor}
                          </span>
                        )}
                        {t.status && (
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                            t.status === 'pm_approved' ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300' :
                            t.status === 'site_completed' ? 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                          }`}>
                            {t.status === 'pm_approved' ? '✓ PM Approved' :
                             t.status === 'site_completed' ? '🔨 Site Completed' :
                             '⏳ Pending'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(t)}
                        className="px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg font-medium transition-colors"
                        title="Edit task"
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(t.id)}
                        className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg font-medium transition-colors"
                        title="Delete task"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {(t.subtasks || []).length === 0 && (
                      <div className="flex gap-2">
                        {role !== 'portfolio_manager' && (
                          <>
                            <button
                              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-100 transition-all"
                              onClick={() => setTaskStatus(t.id, 'site_completed')}
                            >
                              Mark Site Completed
                            </button>
                            {role === 'project_manager' && (
                              <button
                                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-100 transition-all"
                                onClick={() => setTaskStatus(t.id, 'pm_approved')}
                              >
                                Approve
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {(t.subtasks || []).length > 0 && (
                      <div className="space-y-2 bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                        {(t.subtasks || []).map(s => (
                          <div key={s.id} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-800 p-3 rounded">
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">{s.title || s.id}</p>
                              <span className="inline-block text-xs px-2 py-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded mt-1">
                                {s.status || 'pending'}
                              </span>
                            </div>
                            <div className="flex gap-2">
                              {canUpdate(s.status || 'pending', 'site_completed') && (
                                <button
                                  className="px-3 py-1 border border-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-100 transition-all"
                                  onClick={() => setSubStatus(t.id, s.id, 'site_completed')}
                                >
                                  Complete
                                </button>
                              )}
                              {canUpdate(s.status || 'pending', 'pm_approved') && (
                                <button
                                  className="px-3 py-1 border border-slate-300 text-slate-700 rounded text-xs font-medium hover:bg-slate-100 transition-all"
                                  onClick={() => setSubStatus(t.id, s.id, 'pm_approved')}
                                >
                                  Approve
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Tasks
