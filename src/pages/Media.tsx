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
    <div className="grid gap-8">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Add Media Link</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Share project documents and resources</p>
          </div>
          <span className="text-4xl">🎥</span>
        </div>
        {!showForm && (
          <button
            className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold hover:shadow-xl hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95 text-lg"
            onClick={() => setShowForm(true)}
          >
            + Add Link
          </button>
        )}
        {showForm && (
          <div className="space-y-5 bg-slate-50 dark:bg-slate-700 rounded-xl p-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Link URL *</label>
              <input
                className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-30 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-400 font-medium transition-all"
                placeholder="https://example.com"
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95"
                onClick={handleAddLink}
              >
                {editingIndex !== null ? 'Update Link' : 'Add Link'}
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

      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 dark:from-slate-700 to-blue-50 dark:to-slate-700">
          <h4 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span>📃</span> Media Library
          </h4>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-700">
          {links.length === 0 ? (
            <div className="p-6 text-center text-slate-500 dark:text-slate-400">No media links yet</div>
          ) : (
            links.map((l, i) => (
              <div key={i} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between gap-4">
                <a
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline break-all flex-1 text-sm font-medium"
                  href={l}
                  target="_blank"
                  rel="noreferrer"
                >
                  {l}
                </a>
                <div className="flex gap-2 whitespace-nowrap">
                  <button
                    onClick={() => handleEditLink(i)}
                    className="px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900 rounded-lg font-medium transition-colors text-sm"
                    title="Edit link"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleRemoveLink(i)}
                    className="px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg font-medium transition-colors text-sm"
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
