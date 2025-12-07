import React, { useEffect, useState } from 'react'
import { Firestore, collection, doc, onSnapshot, updateDoc, setDoc, deleteDoc, Timestamp } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type Team = {
  id: string
  name: string
  description: string
  phone: string
  email: string
  hourlyRate?: number
  teamLeader?: string
  capacity?: number
  currentLoad?: number
  availability?: 'available' | 'busy' | 'unavailable'
  skills?: string[]
  certifications?: string[]
  createdAt?: string
  updatedAt?: string
}

type TeamWithPhase = Team & { phaseId: string }

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

function TeamManagement({ db, role }: { db: Firestore | null; role: Role }) {
  const [teamsByPhase, setTeamsByPhase] = useState<Record<string, Team[]>>({})
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [filterPhase, setFilterPhase] = useState<string>('All')
  const [showForm, setShowForm] = useState(false)
  const [editingTeam, setEditingTeam] = useState<{ phaseId: string; teamId: string } | null>(null)
  const [selectedPhaseForNew, setSelectedPhaseForNew] = useState<string>('')
  const [formData, setFormData] = useState<Partial<Team>>({
    name: '',
    description: '',
    phone: '',
    email: '',
    hourlyRate: undefined,
    teamLeader: '',
    capacity: 5,
    availability: 'available',
    skills: [],
    certifications: []
  })

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
    })

    setLoading(false)
    return () => unsubscribers.forEach(unsub => unsub())
  }, [db])

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !formData.name || !selectedPhaseForNew) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    try {
      const teamId = formData.name.toLowerCase().replace(/\s+/g, '-').substring(0, 50)
      const teamRef = doc(db, 'phases', selectedPhaseForNew, 'teams', teamId)

      const teamData: Team = {
        id: teamId,
        name: formData.name || '',
        description: formData.description || '',
        phone: formData.phone || '',
        email: formData.email || '',
        hourlyRate: formData.hourlyRate,
        teamLeader: formData.teamLeader || '',
        capacity: formData.capacity || 5,
        currentLoad: 0,
        availability: formData.availability || 'available',
        skills: formData.skills || [],
        certifications: formData.certifications || [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      await setDoc(teamRef, teamData)
      setMessage({ type: 'success', text: 'Team added successfully!' })
      resetForm()
    } catch (error) {
      console.error('Error adding team:', error)
      setMessage({ type: 'error', text: 'Failed to add team' })
    }
  }

  const handleEditTeam = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db || !editingTeam || !formData.name) {
      setMessage({ type: 'error', text: 'Please fill in all required fields' })
      return
    }

    try {
      const teamRef = doc(db, 'phases', editingTeam.phaseId, 'teams', editingTeam.teamId)

      await updateDoc(teamRef, {
        name: formData.name,
        description: formData.description,
        phone: formData.phone,
        email: formData.email,
        hourlyRate: formData.hourlyRate,
        teamLeader: formData.teamLeader,
        capacity: formData.capacity,
        availability: formData.availability,
        skills: formData.skills,
        certifications: formData.certifications,
        updatedAt: new Date().toISOString()
      })

      setMessage({ type: 'success', text: 'Team updated successfully!' })
      resetForm()
    } catch (error) {
      console.error('Error updating team:', error)
      setMessage({ type: 'error', text: 'Failed to update team' })
    }
  }

  const handleDeleteTeam = async (phaseId: string, teamId: string) => {
    if (!db || !window.confirm('Are you sure you want to delete this team?')) return

    try {
      const teamRef = doc(db, 'phases', phaseId, 'teams', teamId)
      await deleteDoc(teamRef)
      setMessage({ type: 'success', text: 'Team deleted successfully!' })
    } catch (error) {
      console.error('Error deleting team:', error)
      setMessage({ type: 'error', text: 'Failed to delete team' })
    }
  }

  const startEdit = (phaseId: string, team: Team) => {
    setEditingTeam({ phaseId, teamId: team.id })
    setFormData(team)
    setShowForm(true)
  }

  const resetForm = () => {
    setShowForm(false)
    setEditingTeam(null)
    setSelectedPhaseForNew('')
    setFormData({
      name: '',
      description: '',
      phone: '',
      email: '',
      hourlyRate: undefined,
      teamLeader: '',
      capacity: 5,
      availability: 'available',
      skills: [],
      certifications: []
    })
  }

  const getPhaseTeams = (phaseId: string): Team[] => {
    return teamsByPhase[phaseId] || []
  }

  const getCapacityColor = (current: number, capacity: number) => {
    const percentage = (current / capacity) * 100
    if (percentage <= 70) return 'text-green-600 dark:text-green-400'
    if (percentage <= 90) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }

  const getAvailabilityColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
      case 'busy':
        return 'bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300'
      case 'unavailable':
        return 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300'
      default:
        return 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Loading teams...</p>
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
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">👷 Team Management</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Create, edit, and manage project teams</p>
          </div>
          <button
            onClick={() => {
              setEditingTeam(null)
              setShowForm(!showForm)
            }}
            className="px-4 sm:px-6 py-2 sm:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base transition-all"
          >
            {showForm ? '✕ Cancel' : '+ Add New Team'}
          </button>
        </div>

        {/* Message */}
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

      {/* Add/Edit Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
          <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white mb-6">
            {editingTeam ? '✏️ Edit Team' : '➕ Add New Team'}
          </h3>

          <form
            onSubmit={editingTeam ? handleEditTeam : handleAddTeam}
            className="space-y-6"
          >
            {!editingTeam && (
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Select Phase *</label>
                <select
                  value={selectedPhaseForNew}
                  onChange={(e) => setSelectedPhaseForNew(e.target.value)}
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">-- Select a Phase --</option>
                  {PHASE_IDS.map(phaseId => (
                    <option key={phaseId} value={phaseId}>
                      {PHASE_NAMES[phaseId]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Team Name *</label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., MEP Specialists"
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Team Leader</label>
                <input
                  type="text"
                  value={formData.teamLeader || ''}
                  onChange={(e) => setFormData({ ...formData, teamLeader: e.target.value })}
                  placeholder="Name of team leader"
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Description</label>
              <textarea
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Team responsibilities and specialties"
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-24"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.phone || ''}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Contact number"
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Contact email"
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Hourly Rate ($)</label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={formData.hourlyRate || ''}
                  onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value ? parseInt(e.target.value) : undefined })}
                  placeholder="0"
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Team Capacity</label>
                <input
                  type="number"
                  min="1"
                  value={formData.capacity || 5}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Availability</label>
                <select
                  value={formData.availability || 'available'}
                  onChange={(e) => setFormData({ ...formData, availability: e.target.value as any })}
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="available">✓ Available</option>
                  <option value="busy">⏳ Busy</option>
                  <option value="unavailable">✕ Unavailable</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition-all"
              >
                {editingTeam ? '✓ Update Team' : '✓ Add Team'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 px-6 py-3 border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 p-4 sm:p-6">
        <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Filter by Phase</label>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterPhase('All')}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all ${
              filterPhase === 'All'
                ? 'bg-blue-600 text-white'
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
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
              }`}
            >
              {PHASE_NAMES[phaseId].split(':')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Teams List */}
      <div className="space-y-4">
        {filterPhase === 'All'
          ? PHASE_IDS.map(phaseId => {
              const teams = getPhaseTeams(phaseId)
              return (
                <div key={phaseId}>
                  <div className="bg-gradient-to-r from-slate-100 dark:from-slate-700 to-blue-100 dark:to-slate-700 px-4 sm:px-6 py-3 rounded-lg mb-3 border-l-4 border-blue-600">
                    <h3 className="font-bold text-slate-900 dark:text-white">
                      {PHASE_NAMES[phaseId]} <span className="text-sm font-normal">({teams.length} teams)</span>
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {teams.length === 0 ? (
                      <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg text-center text-slate-500 dark:text-slate-400">
                        No teams in this phase
                      </div>
                    ) : (
                      teams.map(team => (
                        <TeamCard
                          key={team.id}
                          team={team}
                          phaseId={phaseId}
                          onEdit={() => startEdit(phaseId, team)}
                          onDelete={() => handleDeleteTeam(phaseId, team.id)}
                          getCapacityColor={getCapacityColor}
                          getAvailabilityColor={getAvailabilityColor}
                        />
                      ))
                    )}
                  </div>
                </div>
              )
            })
          : (() => {
              const teams = getPhaseTeams(filterPhase)
              return (
                <div className="space-y-3">
                  {teams.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-700 p-6 rounded-lg text-center text-slate-500 dark:text-slate-400">
                      No teams in this phase
                    </div>
                  ) : (
                    teams.map(team => (
                      <TeamCard
                        key={team.id}
                        team={team}
                        phaseId={filterPhase}
                        onEdit={() => startEdit(filterPhase, team)}
                        onDelete={() => handleDeleteTeam(filterPhase, team.id)}
                        getCapacityColor={getCapacityColor}
                        getAvailabilityColor={getAvailabilityColor}
                      />
                    ))
                  )}
                </div>
              )
            })()}
      </div>
    </div>
  )
}

interface TeamCardProps {
  team: Team
  phaseId: string
  onEdit: () => void
  onDelete: () => void
  getCapacityColor: (current: number, capacity: number) => string
  getAvailabilityColor: (status: string) => string
}

function TeamCard({ team, onEdit, onDelete, getCapacityColor, getAvailabilityColor }: TeamCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-6 hover:shadow-xl transition-shadow">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h4 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{team.name}</h4>
          {team.teamLeader && <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">👤 Led by {team.teamLeader}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onEdit}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold transition-all"
          >
            ✏️ Edit
          </button>
          <button
            onClick={onDelete}
            className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-all"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {team.description && <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">{team.description}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        {team.phone && (
          <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Phone</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">{team.phone}</p>
          </div>
        )}
        {team.email && (
          <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Email</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{team.email}</p>
          </div>
        )}
        {team.hourlyRate && (
          <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
            <p className="text-xs text-slate-600 dark:text-slate-400">Hourly Rate</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">${team.hourlyRate}/hr</p>
          </div>
        )}
        <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg">
          <p className="text-xs text-slate-600 dark:text-slate-400">Availability</p>
          <p className={`text-sm font-bold capitalize ${getAvailabilityColor(team.availability || 'available').split(' ').filter(c => c.startsWith('text-')).join(' ')}`}>
            {team.availability || 'available'}
          </p>
        </div>
      </div>

      {/* Capacity */}
      <div className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-slate-900 dark:text-white">Team Capacity</span>
          <span className={`text-sm font-bold ${getCapacityColor(team.currentLoad || 0, team.capacity || 5)}`}>
            {team.currentLoad || 0}/{team.capacity || 5}
          </span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${
              ((team.currentLoad || 0) / (team.capacity || 5)) * 100 <= 70
                ? 'bg-green-500'
                : ((team.currentLoad || 0) / (team.capacity || 5)) * 100 <= 90
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
            }`}
            style={{ width: `${((team.currentLoad || 0) / (team.capacity || 5)) * 100}%` }}
          />
        </div>
      </div>

      {/* Skills & Certifications */}
      {(team.skills?.length || 0) > 0 && (
        <div className="mb-3">
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Skills</p>
          <div className="flex flex-wrap gap-2">
            {team.skills?.map(skill => (
              <span key={skill} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs rounded">
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {(team.certifications?.length || 0) > 0 && (
        <div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Certifications</p>
          <div className="flex flex-wrap gap-2">
            {team.certifications?.map(cert => (
              <span key={cert} className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs rounded">
                ✓ {cert}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamManagement
