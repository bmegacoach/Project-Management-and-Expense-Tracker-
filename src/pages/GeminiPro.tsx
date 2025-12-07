import React, { useEffect, useState } from 'react'
import { Firestore, collection, onSnapshot } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

function GeminiPro({ db, role }: { db: Firestore | null; role: Role }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedTool, setSelectedTool] = useState('')

  useEffect(() => {
    if (!db) return
    const u1 = onSnapshot(collection(db, 'tasks'), s => {
      const list: any[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setTasks(list)
    })
    const u2 = onSnapshot(collection(db, 'reports'), s => {
      const list: any[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setReports(list)
    })
    return () => { u1(); u2() }
  }, [db])

  const runTool = async (toolType: string) => {
    setLoading(true)
    setSelectedTool(toolType)
    setOutput('')

    try {
      let prompt = ''
      if (toolType === 'reminders') {
        const overdue = tasks.filter(t => t.status !== 'pm_approved')
        prompt = `Generate 3-4 professional contractor reminder messages for these overdue tasks:\n${JSON.stringify(overdue.slice(0, 5).map(t => ({ contractor: t.contractor || 'Unknown', title: t.title || t.id })), null, 2)}\n\nMake them professional, courteous, and action-oriented.`
      } else if (toolType === 'update') {
        const approved = tasks.filter(t => t.status === 'pm_approved').length
        const total = tasks.length
        prompt = `Write a professional 2-3 paragraph stakeholder update email for a construction project with the following progress:\n- ${approved}/${total} tasks approved (${Math.round((approved/total)*100)}% complete)\n- ${reports.length} daily reports submitted\n- Make it positive, professional, and include next steps.`
      } else if (toolType === 'risk') {
        const pending = tasks.filter(t => t.status !== 'pm_approved')
        const total = tasks.length
        const percentage = total > 0 ? Math.round((pending.length/total)*100) : 0
        prompt = `Analyze schedule risks for a construction project where ${pending.length}/${total} tasks are not yet approved (${percentage}% remaining). Provide:\n1. Risk assessment\n2. Potential impacts\n3. 3-4 mitigation strategies`
      }

      console.log('Calling llm7.io API...')

      const response = await fetch('https://api.llm7.io/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer key_8cb5f234fa88aa70b63ef949'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful construction project assistant.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2048
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(`llm7.io API error: ${error.error?.message || response.statusText}`)
      }

      const data = await response.json()
      const result = data.choices?.[0]?.message?.content || 'No response received'
      setOutput(result)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error:', errorMsg)
      setOutput(`❌ Error: ${errorMsg}`)
    }
    setLoading(false)
  }

  const tools = [
    { key: 'reminders', label: 'Contractor Reminders', icon: '📧', color: 'from-orange-600 to-orange-700' },
    { key: 'update', label: 'Stakeholder Update', icon: '📊', color: 'from-purple-600 to-purple-700' },
    { key: 'risk', label: 'Risk Analysis', icon: '⚠️', color: 'from-red-600 to-red-700' }
  ]

  return (
    <div className="grid gap-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tools.map(tool => (
          <button
            key={tool.key}
            onClick={() => runTool(tool.key)}
            disabled={loading}
            className={`bg-gradient-to-br ${tool.color} rounded-2xl p-8 text-white hover:shadow-xl hover:shadow-slate-400 dark:hover:shadow-slate-900 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed group`}
          >
            <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">{tool.icon}</div>
            <h3 className="font-bold text-lg">{tool.label}</h3>
            <p className="text-sm opacity-90 mt-2">Generate professional {tool.label.toLowerCase()}</p>
          </button>
        ))}
      </div>

      {output && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-slate-100 dark:from-slate-700 to-slate-50 dark:to-slate-800 px-8 py-6 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {tools.find(t => t.key === selectedTool)?.label}
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">AI-generated content</p>
            </div>
            <span className="text-4xl">{tools.find(t => t.key === selectedTool)?.icon}</span>
          </div>
          <div className="p-8">
            <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-6 text-slate-900 dark:text-slate-100 whitespace-pre-wrap text-sm leading-relaxed font-medium border border-slate-200 dark:border-slate-700">
              {output}
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(output)
                alert('Copied to clipboard!')
              }}
              className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all active:scale-95"
            >
              📋 Copy to Clipboard
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-8 flex items-center justify-center gap-4">
          <div className="flex gap-2">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
          <span className="text-slate-700 dark:text-slate-300 font-bold">Generating content...</span>
        </div>
      )}
    </div>
  )
}

export default GeminiPro
