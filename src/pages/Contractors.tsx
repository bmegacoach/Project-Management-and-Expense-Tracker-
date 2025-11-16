import React, { useEffect, useMemo, useState } from 'react'
import { Firestore, collection, onSnapshot } from 'firebase/firestore'

type Team = { 
  id: string
  name?: string
  description?: string
  phone?: string
  email?: string
  tasks?: Array<{ taskId: string; taskName: string; lineItem?: string; isNonDependency?: boolean; subTasks?: Array<{ name: string; status: string }> }>
  createdAt?: string
  updatedAt?: string
}

const PHASE_IDS = [
  'phase-1-pre-construction-demolition',
  'phase-2-structural-envelope',
  'phase-3-mep-rough-in',
  'phase-4-interior-finishes-exterior-cladding',
  'phase-5-fixtures-appliances-final-touches'
]

const PHASE_NAMES = {
  'phase-1-pre-construction-demolition': 'Phase 1: Pre-Construction & Demolition',
  'phase-2-structural-envelope': 'Phase 2: Structural & Envelope',
  'phase-3-mep-rough-in': 'Phase 3: MEP Rough-in',
  'phase-4-interior-finishes-exterior-cladding': 'Phase 4: Interior Finishes & Exterior Cladding',
  'phase-5-fixtures-appliances-final-touches': 'Phase 5: Fixtures, Appliances & Final Touches'
}

function Contractors({ db }: { db: Firestore | null }) {
  const [teamsByPhase, setTeamsByPhase] = useState<Record<string, Team[]>>({})
  const [filterPhase, setFilterPhase] = useState<string>('All')

  useEffect(() => {
    if (!db) return

    // Listen to all phases and their teams
    const unsubscribers: (() => void)[] = []

    PHASE_IDS.forEach(phaseId => {
      const unsubscribe = onSnapshot(
        collection(db, 'phases', phaseId, 'teams'),
        snapshot => {
          const teams: Team[] = []
          snapshot.forEach(doc => {
            teams.push({ id: doc.id, ...doc.data() as any })
          })
          setTeamsByPhase(prev => ({
            ...prev,
            [phaseId]: teams
          }))
        }
      )
      unsubscribers.push(unsubscribe)
    })

    return () => unsubscribers.forEach(unsub => unsub())
  }, [db])

  const grouped = useMemo(() => {
    const allTeams: Record<string, Team[]> = {}
    
    PHASE_IDS.forEach(phaseId => {
      if (filterPhase === 'All' || filterPhase === phaseId) {
        allTeams[phaseId] = teamsByPhase[phaseId] || []
      }
    })
    
    return allTeams
  }, [teamsByPhase, filterPhase])

  const getTotalTasksForTeam = (team: Team) => {
    return team.tasks?.length || 0
  }

  const getTotalSubTasksForTeam = (team: Team) => {
    return team.tasks?.reduce((sum, task) => sum + (task.subTasks?.length || 0), 0) || 0
  }

  return (
    <div className="grid gap-4 sm:gap-8">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Project Teams</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">View all teams and their tasks by phase</p>
          </div>
          <span className="text-3xl sm:text-4xl flex-shrink-0">👷</span>
        </div>
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
        <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Filter by Phase</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterPhase('All')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
              filterPhase === 'All'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            All Phases
          </button>
          {PHASE_IDS.map(phaseId => (
            <button
              key={phaseId}
              onClick={() => setFilterPhase(phaseId)}
              className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                filterPhase === phaseId
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {PHASE_NAMES[phaseId].split(':')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Teams List */}
      <div className="space-y-3 sm:space-y-4">
        {Object.keys(grouped).length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 p-8 text-center">
            <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">📭 No teams found</p>
            <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">Adjust your filters or check back later</p>
          </div>
        ) : (
          Object.entries(grouped).map(([phaseId, teams]) => (
            <div key={phaseId} className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 dark:from-slate-700 to-blue-50 dark:to-slate-700">
                <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
                  <span>🏗️</span> {PHASE_NAMES[phaseId]} <span className="text-xs bg-blue-200 dark:bg-blue-900 text-blue-900 dark:text-blue-200 px-2 py-1 rounded-full font-bold">{teams.length}</span>
                </h4>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {teams.length === 0 ? (
                  <div className="p-4 sm:p-6 text-xs sm:text-sm text-slate-500 dark:text-slate-400">No teams in this phase</div>
                ) : (
                  teams.map(team => (
                    <div key={team.id} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
                        <div className="flex-1 min-w-0">
                          <h5 className="font-semibold text-slate-900 dark:text-white text-sm sm:text-base break-words">{team.name}</h5>
                          {team.description && <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">{team.description}</p>}
                          <div className="flex flex-col gap-1 mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                            {team.phone && <span>📱 {team.phone}</span>}
                            {team.email && <span>📧 {team.email}</span>}
                          </div>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{getTotalTasksForTeam(team)}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Tasks</div>
                        </div>
                      </div>

                      {/* Tasks List */}
                      {team.tasks && team.tasks.length > 0 && (
                        <div className="mt-4 space-y-3">
                          <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">📋 Assigned Tasks ({team.tasks.length})</div>
                          <div className="space-y-2">
                            {team.tasks.map((task, idx) => (
                              <div key={idx} className="p-3 bg-slate-100 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-slate-900 dark:text-white text-xs sm:text-sm break-words">{task.taskName}</p>
                                    {task.lineItem && <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">📌 {task.lineItem}</p>}
                                  </div>
                                  {task.isNonDependency && (
                                    <span className="flex-shrink-0 px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 text-xs font-semibold rounded">
                                      Non-Dep
                                    </span>
                                  )}
                                </div>

                                {/* Sub-tasks */}
                                {task.subTasks && task.subTasks.length > 0 && (
                                  <div className="mt-2 ml-3 pl-3 border-l-2 border-slate-300 dark:border-slate-500 space-y-1">
                                    {task.subTasks.map((subTask, subIdx) => (
                                      <div key={subIdx} className="text-xs text-slate-600 dark:text-slate-400">
                                        <span className="font-medium">• {subTask.name}</span>
                                        <span className={`ml-2 px-1 py-0.5 rounded text-xs font-semibold ${
                                          subTask.status === 'completed'
                                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                                            : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                                        }`}>
                                          {subTask.status}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Summary Stats */}
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-600 grid grid-cols-2 gap-3">
                        <div className="text-center">
                          <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{getTotalTasksForTeam(team)}</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">Main Tasks</div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-bold text-green-600 dark:text-green-400">{getTotalSubTasksForTeam(team)}</div>
                          <div className="text-xs text-slate-600 dark:text-slate-400">Sub-Tasks</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Contractors