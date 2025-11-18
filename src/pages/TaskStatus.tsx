import React, { useState, useEffect } from 'react'
import { Firestore, collection, doc, onSnapshot, updateDoc, addDoc, deleteDoc, Timestamp } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type TaskStatus = 'pending' | 'in-progress' | 'site-completed' | 'pm-approved' | 'blocked' | 'on-hold'

type StatusUpdate = {
  id?: string
  taskId: string
  phaseId: string
  oldStatus: TaskStatus
  newStatus: TaskStatus
  updatedBy: string
  updatedAt: string
  completionPercentage?: number
  notes?: string
  blockedReason?: string
}

type TaskWithStatus = {
  id: string
  phaseId: string
  name?: string
  contractor?: string
  lineItem?: string
  currentStatus: TaskStatus
  completionPercentage: number
  estimatedCompletionDate?: string
  actualCompletionDate?: string
  statusHistory: StatusUpdate[]
  lastUpdatedAt: string
  lastUpdatedBy: string
  isBlocked?: boolean
  blockedReason?: string
}

function TaskStatus({ db, role }: { db: Firestore | null; role: Role }) {
  const [tasks, setTasks] = useState<TaskWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskWithStatus | null>(null)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [updateForm, setUpdateForm] = useState({
    newStatus: 'in-progress' as TaskStatus,
    completionPercentage: 0,
    notes: '',
    blockedReason: ''
  })
  const [filterStatus, setFilterStatus] = useState<TaskStatus | 'all'>('all')
  const [filterPhase, setFilterPhase] = useState<string>('all')

  const PHASE_IDS = [
    'phase-1-pre-construction-demolition',
    'phase-2-structural-envelope',
    'phase-3-mep-rough-in',
    'phase-4-interior-finishes-exterior-cladding',
    'phase-5-fixtures-appliances-final-touches'
  ]

  const STATUS_LABELS: Record<TaskStatus, { label: string; color: string; icon: string }> = {
    pending: { label: 'Pending', color: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300', icon: '⏳' },
    'in-progress': { label: 'In Progress', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: '🔄' },
    'site-completed': { label: 'Site Completed', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', icon: '✓' },
    'pm-approved': { label: 'PM Approved', color: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: '✅' },
    blocked: { label: 'Blocked', color: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: '🚫' },
    'on-hold': { label: 'On Hold', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300', icon: '⏸️' }
  }

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }

    const loadTasks = async () => {
      setLoading(true)
      const allTasks: TaskWithStatus[] = []

      try {
        for (const phaseId of PHASE_IDS) {
          const phaseRef = doc(db, 'phases', phaseId)

          // Load dependent tasks
          const depsUnsubscribe = onSnapshot(collection(phaseRef, 'dependentTasks'), async (snapshot) => {
            for (const taskDoc of snapshot.docs) {
              const taskData = taskDoc.data()
              const task: TaskWithStatus = {
                id: taskDoc.id,
                phaseId,
                name: taskData.name,
                contractor: taskData.contractor,
                lineItem: taskData.lineItem,
                currentStatus: (taskData.status || 'pending') as TaskStatus,
                completionPercentage: taskData.completionPercentage || 0,
                estimatedCompletionDate: taskData.estimatedCompletionDate,
                actualCompletionDate: taskData.actualCompletionDate,
                statusHistory: taskData.statusHistory || [],
                lastUpdatedAt: taskData.updatedAt || taskData.createdAt || new Date().toISOString(),
                lastUpdatedBy: taskData.lastUpdatedBy || role,
                isBlocked: taskData.isBlocked || false,
                blockedReason: taskData.blockedReason
              }
              const index = allTasks.findIndex(t => t.id === task.id && t.phaseId === task.phaseId)
              if (index >= 0) {
                allTasks[index] = task
              } else {
                allTasks.push(task)
              }
            }
            setTasks([...allTasks])
          })

          // Load non-dependent tasks
          const nonDepsUnsubscribe = onSnapshot(collection(phaseRef, 'nonDependentTasks'), async (snapshot) => {
            for (const taskDoc of snapshot.docs) {
              const taskData = taskDoc.data()
              const task: TaskWithStatus = {
                id: taskDoc.id,
                phaseId,
                name: taskData.name,
                contractor: taskData.contractor,
                lineItem: taskData.lineItem,
                currentStatus: (taskData.status || 'pending') as TaskStatus,
                completionPercentage: taskData.completionPercentage || 0,
                estimatedCompletionDate: taskData.estimatedCompletionDate,
                actualCompletionDate: taskData.actualCompletionDate,
                statusHistory: taskData.statusHistory || [],
                lastUpdatedAt: taskData.updatedAt || taskData.createdAt || new Date().toISOString(),
                lastUpdatedBy: taskData.lastUpdatedBy || role,
                isBlocked: taskData.isBlocked || false,
                blockedReason: taskData.blockedReason
              }
              const index = allTasks.findIndex(t => t.id === task.id && t.phaseId === task.phaseId)
              if (index >= 0) {
                allTasks[index] = task
              } else {
                allTasks.push(task)
              }
            }
            setTasks([...allTasks])
          })
        }
      } catch (error) {
        console.error('Error loading tasks:', error)
        setMessage({ type: 'error', text: 'Failed to load tasks' })
      } finally {
        setLoading(false)
      }
    }

    loadTasks()
  }, [db])

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !selectedTask) return

    try {
      const taskRef = doc(db, 'phases', selectedTask.phaseId, 'dependentTasks', selectedTask.id)

      // Try dependent tasks first
      try {
        const newStatusUpdate: StatusUpdate = {
          taskId: selectedTask.id,
          phaseId: selectedTask.phaseId,
          oldStatus: selectedTask.currentStatus,
          newStatus: updateForm.newStatus,
          updatedBy: role,
          updatedAt: new Date().toISOString(),
          completionPercentage: updateForm.completionPercentage,
          notes: updateForm.notes,
          blockedReason: updateForm.newStatus === 'blocked' ? updateForm.blockedReason : undefined
        }

        const updatedHistory = [...(selectedTask.statusHistory || []), newStatusUpdate]

        await updateDoc(taskRef, {
          status: updateForm.newStatus,
          completionPercentage: updateForm.completionPercentage,
          statusHistory: updatedHistory,
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedBy: role,
          isBlocked: updateForm.newStatus === 'blocked',
          blockedReason: updateForm.newStatus === 'blocked' ? updateForm.blockedReason : null,
          actualCompletionDate: updateForm.newStatus === 'pm-approved' ? new Date().toISOString() : null
        })

        setMessage({ type: 'success', text: 'Task status updated successfully!' })
      } catch (error) {
        // Try non-dependent tasks
        const nonDepTaskRef = doc(db, 'phases', selectedTask.phaseId, 'nonDependentTasks', selectedTask.id)
        
        const newStatusUpdate: StatusUpdate = {
          taskId: selectedTask.id,
          phaseId: selectedTask.phaseId,
          oldStatus: selectedTask.currentStatus,
          newStatus: updateForm.newStatus,
          updatedBy: role,
          updatedAt: new Date().toISOString(),
          completionPercentage: updateForm.completionPercentage,
          notes: updateForm.notes,
          blockedReason: updateForm.newStatus === 'blocked' ? updateForm.blockedReason : undefined
        }

        const updatedHistory = [...(selectedTask.statusHistory || []), newStatusUpdate]

        await updateDoc(nonDepTaskRef, {
          status: updateForm.newStatus,
          completionPercentage: updateForm.completionPercentage,
          statusHistory: updatedHistory,
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedBy: role,
          isBlocked: updateForm.newStatus === 'blocked',
          blockedReason: updateForm.newStatus === 'blocked' ? updateForm.blockedReason : null,
          actualCompletionDate: updateForm.newStatus === 'pm-approved' ? new Date().toISOString() : null
        })

        setMessage({ type: 'success', text: 'Task status updated successfully!' })
      }

      setShowUpdateModal(false)
      resetUpdateForm()
      setSelectedTask(null)
    } catch (error) {
      console.error('Error updating task status:', error)
      setMessage({ type: 'error', text: 'Failed to update task status' })
    }
  }

  const resetUpdateForm = () => {
    setUpdateForm({
      newStatus: 'in-progress',
      completionPercentage: 0,
      notes: '',
      blockedReason: ''
    })
  }

  const openUpdateModal = (task: TaskWithStatus) => {
    setSelectedTask(task)
    setUpdateForm({
      newStatus: task.currentStatus === 'pm-approved' ? task.currentStatus : 'in-progress',
      completionPercentage: task.completionPercentage || 0,
      notes: '',
      blockedReason: task.blockedReason || ''
    })
    setShowUpdateModal(true)
  }

  const closeUpdateModal = () => {
    setShowUpdateModal(false)
    setSelectedTask(null)
    resetUpdateForm()
  }

  const filteredTasks = tasks.filter(task => {
    const statusMatch = filterStatus === 'all' || task.currentStatus === filterStatus
    const phaseMatch = filterPhase === 'all' || task.phaseId === filterPhase
    return statusMatch && phaseMatch
  })

  const statusStats = {
    pending: tasks.filter(t => t.currentStatus === 'pending').length,
    'in-progress': tasks.filter(t => t.currentStatus === 'in-progress').length,
    'site-completed': tasks.filter(t => t.currentStatus === 'site-completed').length,
    'pm-approved': tasks.filter(t => t.currentStatus === 'pm-approved').length,
    blocked: tasks.filter(t => t.currentStatus === 'blocked').length,
    'on-hold': tasks.filter(t => t.currentStatus === 'on-hold').length
  }

  const avgCompletion = tasks.length > 0 ? Math.round(tasks.reduce((sum, t) => sum + t.completionPercentage, 0) / tasks.length) : 0

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">📊 Task Status Updates</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Track task progress and update status in real-time</p>
          </div>
          <span className="text-4xl">📈</span>
        </div>

        {/* Message Display */}
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

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {Object.entries(statusStats).map(([status, count]) => (
            <div key={status} className="bg-slate-50 dark:bg-slate-700 rounded-lg p-3 text-center">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{count}</p>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">{STATUS_LABELS[status as TaskStatus].label}</p>
            </div>
          ))}
        </div>

        {/* Progress Overview */}
        <div className="mt-6 bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Overall Progress</span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{avgCompletion}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
              style={{ width: `${avgCompletion}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as TaskStatus | 'all')}
              className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_LABELS).map(([status, data]) => (
                <option key={status} value={status}>{data.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Filter by Phase</label>
            <select
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
              className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Phases</option>
              {PHASE_IDS.map(phaseId => (
                <option key={phaseId} value={phaseId}>{phaseId}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700">
            <div className="inline-block animate-spin h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700">
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">📭 No tasks found</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Try adjusting your filters</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div key={`${task.phaseId}-${task.id}`} className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              {/* Task Header */}
              <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-700">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white break-words">{task.name || 'Unnamed Task'}</h3>
                    <div className="flex gap-2 flex-wrap mt-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${STATUS_LABELS[task.currentStatus].color}`}>
                        {STATUS_LABELS[task.currentStatus].icon} {STATUS_LABELS[task.currentStatus].label}
                      </span>
                      {task.contractor && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300">
                          👤 {task.contractor}
                        </span>
                      )}
                      {task.isBlocked && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                          🚫 Blocked
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => openUpdateModal(task)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm transition-all whitespace-nowrap"
                  >
                    📝 Update Status
                  </button>
                </div>

                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">Completion</span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{task.completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${task.completionPercentage}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Task Details */}
              <div className="px-4 sm:px-6 py-4 bg-slate-50 dark:bg-slate-700 space-y-3 text-sm">
                {task.blockedReason && (
                  <div className="flex gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Blocked Reason:</span>
                    <span className="text-slate-600 dark:text-slate-400">{task.blockedReason}</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">Last Updated:</span>
                  <span className="text-slate-600 dark:text-slate-400">{new Date(task.lastUpdatedAt).toLocaleString()} by {task.lastUpdatedBy}</span>
                </div>
                {task.estimatedCompletionDate && (
                  <div className="flex gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Est. Completion:</span>
                    <span className="text-slate-600 dark:text-slate-400">{new Date(task.estimatedCompletionDate).toLocaleDateString()}</span>
                  </div>
                )}
                {task.actualCompletionDate && (
                  <div className="flex gap-2">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Completed:</span>
                    <span className="text-green-600 dark:text-green-400 font-semibold">{new Date(task.actualCompletionDate).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Status History */}
              {task.statusHistory && task.statusHistory.length > 0 && (
                <div className="px-4 sm:px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                  <h4 className="font-bold text-slate-900 dark:text-white mb-3 text-sm">📝 Recent Updates</h4>
                  <div className="space-y-2">
                    {[...task.statusHistory].slice(-3).reverse().map((update, idx) => (
                      <div key={idx} className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-600 p-2 rounded">
                        <span className="font-semibold">{update.updatedBy}</span> changed status from <span className="font-semibold">{update.oldStatus}</span> to <span className="font-semibold">{update.newStatus}</span> on {new Date(update.updatedAt).toLocaleString()}
                        {update.notes && <div className="mt-1">📌 {update.notes}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Update Status Modal */}
      {showUpdateModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">Update Task Status</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{selectedTask.name}</p>
            </div>

            <form onSubmit={handleUpdateStatus} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">New Status *</label>
                <select
                  value={updateForm.newStatus}
                  onChange={(e) => setUpdateForm({ ...updateForm, newStatus: e.target.value as TaskStatus })}
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {Object.entries(STATUS_LABELS).map(([status, data]) => (
                    <option key={status} value={status}>{data.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Completion % *</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={updateForm.completionPercentage}
                  onChange={(e) => setUpdateForm({ ...updateForm, completionPercentage: parseInt(e.target.value) })}
                  className="w-full"
                />
                <p className="text-center text-sm font-bold text-slate-900 dark:text-white mt-2">{updateForm.completionPercentage}%</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Notes</label>
                <textarea
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm({ ...updateForm, notes: e.target.value })}
                  placeholder="Add any notes about this status update..."
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white text-sm h-20"
                />
              </div>

              {updateForm.newStatus === 'blocked' && (
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Reason for Blocking *</label>
                  <input
                    type="text"
                    value={updateForm.blockedReason}
                    onChange={(e) => setUpdateForm({ ...updateForm, blockedReason: e.target.value })}
                    placeholder="Why is this task blocked?"
                    className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white text-sm"
                    required
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all"
                >
                  Update Status
                </button>
                <button
                  type="button"
                  onClick={closeUpdateModal}
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

export default TaskStatus
