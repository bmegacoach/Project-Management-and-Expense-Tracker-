import React, { useEffect, useMemo, useState } from 'react'
import { Firestore, collection, doc, onSnapshot, updateDoc, addDoc, deleteDoc, writeBatch } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type SubTask = { id: string; name?: string; status?: 'pending' | 'site_completed' | 'pm_approved' }
type Task = { 
  id: string
  name?: string
  phase?: string
  contractor?: string
  status?: string
  subtasks?: SubTask[]
  approvedValue?: number
  isNonDependency?: boolean
  lineItem?: string
}

type PhaseData = {
  name: string
  dependentTasks: Task[]
  nonDependentTasks: Task[]
}

function Tasks({ db, role }: { db: Firestore | null; role: Role }) {
  const [phases, setPhases] = useState<Record<string, PhaseData>>({})
  const [showForm, setShowForm] = useState(false)
  const [editingTask, setEditingTask] = useState<{ phaseId: string; taskId: string; isDependency: boolean } | null>(null)
  const [formData, setFormData] = useState({ name: '', contractor: '', lineItem: '', isDependency: false })
  const [selectedPhase, setSelectedPhase] = useState('')

  const PHASE_IDS = [
    'phase-1-pre-construction-demolition',
    'phase-2-structural-envelope',
    'phase-3-mep-rough-in',
    'phase-4-interior-finishes-exterior-cladding',
    'phase-5-fixtures-appliances-final-touches'
  ]

  useEffect(() => {
    if (!db) return

    const loadPhases = async () => {
      const phasesData: Record<string, PhaseData> = {}

      // Initialize all phases
      for (const phaseId of PHASE_IDS) {
        phasesData[phaseId] = {
          name: phaseId,
          dependentTasks: [],
          nonDependentTasks: []
        }
      }

      for (const phaseId of PHASE_IDS) {
        const phaseRef = doc(db, 'phases', phaseId)

        // Listen to dependent tasks
        const unsubDependent = onSnapshot(collection(phaseRef, 'dependentTasks'), async (snapshot) => {
          const tasks: Task[] = []
          for (const taskDoc of snapshot.docs) {
            const taskData = taskDoc.data()
            const subtasksSnap = await new Promise<any[]>(resolve => {
              const unsub = onSnapshot(collection(taskDoc.ref, 'subtasks'), snap => {
                const subs: any[] = []
                snap.forEach(s => subs.push({ id: s.id, ...s.data() }))
                resolve(subs)
              })
            })

            tasks.push({ id: taskDoc.id, ...taskData, subtasks: subtasksSnap })
          }

          phasesData[phaseId] = {
            ...phasesData[phaseId],
            dependentTasks: tasks
          }
          setPhases({ ...phasesData })
        })

        // Listen to non-dependent tasks
        const unsubNonDependent = onSnapshot(collection(phaseRef, 'nonDependentTasks'), async (snapshot) => {
          const tasks: Task[] = []
          for (const taskDoc of snapshot.docs) {
            const taskData = taskDoc.data()
            const subtasksSnap = await new Promise<any[]>(resolve => {
              const unsub = onSnapshot(collection(taskDoc.ref, 'subtasks'), snap => {
                const subs: any[] = []
                snap.forEach(s => subs.push({ id: s.id, ...s.data() }))
                resolve(subs)
              })
            })

            tasks.push({ id: taskDoc.id, ...taskData, subtasks: subtasksSnap })
          }

          phasesData[phaseId] = {
            ...phasesData[phaseId],
            nonDependentTasks: tasks
          }
          setPhases({ ...phasesData })
        })

        // Load phase metadata
        const unsubPhase = onSnapshot(phaseRef, (phaseSnap) => {
          if (phaseSnap.exists()) {
            const { name } = phaseSnap.data()
            phasesData[phaseId] = {
              ...phasesData[phaseId],
              name: name || phaseId
            }
            setPhases({ ...phasesData })
          }
        })
      }

      setPhases(phasesData)
    }

    loadPhases()
  }, [db])

  const handleAddTask = async () => {
    if (!db || !formData.name || !selectedPhase) return

    const phaseRef = doc(db, 'phases', selectedPhase)
    const collectionName = formData.isDependency ? 'dependentTasks' : 'nonDependentTasks'

    if (editingTask && editingTask.phaseId === selectedPhase) {
      // Update existing task
      const taskRef = doc(phaseRef, collectionName, editingTask.taskId)
      await updateDoc(taskRef, {
        name: formData.name,
        contractor: formData.contractor,
        lineItem: formData.lineItem,
        updatedAt: new Date().toISOString()
      })
    } else {
      // Create new task
      const sanitizedId = formData.name.toLowerCase().replace(/\s+/g, '-').substring(0, 50)
      const taskRef = doc(phaseRef, collectionName, sanitizedId)
      await updateDoc(taskRef, {
        name: formData.name,
        contractor: formData.contractor,
        lineItem: formData.lineItem,
        isNonDependency: formData.isDependency,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).catch(() => {
        addDoc(collection(phaseRef, collectionName), {
          name: formData.name,
          contractor: formData.contractor,
          lineItem: formData.lineItem,
          isNonDependency: formData.isDependency,
          status: 'pending',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      })
    }

    resetForm()
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingTask(null)
    setFormData({ name: '', contractor: '', lineItem: '', isDependency: false })
    setSelectedPhase('')
  }

  const handleEdit = (phaseId: string, taskId: string, task: Task, isDependency: boolean) => {
    setEditingTask({ phaseId, taskId, isDependency })
    setFormData({
      name: task.name || '',
      contractor: task.contractor || '',
      lineItem: task.lineItem || '',
      isDependency
    })
    setSelectedPhase(phaseId)
    setShowForm(true)
  }

  const handleDelete = async (phaseId: string, taskId: string, isDependency: boolean) => {
    if (!db || !window.confirm('Delete this task?')) return
    const phaseRef = doc(db, 'phases', phaseId)
    const collectionName = isDependency ? 'dependentTasks' : 'nonDependentTasks'
    await deleteDoc(doc(phaseRef, collectionName, taskId))
  }

  const handleDeleteSubtask = async (phaseId: string, taskId: string, subtaskId: string, isDependency: boolean) => {
    if (!db) return
    const phaseRef = doc(db, 'phases', phaseId)
    const collectionName = isDependency ? 'dependentTasks' : 'nonDependentTasks'
    await deleteDoc(doc(phaseRef, collectionName, taskId, 'subtasks', subtaskId))
  }

  const handleUpdateSubtask = async (phaseId: string, taskId: string, subtaskId: string, status: string, isDependency: boolean) => {
    if (!db) return
    const phaseRef = doc(db, 'phases', phaseId)
    const collectionName = isDependency ? 'dependentTasks' : 'nonDependentTasks'
    await updateDoc(doc(phaseRef, collectionName, taskId, 'subtasks', subtaskId), {
      status,
      updatedAt: new Date().toISOString()
    })
  }

  const grouped = useMemo(() => {
    const map: Record<string, PhaseData> = {}
    Object.entries(phases).forEach(([phaseId, phaseData]) => {
      map[phaseId] = phaseData
    })
    return map
  }, [phases])

  return (
    <div className="grid gap-4 sm:gap-8">
      {/* Add Task Form */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Task Management</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Create, edit, and manage project tasks with hierarchy</p>
          </div>
          <span className="text-3xl sm:text-4xl flex-shrink-0">✨</span>
        </div>

        {!showForm && (
          <button
            className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg hover:shadow-xl hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
            onClick={() => setShowForm(true)}
          >
            + Add New Task
          </button>
        )}

        {showForm && (
          <div className="space-y-4 sm:space-y-5 bg-slate-50 dark:bg-slate-700 rounded-lg sm:rounded-xl p-4 sm:p-6">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Phase *</label>
              <select
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value)}
              >
                <option value="">Select a phase</option>
                {Object.entries(phases).map(([id, data]) => (
                  <option key={id} value={id}>{data.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Task Name *</label>
              <input
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                placeholder="Enter task name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Contractor</label>
                <input
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  placeholder="Contractor name"
                  value={formData.contractor}
                  onChange={(e) => setFormData({ ...formData, contractor: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Line Item</label>
                <input
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                  placeholder="Line item"
                  value={formData.lineItem}
                  onChange={(e) => setFormData({ ...formData, lineItem: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDependency}
                  onChange={(e) => setFormData({ ...formData, isDependency: e.target.checked })}
                  className="w-4 h-4 rounded"
                />
                <span className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-300">
                  ⚡ Non-Dependent Task
                </span>
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
              <button
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:shadow-lg transition-all active:scale-95"
                onClick={handleAddTask}
              >
                {editingTask ? 'Update Task' : 'Create Task'}
              </button>
              <button
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:bg-slate-100 dark:hover:bg-slate-600 transition-all"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Phase View */}
      <div className="space-y-3 sm:space-y-4">
        {Object.entries(grouped).map(([phaseId, phaseData]) => {
          if (!phaseData) return null
          
          const dependentTasks = phaseData.dependentTasks || []
          const nonDependentTasks = phaseData.nonDependentTasks || []
          
          return (
          <div key={phaseId} className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            {/* Phase Header */}
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 dark:from-slate-700 to-blue-50 dark:to-slate-700">
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base">
                📋 {phaseData.name}
              </h4>
            </div>

            {/* Dependent Tasks */}
            {dependentTasks.length > 0 && (
              <div className="border-b border-slate-200 dark:border-slate-700">
                <div className="px-4 sm:px-6 py-2 sm:py-3 bg-slate-100 dark:bg-slate-700">
                  <h5 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">📌 Dependent Tasks</h5>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {dependentTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      phaseId={phaseId}
                      task={task}
                      isDependency={false}
                      onEdit={() => handleEdit(phaseId, task.id, task, false)}
                      onDelete={() => handleDelete(phaseId, task.id, false)}
                      onDeleteSubtask={(subtaskId) => handleDeleteSubtask(phaseId, task.id, subtaskId, false)}
                      onUpdateSubtask={(subtaskId, status) => handleUpdateSubtask(phaseId, task.id, subtaskId, status, false)}
                      role={role}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Non-Dependent Tasks */}
            {nonDependentTasks.length > 0 && (
              <div>
                <div className="px-4 sm:px-6 py-2 sm:py-3 bg-purple-100 dark:bg-purple-900">
                  <h5 className="text-xs sm:text-sm font-semibold text-purple-700 dark:text-purple-300">⚡ Non-Dependent Tasks</h5>
                </div>
                <div className="divide-y divide-slate-200 dark:divide-slate-700">
                  {nonDependentTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      phaseId={phaseId}
                      task={task}
                      isDependency={true}
                      onEdit={() => handleEdit(phaseId, task.id, task, true)}
                      onDelete={() => handleDelete(phaseId, task.id, true)}
                      onDeleteSubtask={(subtaskId) => handleDeleteSubtask(phaseId, task.id, subtaskId, true)}
                      onUpdateSubtask={(subtaskId, status) => handleUpdateSubtask(phaseId, task.id, subtaskId, status, true)}
                      role={role}
                    />
                  ))}
                </div>
              </div>
            )}

            {dependentTasks.length === 0 && nonDependentTasks.length === 0 && (
              <div className="px-4 sm:px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                <p className="text-sm">No tasks in this phase yet</p>
              </div>
            )}
          </div>
          );
        })}
      </div>
    </div>
  )
}

// Task Card Component
function TaskCard({
  phaseId,
  task,
  isDependency,
  onEdit,
  onDelete,
  onDeleteSubtask,
  onUpdateSubtask,
  role
}: {
  phaseId: string
  task: Task
  isDependency: boolean
  onEdit: () => void
  onDelete: () => void
  onDeleteSubtask: (subtaskId: string) => void
  onUpdateSubtask: (subtaskId: string, status: string) => void
  role: Role
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <h5 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base break-words">{task.name}</h5>
          <div className="flex gap-2 flex-wrap mt-2">
            {isDependency && (
              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300">
                ⚡ Non-Dependency
              </span>
            )}
            {task.lineItem && (
              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                📌 {task.lineItem}
              </span>
            )}
            {task.contractor && (
              <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">
                👤 {task.contractor}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 w-full sm:w-auto flex-shrink-0">
          <button
            onClick={onEdit}
            className="flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg font-medium transition-colors text-xs sm:text-sm"
          >
            ✏️ Edit
          </button>
          <button
            onClick={onDelete}
            className="flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg font-medium transition-colors text-xs sm:text-sm"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Subtasks */}
      {(task.subtasks || []).length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs sm:text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            {expanded ? '▼' : '▶'} View Details ({task.subtasks.length} subtasks)
          </button>

          {expanded && (
            <div className="mt-3 space-y-2 bg-slate-50 dark:bg-slate-700 rounded-lg p-3 sm:p-4">
              {(task.subtasks || []).map(sub => (
                <div key={sub.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-3 bg-white dark:bg-slate-800 p-2 sm:p-3 rounded text-xs sm:text-sm">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white break-words">{sub.name}</p>
                    <span className="inline-block text-xs px-2 py-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-300 rounded mt-1">
                      {sub.status || 'pending'}
                    </span>
                  </div>
                  <div className="flex gap-1 sm:gap-2 flex-shrink-0">
                    {(sub.status || 'pending') === 'pending' && (
                      <button
                        onClick={() => onUpdateSubtask(sub.id, 'site_completed')}
                        className="px-2 py-1 border border-yellow-300 text-yellow-700 dark:text-yellow-300 rounded text-xs font-medium hover:bg-yellow-50 dark:hover:bg-yellow-900"
                      >
                        Complete
                      </button>
                    )}
                    {(sub.status || 'pending') === 'site_completed' && (
                      <button
                        onClick={() => onUpdateSubtask(sub.id, 'pm_approved')}
                        className="px-2 py-1 border border-green-300 text-green-700 dark:text-green-300 rounded text-xs font-medium hover:bg-green-50 dark:hover:bg-green-900"
                      >
                        Approve
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteSubtask(sub.id)}
                      className="px-2 py-1 border border-red-300 text-red-600 dark:text-red-400 rounded text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Tasks
