import React, { useEffect, useState } from 'react'
import { Firestore, collection, doc, onSnapshot, updateDoc, Timestamp } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type Team = {
  id: string
  name: string
  description?: string
  phone?: string
  email?: string
  hourlyRate?: number
  teamLeader?: string
  capacity?: number
  currentLoad?: number
  availability?: 'available' | 'busy' | 'unavailable'
}

type TeamPerformance = {
  id?: string
  teamId: string
  teamName: string
  phaseId: string
  tasksCompleted: number
  tasksInProgress: number
  tasksPending: number
  qualityRating: number // 1-5
  punctualityRating: number // 1-5
  productivityRating: number // 1-5
  overallPerformanceScore: number // 1-5 (calculated)
  totalHoursWorked: number
  costUtilization: number // percentage
  clientFeedback?: string
  lastReviewDate?: string
  createdAt?: string
  updatedAt?: string
}

type PerformanceMetric = {
  label: string
  value: number
  target: number
  status: 'excellent' | 'good' | 'fair' | 'poor'
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

function TeamPerformance({ db, role }: { db: Firestore | null; role: Role }) {
  const [teamsByPhase, setTeamsByPhase] = useState<Record<string, Team[]>>({})
  const [performance, setPerformance] = useState<TeamPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [filterPhase, setFilterPhase] = useState<string>('All')
  const [sortBy, setSortBy] = useState<'overall' | 'quality' | 'productivity' | 'punctuality'>('overall')
  const [editingPerformance, setEditingPerformance] = useState<TeamPerformance | null>(null)
  const [showEditForm, setShowEditForm] = useState(false)
  const [formData, setFormData] = useState<Partial<TeamPerformance>>({})

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }

    const unsubscribers: (() => void)[] = []
    const newTeamsByPhase: Record<string, Team[]> = {}

    PHASE_IDS.forEach(phaseId => {
      const unsubscribe = onSnapshot(collection(db, 'phases', phaseId, 'teams'), snapshot => {
        const teams: Team[] = []
        snapshot.forEach(docSnap => {
          teams.push({ id: docSnap.id, ...docSnap.data() } as Team)
        })
        newTeamsByPhase[phaseId] = teams
        setTeamsByPhase(prev => ({ ...prev, [phaseId]: teams }))
      })
      unsubscribers.push(unsubscribe)

      // Load performance data
      const perfUnsubscribe = onSnapshot(
        collection(db, 'phases', phaseId, 'teamPerformance'),
        snapshot => {
          const perfData: TeamPerformance[] = []
          snapshot.forEach(docSnap => {
            perfData.push({ id: docSnap.id, ...docSnap.data() } as TeamPerformance)
          })
          setPerformance(prev => [...prev.filter(p => p.phaseId !== phaseId), ...perfData])
        }
      )
      unsubscribers.push(perfUnsubscribe)
    })

    setLoading(false)
    return () => unsubscribers.forEach(unsub => unsub())
  }, [db])

  const calculateOverallScore = (quality: number, productivity: number, punctuality: number): number => {
    return Math.round((quality + productivity + punctuality) / 3 * 10) / 10
  }

  const handleSavePerformance = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !editingPerformance || !formData.qualityRating) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    try {
      const overallScore = calculateOverallScore(
        formData.qualityRating || 3,
        formData.productivityRating || 3,
        formData.punctualityRating || 3
      )

      const perfRef = doc(
        db,
        'phases',
        editingPerformance.phaseId,
        'teamPerformance',
        editingPerformance.id || editingPerformance.teamId
      )

      await updateDoc(perfRef, {
        qualityRating: formData.qualityRating,
        productivityRating: formData.productivityRating,
        punctualityRating: formData.punctualityRating,
        overallPerformanceScore: overallScore,
        tasksCompleted: formData.tasksCompleted,
        tasksInProgress: formData.tasksInProgress,
        tasksPending: formData.tasksPending,
        totalHoursWorked: formData.totalHoursWorked,
        costUtilization: formData.costUtilization,
        clientFeedback: formData.clientFeedback,
        lastReviewDate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).catch(() => {
        // If update fails, might need to create
        setMessage({ type: 'error', text: 'Team performance not found for this phase' })
      })

      setMessage({ type: 'success', text: 'Performance updated successfully!' })
      setShowEditForm(false)
      setEditingPerformance(null)
      setFormData({})
    } catch (error) {
      console.error('Error saving performance:', error)
      setMessage({ type: 'error', text: 'Failed to save performance' })
    }
  }

  const startEdit = (perf: TeamPerformance) => {
    setEditingPerformance(perf)
    setFormData(perf)
    setShowEditForm(true)
  }

  const cancelEdit = () => {
    setShowEditForm(false)
    setEditingPerformance(null)
    setFormData({})
  }

  const getStatusColor = (score: number): { bg: string; text: string; label: string } => {
    if (score >= 4.5) return { bg: 'bg-green-100 dark:bg-green-900', text: 'text-green-700 dark:text-green-300', label: 'Excellent' }
    if (score >= 3.5) return { bg: 'bg-blue-100 dark:bg-blue-900', text: 'text-blue-700 dark:text-blue-300', label: 'Good' }
    if (score >= 2.5) return { bg: 'bg-yellow-100 dark:bg-yellow-900', text: 'text-yellow-700 dark:text-yellow-300', label: 'Fair' }
    return { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-700 dark:text-red-300', label: 'Poor' }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600 dark:text-green-400'
    if (rating >= 3.5) return 'text-blue-600 dark:text-blue-400'
    if (rating >= 2.5) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getFilteredPerformance = (): TeamPerformance[] => {
    let filtered = performance

    if (filterPhase !== 'All') {
      filtered = filtered.filter(p => p.phaseId === filterPhase)
    }

    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'quality':
          return (b.qualityRating || 0) - (a.qualityRating || 0)
        case 'productivity':
          return (b.productivityRating || 0) - (a.productivityRating || 0)
        case 'punctuality':
          return (b.punctualityRating || 0) - (a.punctualityRating || 0)
        case 'overall':
        default:
          return (b.overallPerformanceScore || 0) - (a.overallPerformanceScore || 0)
      }
    })
  }

  const calculateAverages = (): Record<string, number> => {
    const filtered = getFilteredPerformance()
    if (filtered.length === 0) return { overall: 0, quality: 0, productivity: 0, punctuality: 0 }

    const overall = filtered.reduce((sum, p) => sum + (p.overallPerformanceScore || 0), 0) / filtered.length
    const quality = filtered.reduce((sum, p) => sum + (p.qualityRating || 0), 0) / filtered.length
    const productivity = filtered.reduce((sum, p) => sum + (p.productivityRating || 0), 0) / filtered.length
    const punctuality = filtered.reduce((sum, p) => sum + (p.punctualityRating || 0), 0) / filtered.length

    return {
      overall: Math.round(overall * 10) / 10,
      quality: Math.round(quality * 10) / 10,
      productivity: Math.round(productivity * 10) / 10,
      punctuality: Math.round(punctuality * 10) / 10
    }
  }

  const filteredPerformance = getFilteredPerformance()
  const averages = calculateAverages()

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading team performance data...</p>
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
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">📊 Team Performance</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Track and manage team performance metrics</p>
          </div>
          <span className="text-4xl">📈</span>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg border-2 ${
              message.type === 'success'
                ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700'
                : 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-700'
            }`}
          >
            <p
              className={`${
                message.type === 'success'
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-red-700 dark:text-red-300'
              } font-semibold`}
            >
              {message.type === 'success' ? '✓' : '✕'} {message.text}
            </p>
          </div>
        )}
      </div>

      {/* Overall Averages */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-4 text-white">
          <p className="text-xs font-semibold opacity-90">Overall Score</p>
          <p className="text-2xl sm:text-3xl font-bold mt-2">{averages.overall.toFixed(1)}/5</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-4 text-white">
          <p className="text-xs font-semibold opacity-90">Quality</p>
          <p className="text-2xl sm:text-3xl font-bold mt-2">{averages.quality.toFixed(1)}/5</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-4 text-white">
          <p className="text-xs font-semibold opacity-90">Productivity</p>
          <p className="text-2xl sm:text-3xl font-bold mt-2">{averages.productivity.toFixed(1)}/5</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-4 text-white">
          <p className="text-xs font-semibold opacity-90">Punctuality</p>
          <p className="text-2xl sm:text-3xl font-bold mt-2">{averages.punctuality.toFixed(1)}/5</p>
        </div>
      </div>

      {/* Filters & Sort */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Filter by Phase</label>
            <select
              value={filterPhase}
              onChange={(e) => setFilterPhase(e.target.value)}
              className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Phases</option>
              {PHASE_IDS.map(phaseId => (
                <option key={phaseId} value={phaseId}>
                  {PHASE_NAMES[phaseId]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="overall">Overall Score</option>
              <option value="quality">Quality Rating</option>
              <option value="productivity">Productivity</option>
              <option value="punctuality">Punctuality</option>
            </select>
          </div>
        </div>
      </div>

      {/* Performance Cards */}
      <div className="space-y-4">
        {filteredPerformance.length === 0 ? (
          <div className="bg-slate-50 dark:bg-slate-700 p-12 rounded-lg text-center">
            <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">📭 No performance data</p>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Performance ratings will appear here as they are recorded</p>
          </div>
        ) : (
          filteredPerformance.map(perf => {
            const statusColor = getStatusColor(perf.overallPerformanceScore || 0)
            return (
              <div
                key={`${perf.phaseId}-${perf.teamId}`}
                className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
              >
                {/* Header */}
                <div className={`${statusColor.bg} px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700`}>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-lg sm:text-xl font-bold ${statusColor.text}`}>{perf.teamName}</h3>
                      <p className={`text-sm ${statusColor.text} opacity-80 mt-1`}>{PHASE_NAMES[perf.phaseId]}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className={`text-3xl font-bold ${getRatingColor(perf.overallPerformanceScore || 0)}`}>
                          {(perf.overallPerformanceScore || 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{statusColor.label}</p>
                      </div>
                      <button
                        onClick={() => startEdit(perf)}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold whitespace-nowrap transition-all"
                      >
                        ✏️ Edit
                      </button>
                    </div>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="px-4 sm:px-6 py-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                    {/* Quality */}
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Quality Rating</p>
                      <div className="flex items-end gap-2">
                        <p className={`text-2xl font-bold ${getRatingColor(perf.qualityRating || 0)}`}>
                          {(perf.qualityRating || 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">/5</p>
                      </div>
                      <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full ${getRatingColor(perf.qualityRating || 0).replace('text', 'bg')}`}
                          style={{ width: `${((perf.qualityRating || 0) / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Productivity */}
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Productivity Rating</p>
                      <div className="flex items-end gap-2">
                        <p className={`text-2xl font-bold ${getRatingColor(perf.productivityRating || 0)}`}>
                          {(perf.productivityRating || 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">/5</p>
                      </div>
                      <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full ${getRatingColor(perf.productivityRating || 0).replace('text', 'bg')}`}
                          style={{ width: `${((perf.productivityRating || 0) / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Punctuality */}
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Punctuality Rating</p>
                      <div className="flex items-end gap-2">
                        <p className={`text-2xl font-bold ${getRatingColor(perf.punctualityRating || 0)}`}>
                          {(perf.punctualityRating || 0).toFixed(1)}
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-400">/5</p>
                      </div>
                      <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-full h-2 mt-2">
                        <div
                          className={`h-2 rounded-full ${getRatingColor(perf.punctualityRating || 0).replace('text', 'bg')}`}
                          style={{ width: `${((perf.punctualityRating || 0) / 5) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Cost Utilization */}
                    <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Cost Utilization</p>
                      <div className="flex items-end gap-2">
                        <p className="text-2xl font-bold text-slate-900 dark:text-white">{(perf.costUtilization || 0).toFixed(0)}%</p>
                      </div>
                      <div className="w-full bg-slate-300 dark:bg-slate-600 rounded-full h-2 mt-2">
                        <div
                          className="h-2 rounded-full bg-blue-600 dark:bg-blue-400"
                          style={{ width: `${perf.costUtilization || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tasks Summary */}
                  <div className="grid grid-cols-3 gap-4 py-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="text-center">
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">{perf.tasksCompleted || 0}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Completed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{perf.tasksInProgress || 0}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">In Progress</p>
                    </div>
                    <div className="text-center">
                      <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{perf.tasksPending || 0}</p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-1">Pending</p>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {perf.totalHoursWorked && (
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                      <p>⏱️ <span className="font-semibold">{perf.totalHoursWorked} hours</span> worked on this phase</p>
                    </div>
                  )}

                  {perf.clientFeedback && (
                    <div className="text-sm text-slate-600 dark:text-slate-400 mt-4 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                      <p className="font-semibold text-slate-900 dark:text-white mb-1">💬 Client Feedback</p>
                      <p>{perf.clientFeedback}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Edit Modal */}
      {showEditForm && editingPerformance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                Update Performance: {editingPerformance.teamName}
              </h3>
            </div>

            <form onSubmit={handleSavePerformance} className="p-6 space-y-4">
              {/* Ratings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Quality Rating (1-5) *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={formData.qualityRating || 3}
                      onChange={(e) => setFormData({ ...formData, qualityRating: parseFloat(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-slate-900 dark:text-white w-8">{(formData.qualityRating || 3).toFixed(1)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Productivity Rating (1-5) *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={formData.productivityRating || 3}
                      onChange={(e) => setFormData({ ...formData, productivityRating: parseFloat(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-slate-900 dark:text-white w-8">{(formData.productivityRating || 3).toFixed(1)}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Punctuality Rating (1-5) *</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="0.5"
                      value={formData.punctualityRating || 3}
                      onChange={(e) => setFormData({ ...formData, punctualityRating: parseFloat(e.target.value) })}
                      className="flex-1"
                    />
                    <span className="text-lg font-bold text-slate-900 dark:text-white w-8">{(formData.punctualityRating || 3).toFixed(1)}</span>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tasks Completed</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.tasksCompleted || 0}
                    onChange={(e) => setFormData({ ...formData, tasksCompleted: parseInt(e.target.value) })}
                    className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tasks In Progress</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.tasksInProgress || 0}
                    onChange={(e) => setFormData({ ...formData, tasksInProgress: parseInt(e.target.value) })}
                    className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Tasks Pending</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.tasksPending || 0}
                    onChange={(e) => setFormData({ ...formData, tasksPending: parseInt(e.target.value) })}
                    className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Additional Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Total Hours Worked</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={formData.totalHoursWorked || 0}
                    onChange={(e) => setFormData({ ...formData, totalHoursWorked: parseFloat(e.target.value) })}
                    className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Cost Utilization (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.costUtilization || 0}
                    onChange={(e) => setFormData({ ...formData, costUtilization: parseInt(e.target.value) })}
                    className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Feedback */}
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Client Feedback</label>
                <textarea
                  value={formData.clientFeedback || ''}
                  onChange={(e) => setFormData({ ...formData, clientFeedback: e.target.value })}
                  placeholder="Add any client feedback or notes..."
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white h-24"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all"
                >
                  ✓ Save Performance
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
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

export default TeamPerformance
