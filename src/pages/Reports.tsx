import React, { useEffect, useState } from 'react'
import { Firestore, addDoc, collection, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type Report = { id?: string; contractor?: string; notes?: string; materials?: string; photoBase64?: string; checklist?: string; createdAt?: number }

function Reports({ db, role }: { db: Firestore | null; role: Role }) {
  const [reports, setReports] = useState<Report[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [contractor, setContractor] = useState('')
  const [notes, setNotes] = useState('')
  const [materials, setMaterials] = useState('')
  const [photo, setPhoto] = useState<string>('')
  const [checklist, setChecklist] = useState('')

  useEffect(() => {
    if (!db) return
    const unsub = onSnapshot(collection(db, 'reports'), s => {
      const list: Report[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setReports(list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)))
    })
    return () => unsub()
  }, [db])

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(String(reader.result || ''))
    reader.readAsDataURL(f)
  }

  const submit = async () => {
    if (!db) return
    if (editingId) {
      await updateDoc(doc(db, 'reports', editingId), {
        contractor,
        notes,
        materials,
        photoBase64: photo,
        checklist,
        updatedAt: Date.now()
      })
      setEditingId(null)
    } else {
      await addDoc(collection(db, 'reports'), {
        contractor,
        notes,
        materials,
        photoBase64: photo,
        checklist,
        createdAt: Date.now()
      })
    }
    setContractor('')
    setNotes('')
    setMaterials('')
    setPhoto('')
    setChecklist('')
    setShowForm(false)
  }

  const handleEdit = (report: Report) => {
    setContractor(report.contractor || '')
    setNotes(report.notes || '')
    setMaterials(report.materials || '')
    setPhoto(report.photoBase64 || '')
    setChecklist(report.checklist || '')
    setEditingId(report.id || null)
    setShowForm(true)
  }

  const handleDelete = async (reportId: string) => {
    if (!db || !window.confirm('Are you sure you want to delete this report?')) return
    await deleteDoc(doc(db, 'reports', reportId))
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingId(null)
    setContractor('')
    setNotes('')
    setMaterials('')
    setPhoto('')
    setChecklist('')
  }

  return (
    <div className="grid gap-8">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Submit Daily Report</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Document site progress with photos and notes</p>
          </div>
          <span className="text-4xl">📋</span>
        </div>
        {!showForm && (
          <button
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95 text-lg"
            onClick={() => setShowForm(true)}
          >
            + New Report
          </button>
        )}
        {showForm && (
          <div className="space-y-5 bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Contractor *</label>
              <input
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all"
                placeholder="Contractor name"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Daily Notes *</label>
              <textarea
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 resize-none placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all"
                placeholder="Daily notes and observations"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Materials</label>
                <input
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all"
                  placeholder="Materials used"
                  value={materials}
                  onChange={(e) => setMaterials(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Checklist</label>
                <input
                  className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all"
                  placeholder="Inspection checklist"
                  value={checklist}
                  onChange={(e) => setChecklist(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={onFile}
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-200 dark:hover:file:bg-blue-800"
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
                onClick={submit}
              >
                {editingId ? 'Update Report' : 'Submit Report'}
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
        <div className="flex items-center gap-2 mb-6">
          <span className="text-3xl">📊</span>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent Reports</h3>
        </div>
        {reports.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-8 text-center text-slate-500 dark:text-slate-400">
            No reports yet
          </div>
        ) : (
          reports.map(r => (
            <div key={r.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 dark:from-slate-700 to-blue-50 dark:to-slate-700 flex items-center justify-between">
                <h4 className="font-semibold text-slate-900 dark:text-white">{r.contractor || 'Unknown'}</h4>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : ''}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(r)}
                      className="px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg font-medium transition-colors text-sm"
                      title="Edit report"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => handleDelete(r.id || '')}
                      className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg font-medium transition-colors text-sm"
                      title="Delete report"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {r.photoBase64 && (
                  <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700">
                    <img src={r.photoBase64} alt="report photo" className="w-full h-64 object-cover" />
                  </div>
                )}
                {r.notes && (
                  <div>
                    <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Notes</p>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{r.notes}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  {r.materials && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Materials</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{r.materials}</p>
                    </div>
                  )}
                  {r.checklist && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Checklist</p>
                      <p className="text-sm text-slate-700 dark:text-slate-300">{r.checklist}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Reports
