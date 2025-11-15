import React, { useEffect, useState } from 'react'
import { Firestore, doc, onSnapshot, updateDoc } from 'firebase/firestore'

function Media({ db }: { db: Firestore | null }) {
  const [links, setLinks] = useState<string[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [newLink, setNewLink] = useState('')

  useEffect(() => {
    if (!db) return
    const unsub = onSnapshot(doc(db, 'media', 'links'), d => {
      const arr = (d.data() as any)?.items || []
      setLinks(Array.isArray(arr) ? arr : [])
    })
    return () => unsub()
  }, [db])

  const handleAddLink = async () => {
    if (!db || !newLink) return
    let updated: string[]
    if (editingIndex !== null) {
      updated = [...links]
      updated[editingIndex] = newLink
      setEditingIndex(null)
    } else {
      updated = [...links, newLink]
    }
    await updateDoc(doc(db, 'media', 'links'), { items: updated })
    setNewLink('')
    setShowForm(false)
  }

  const handleEditLink = (index: number) => {
    setNewLink(links[index])
    setEditingIndex(index)
    setShowForm(true)
  }

  const handleRemoveLink = async (index: number) => {
    if (!db || !window.confirm('Are you sure you want to delete this link?')) return
    const updated = links.filter((_, i) => i !== index)
    await updateDoc(doc(db, 'media', 'links'), { items: updated })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingIndex(null)
    setNewLink('')
  }

  return (
    <div className="grid gap-4 sm:gap-8">
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 sm:mb-6">
          <div>
            <h3 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white">Add Media Link</h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Share project documents and resources</p>
          </div>
          <span className="text-3xl sm:text-4xl flex-shrink-0">🎥</span>
        </div>
        {!showForm && (
          <button
            className="w-full px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-lg hover:shadow-xl hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
            onClick={() => setShowForm(true)}
          >
            + Add Link
          </button>
        )}
        {showForm && (
          <div className="space-y-4 sm:space-y-5 bg-slate-50 dark:bg-slate-700 rounded-lg sm:rounded-xl p-4 sm:p-6">
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Link URL *</label>
              <input
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all text-sm sm:text-base"
                placeholder="https://example.com"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2 sm:pt-4">
              <button
                className="flex-1 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg sm:rounded-xl font-bold text-sm sm:text-base hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
                onClick={handleAddLink}
              >
                {editingIndex !== null ? 'Update Link' : 'Add Link'}
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

      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 dark:from-slate-700 to-blue-50 dark:to-slate-700">
          <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 text-sm sm:text-base">
            <span>📃</span> Media Library
          </h4>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {links.length === 0 ? (
            <div className="p-4 sm:p-6 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">No media links yet</div>
          ) : (
            links.map((l, i) => (
              <div key={i} className="p-4 sm:p-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-4">
                <a
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline break-all flex-1 text-xs sm:text-sm font-medium"
                  href={l}
                  target="_blank"
                  rel="noreferrer"
                >
                  {l}
                </a>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => handleEditLink(i)}
                    className="flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg font-medium transition-colors text-xs sm:text-sm"
                    title="Edit link"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleRemoveLink(i)}
                    className="flex-1 sm:flex-none px-2 sm:px-3 py-1 sm:py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg font-medium transition-colors text-xs sm:text-sm"
                    title="Delete link"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default Media
