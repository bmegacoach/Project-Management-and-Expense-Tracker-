import React, { useState, useEffect } from 'react'
import { Firestore, collection, addDoc, serverTimestamp, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type InspectionRow = {
  location: string
  condition: string
  action: string
}

type EditHistoryEntry = {
  editedAt: string
  editedBy: string
  changes: Record<string, string>
}

type DailyReport = {
  id?: string
  dateOfReport: string
  hoursWorked: number
  
  // Section 1
  scopeOfWork: string
  generalNotes: string
  observations: string
  locationFocus: string
  nextSteps: string
  
  // Section 2
  inspections: InspectionRow[]
  
  // Section 3
  salvageMaterials: string
  lumberList: string
  plumbingList: string
  electricalList: string
  
  // Section 4
  photos: { name: string; url: string; timestamp: string }[]
  
  createdAt?: string
  updatedAt?: string
  submittedBy?: string
  isDraft?: boolean
  approvalStatus?: 'draft' | 'submitted' | 'approved' | 'rejected'
  approvedBy?: string
  approvedAt?: string
  rejectionReason?: string
  editHistory?: EditHistoryEntry[]
}

function DailyReports({ db, role }: { db: Firestore | null; role: Role }) {
  const [tab, setTab] = useState<'submit' | 'view'>('submit')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [report, setReport] = useState<DailyReport>({
    dateOfReport: new Date().toISOString().split('T')[0],
    hoursWorked: 8,
    scopeOfWork: '',
    generalNotes: '',
    observations: '',
    locationFocus: '',
    nextSteps: '',
    inspections: [
      { location: 'Foundation/Footing (E.g., Rear exterior slab)', condition: '', action: '' },
      { location: 'Load-Bearing Walls/Framing (E.g., 2x4s near HVAC unit)', condition: '', action: '' },
      { location: 'Non-Load Bearing (E.g., Hallway partition)', condition: '', action: '' },
      { location: 'Ceiling Joists/Rafters (E.g., Above Room #6)', condition: '', action: '' },
      { location: 'Plumbing/Water Lines (E.g., Shower in front of house)', condition: '', action: '' },
      { location: 'Electrical Wiring (E.g., Wiring in demoed walls)', condition: '', action: '' },
      { location: 'Pest Damage (Termites/Other)', condition: '', action: '' }
    ],
    salvageMaterials: '',
    lumberList: '',
    plumbingList: '',
    electricalList: '',
    photos: [],
    isDraft: true,
    approvalStatus: 'draft'
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [photoInput, setPhotoInput] = useState<File | null>(null)
  const [savedReports, setSavedReports] = useState<(DailyReport & { id: string })[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Load saved reports on mount or tab change
  useEffect(() => {
    if (tab === 'view' && db) {
      loadReports()
    }
  }, [tab, db])

  const loadReports = async () => {
    if (!db) return
    setLoading(true)
    try {
      const reportsCollection = collection(db, 'dailyReports')
      const q = query(reportsCollection, orderBy('dateOfReport', 'desc'))
      const querySnapshot = await getDocs(q)
      const reports = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as DailyReport & { id: string }))
      setSavedReports(reports)
    } catch (error) {
      console.error('Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof DailyReport, value: any) => {
    setReport(prev => ({ ...prev, [field]: value }))
  }

  const handleInspectionChange = (index: number, field: 'location' | 'condition' | 'action', value: string) => {
    const updated = [...report.inspections]
    updated[index] = { ...updated[index], [field]: value }
    setReport(prev => ({ ...prev, inspections: updated }))
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setPhotoInput(e.target.files[0])
    }
  }

  const handlePhotoUpload = async () => {
    if (!photoInput) return
    
    // In a real app, you'd upload to Firebase Storage
    // For now, we'll create a local URL
    const reader = new FileReader()
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string
      setReport(prev => ({
        ...prev,
        photos: [
          ...prev.photos,
          {
            name: photoInput.name,
            url: dataUrl,
            timestamp: new Date().toISOString()
          }
        ]
      }))
      setPhotoInput(null)
    }
    reader.readAsDataURL(photoInput)
  }

  const handleRemovePhoto = (index: number) => {
    setReport(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }))
  }

  const startEdit = (reportToEdit: DailyReport & { id: string }) => {
    setEditingId(reportToEdit.id)
    setReport(reportToEdit)
    setTab('submit')
  }

  const cancelEdit = () => {
    setEditingId(null)
    resetForm()
  }

  const resetForm = () => {
    setReport({
      dateOfReport: new Date().toISOString().split('T')[0],
      hoursWorked: 8,
      scopeOfWork: '',
      generalNotes: '',
      observations: '',
      locationFocus: '',
      nextSteps: '',
      inspections: [
        { location: 'Foundation/Footing (E.g., Rear exterior slab)', condition: '', action: '' },
        { location: 'Load-Bearing Walls/Framing (E.g., 2x4s near HVAC unit)', condition: '', action: '' },
        { location: 'Non-Load Bearing (E.g., Hallway partition)', condition: '', action: '' },
        { location: 'Ceiling Joists/Rafters (E.g., Above Room #6)', condition: '', action: '' },
        { location: 'Plumbing/Water Lines (E.g., Shower in front of house)', condition: '', action: '' },
        { location: 'Electrical Wiring (E.g., Wiring in demoed walls)', condition: '', action: '' },
        { location: 'Pest Damage (Termites/Other)', condition: '', action: '' }
      ],
      salvageMaterials: '',
      lumberList: '',
      plumbingList: '',
      electricalList: '',
      photos: [],
      isDraft: true,
      approvalStatus: 'draft'
    })
    setPhotoInput(null)
  }

  const deleteReport = async (reportId: string) => {
    if (!db) return
    if (!window.confirm('Are you sure you want to delete this report?')) return

    try {
      await deleteDoc(doc(db, 'dailyReports', reportId))
      setMessage({ type: 'success', text: 'Report deleted successfully' })
      loadReports()
    } catch (error) {
      console.error('Error deleting report:', error)
      setMessage({ type: 'error', text: 'Failed to delete report' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!db) {
      alert('Database connection failed')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingId) {
        // Update existing report
        const reportRef = doc(db, 'dailyReports', editingId)
        await updateDoc(reportRef, {
          ...report,
          updatedAt: new Date().toISOString(),
          approvalStatus: 'submitted'
        })
        setMessage({ type: 'success', text: 'Daily report updated and submitted for approval!' })
        setEditingId(null)
      } else {
        // Create new report
        await addDoc(collection(db, 'dailyReports'), {
          ...report,
          createdAt: new Date().toISOString(),
          submittedBy: role,
          isDraft: false,
          approvalStatus: 'submitted',
          timestamp: serverTimestamp()
        })
        setMessage({ type: 'success', text: 'Daily report submitted successfully!' })
      }
      
      // Reset form
      resetForm()
      // Reload reports if on view tab
      if (tab === 'view') {
        loadReports()
      }
    } catch (error) {
      console.error('Error submitting report:', error)
      setMessage({ type: 'error', text: 'Failed to submit report. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const saveDraft = async () => {
    if (!db) {
      alert('Database connection failed')
      return
    }

    setIsSubmitting(true)
    try {
      if (editingId) {
        // Update draft
        const reportRef = doc(db, 'dailyReports', editingId)
        await updateDoc(reportRef, {
          ...report,
          isDraft: true,
          approvalStatus: 'draft',
          updatedAt: new Date().toISOString()
        })
        setMessage({ type: 'success', text: 'Draft saved successfully!' })
      } else {
        // Create new draft
        const newReportRef = await addDoc(collection(db, 'dailyReports'), {
          ...report,
          isDraft: true,
          approvalStatus: 'draft',
          createdAt: new Date().toISOString(),
          submittedBy: role,
          timestamp: serverTimestamp()
        })
        setEditingId(newReportRef.id)
        setMessage({ type: 'success', text: 'Draft saved successfully! You can continue editing.' })
      }
    } catch (error) {
      console.error('Error saving draft:', error)
      setMessage({ type: 'error', text: 'Failed to save draft. Please try again.' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">📋 Daily Site Report</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Track daily progress, inspections, and materials</p>
          </div>
          <span className="text-4xl">📝</span>
        </div>

        {!db && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border border-red-300 dark:border-red-700 rounded-lg">
            <p className="text-red-700 dark:text-red-300 font-semibold">⚠️ Offline Mode</p>
            <p className="text-sm text-red-600 dark:text-red-400">Could not connect to the database. Report submissions are disabled.</p>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b-2 border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setTab('submit')}
            className={`px-4 py-3 font-bold text-sm sm:text-base transition-all border-b-4 ${
              tab === 'submit'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            ✏️ {editingId ? 'Edit Report' : 'Submit New Report'}
          </button>
          <button
            onClick={() => setTab('view')}
            className={`px-4 py-3 font-bold text-sm sm:text-base transition-all border-b-4 ${
              tab === 'view'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            📊 View Reports by Date
          </button>
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

        {/* Submit Tab */}
        {tab === 'submit' && (
          <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4 sm:p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Report Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Date of Report</label>
                <input
                  type="date"
                  value={report.dateOfReport}
                  onChange={(e) => handleInputChange('dateOfReport', e.target.value)}
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white text-sm sm:text-base"
                  required
                />
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Hours Worked Today</label>
                <input
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  value={report.hoursWorked}
                  onChange={(e) => handleInputChange('hoursWorked', parseFloat(e.target.value))}
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white text-sm sm:text-base"
                  required
                />
              </div>
            </div>
          </div>

          {/* Section 1: Daily Progress */}
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 sm:p-6 space-y-4 border-l-4 border-blue-500">
            <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100">📌 SECTION 1: DAILY PROGRESS SUMMARY</h3>
            
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">1.1 Scope of Work Completed Today</label>
              <textarea
                value={report.scopeOfWork}
                onChange={(e) => handleInputChange('scopeOfWork', e.target.value)}
                placeholder="E.g., Stripped all drywall and trim in Room #4; Completed ceiling demo in central hallway (50 LF)..."
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white text-sm sm:text-base h-24"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">1.2 General Notes</label>
              <textarea
                value={report.generalNotes}
                onChange={(e) => handleInputChange('generalNotes', e.target.value)}
                placeholder="Any general comments about the day's work..."
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white text-sm sm:text-base h-20"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">1.3 Observations</label>
              <textarea
                value={report.observations}
                onChange={(e) => handleInputChange('observations', e.target.value)}
                placeholder="Any unusual findings, potential issues, or noteworthy observations..."
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white text-sm sm:text-base h-20"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">1.4 Location Focus (Room/Area)</label>
              <input
                type="text"
                value={report.locationFocus}
                onChange={(e) => handleInputChange('locationFocus', e.target.value)}
                placeholder="E.g., North-East Corner Room (Room #6) and Rear Exterior Wall"
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white text-sm sm:text-base"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">1.5 Next Steps (Plan for Tomorrow)</label>
              <textarea
                value={report.nextSteps}
                onChange={(e) => handleInputChange('nextSteps', e.target.value)}
                placeholder="E.g., Begin demolition of Room #5; Prepare for electrical diagnostic..."
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white text-sm sm:text-base h-20"
              />
            </div>
          </div>

          {/* Section 2: Structural Inspection */}
          <div className="bg-amber-50 dark:bg-amber-900 rounded-lg p-4 sm:p-6 space-y-4 border-l-4 border-amber-500">
            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">🔍 SECTION 2: STRUCTURAL & HAZARD INSPECTION</h3>
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200">Goal: Salvage as much as possible, identify all defects.</p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-amber-200 dark:bg-amber-800">
                    <th className="border border-amber-300 dark:border-amber-700 p-2 text-left">Location/Element</th>
                    <th className="border border-amber-300 dark:border-amber-700 p-2 text-left">Condition Found</th>
                    <th className="border border-amber-300 dark:border-amber-700 p-2 text-left">Action Taken</th>
                  </tr>
                </thead>
                <tbody>
                  {report.inspections.map((row, idx) => (
                    <tr key={idx} className="hover:bg-amber-100 dark:hover:bg-amber-800">
                      <td className="border border-amber-300 dark:border-amber-700 p-2">
                        <input
                          type="text"
                          value={row.location}
                          onChange={(e) => handleInspectionChange(idx, 'location', e.target.value)}
                          className="w-full bg-white dark:bg-slate-700 border-none text-slate-900 dark:text-white"
                        />
                      </td>
                      <td className="border border-amber-300 dark:border-amber-700 p-2">
                        <input
                          type="text"
                          value={row.condition}
                          onChange={(e) => handleInspectionChange(idx, 'condition', e.target.value)}
                          className="w-full bg-white dark:bg-slate-700 border-none text-slate-900 dark:text-white"
                          placeholder="E.g., SEVERE ROT on 4 studs"
                        />
                      </td>
                      <td className="border border-amber-300 dark:border-amber-700 p-2">
                        <input
                          type="text"
                          value={row.action}
                          onChange={(e) => handleInspectionChange(idx, 'action', e.target.value)}
                          className="w-full bg-white dark:bg-slate-700 border-none text-slate-900 dark:text-white"
                          placeholder="E.g., Tagged for full replacement"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: Materials & Procurement */}
          <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4 sm:p-6 space-y-4 border-l-4 border-green-500">
            <h3 className="text-lg font-bold text-green-900 dark:text-green-100">📦 SECTION 3: MATERIAL & PROCUREMENT</h3>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">3.1 Salvaged Materials (SAVED for reuse)</label>
              <textarea
                value={report.salvageMaterials}
                onChange={(e) => handleInputChange('salvageMaterials', e.target.value)}
                placeholder="E.g., 100 LF of good condition copper wiring; 1 full interior door and frame (Room #1)"
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white text-sm sm:text-base h-20"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">LUMBER List</label>
              <textarea
                value={report.lumberList}
                onChange={(e) => handleInputChange('lumberList', e.target.value)}
                placeholder="E.g., 18 qty - 2x4x12' SPF; 3 qty - 2x4x16' Pressure Treated"
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white text-sm sm:text-base h-20"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">PLUMBING List</label>
              <textarea
                value={report.plumbingList}
                onChange={(e) => handleInputChange('plumbingList', e.target.value)}
                placeholder="E.g., 1 qty - PEX SharkBite Shower Valve; 20 LF - 3/4 inch PEX tubing"
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white text-sm sm:text-base h-20"
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ELECTRICAL List</label>
              <textarea
                value={report.electricalList}
                onChange={(e) => handleInputChange('electricalList', e.target.value)}
                placeholder="E.g., 500 LF - 14/2 Romex; 4 qty - single-gang metal boxes"
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white text-sm sm:text-base h-20"
              />
            </div>
          </div>

          {/* Section 4: Photos */}
          <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-4 sm:p-6 space-y-4 border-l-4 border-purple-500">
            <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100">📸 SECTION 4: PHOTO PROOF</h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Upload Photos (Damage / Completed Work)</label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="flex-1 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg p-2 text-xs sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={handlePhotoUpload}
                    disabled={!photoInput}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-medium text-xs sm:text-sm"
                  >
                    Add Photo
                  </button>
                </div>
              </div>

              {report.photos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {report.photos.map((photo, idx) => (
                    <div key={idx} className="relative">
                      <img src={photo.url} alt={photo.name} className="w-full h-32 object-cover rounded-lg" />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(idx)}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ✕
                      </button>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">{photo.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              type="submit"
              disabled={isSubmitting || !db}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-bold text-sm sm:text-base transition-all"
            >
              {isSubmitting ? '⏳ ' : '✓ '} {editingId ? 'Update & Submit' : 'Submit Daily Report'}
            </button>
            <button
              type="button"
              onClick={saveDraft}
              disabled={isSubmitting || !db}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-bold text-sm sm:text-base transition-all"
            >
              {isSubmitting ? '⏳' : '💾'} Save as Draft
            </button>
            {editingId && (
              <button
                type="button"
                onClick={cancelEdit}
                disabled={isSubmitting}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-600 hover:to-slate-700 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg font-bold text-sm sm:text-base transition-all"
              >
                ✕ Cancel Edit
              </button>
            )}
          </div>
          </form>
        )}

        {/* View Reports Tab */}
        {tab === 'view' && (
          <div className="space-y-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block">
                  <div className="animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
                </div>
                <p className="mt-4 text-slate-600 dark:text-slate-400">Loading reports...</p>
              </div>
            ) : savedReports.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">📭 No reports yet</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Submit a new daily report to see it here</p>
              </div>
            ) : (
              <div className="space-y-4">
                {savedReports.map((savedReport) => (
                  <details key={savedReport.id} className="bg-slate-50 dark:bg-slate-700 rounded-lg border-2 border-slate-200 dark:border-slate-600 p-4 sm:p-6 cursor-pointer group">
                    <summary className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                      <span>📅 {savedReport.dateOfReport} - {savedReport.hoursWorked}h - {savedReport.locationFocus || 'No location specified'}</span>
                      <div className="flex gap-2 items-center">
                        {savedReport.isDraft && (
                          <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 text-xs font-bold rounded">📝 DRAFT</span>
                        )}
                        {savedReport.approvalStatus === 'submitted' && (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-bold rounded">⏳ SUBMITTED</span>
                        )}
                        {savedReport.approvalStatus === 'approved' && (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-bold rounded">✓ APPROVED</span>
                        )}
                        <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                      </div>
                    </summary>

                    <div className="mt-6 space-y-6">
                      {/* Edit/Delete Actions */}
                      {savedReport.isDraft || savedReport.approvalStatus !== 'approved' ? (
                        <div className="flex gap-2 mb-4">
                          <button
                            onClick={() => startEdit(savedReport)}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-sm transition-all"
                          >
                            ✏️ Edit
                          </button>
                          <button
                            onClick={() => deleteReport(savedReport.id!)}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-bold text-sm transition-all"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      ) : null}

                      {/* Section 1 Summary */}
                      <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4 border-l-4 border-blue-500">
                        <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-3">📌 Daily Progress Summary</h4>
                        <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                          <div>
                            <span className="font-semibold">Scope:</span> {savedReport.scopeOfWork || '—'}
                          </div>
                          <div>
                            <span className="font-semibold">Notes:</span> {savedReport.generalNotes || '—'}
                          </div>
                          <div>
                            <span className="font-semibold">Observations:</span> {savedReport.observations || '—'}
                          </div>
                          <div>
                            <span className="font-semibold">Next Steps:</span> {savedReport.nextSteps || '—'}
                          </div>
                        </div>
                      </div>

                      {/* Section 2 Summary */}
                      {savedReport.inspections && savedReport.inspections.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-900 rounded-lg p-4 border-l-4 border-amber-500">
                          <h4 className="font-bold text-amber-900 dark:text-amber-100 mb-3">🔍 Structural Inspections</h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs sm:text-sm">
                              <thead>
                                <tr className="bg-amber-200 dark:bg-amber-800">
                                  <th className="border border-amber-300 dark:border-amber-700 p-2 text-left">Location</th>
                                  <th className="border border-amber-300 dark:border-amber-700 p-2 text-left">Condition</th>
                                  <th className="border border-amber-300 dark:border-amber-700 p-2 text-left">Action</th>
                                </tr>
                              </thead>
                              <tbody>
                                {savedReport.inspections.map((insp, idx) => (
                                  <tr key={idx} className="hover:bg-amber-100 dark:hover:bg-amber-800">
                                    <td className="border border-amber-300 dark:border-amber-700 p-2">{insp.location || '—'}</td>
                                    <td className="border border-amber-300 dark:border-amber-700 p-2">{insp.condition || '—'}</td>
                                    <td className="border border-amber-300 dark:border-amber-700 p-2">{insp.action || '—'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Section 3 Summary */}
                      {(savedReport.salvageMaterials || savedReport.lumberList || savedReport.plumbingList || savedReport.electricalList) && (
                        <div className="bg-green-50 dark:bg-green-900 rounded-lg p-4 border-l-4 border-green-500">
                          <h4 className="font-bold text-green-900 dark:text-green-100 mb-3">📦 Materials & Procurement</h4>
                          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                            {savedReport.salvageMaterials && (
                              <div>
                                <span className="font-semibold">Salvaged:</span> {savedReport.salvageMaterials}
                              </div>
                            )}
                            {savedReport.lumberList && (
                              <div>
                                <span className="font-semibold">Lumber:</span> {savedReport.lumberList}
                              </div>
                            )}
                            {savedReport.plumbingList && (
                              <div>
                                <span className="font-semibold">Plumbing:</span> {savedReport.plumbingList}
                              </div>
                            )}
                            {savedReport.electricalList && (
                              <div>
                                <span className="font-semibold">Electrical:</span> {savedReport.electricalList}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Section 4 Photos */}
                      {savedReport.photos && savedReport.photos.length > 0 && (
                        <div className="bg-purple-50 dark:bg-purple-900 rounded-lg p-4 border-l-4 border-purple-500">
                          <h4 className="font-bold text-purple-900 dark:text-purple-100 mb-3">📸 Photos ({savedReport.photos.length})</h4>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {savedReport.photos.map((photo, idx) => (
                              <div key={idx}>
                                <img src={photo.url} alt={photo.name} className="w-full h-32 object-cover rounded-lg" />
                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">{photo.name}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DailyReports
