import React, { useEffect, useState } from 'react'
import { Firestore, collection, onSnapshot, addDoc, serverTimestamp, query as firebaseQuery, orderBy } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

type Message = { role: 'user' | 'assistant'; content: string; timestamp: number }

type DatabaseItem = {
  id: string
  type: 'task' | 'report' | 'contractor' | 'budget' | 'media'
  content: string
  relevanceScore?: number
}

function AskGemini({ db, role }: { db: Firestore | null; role: Role }) {
  const [tasks, setTasks] = useState<any[]>([])
  const [reports, setReports] = useState<any[]>([])
  const [contractors, setContractors] = useState<any[]>([])
  const [budget, setBudget] = useState<any[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)

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
    const u3 = onSnapshot(collection(db, 'contractors'), s => {
      const list: any[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setContractors(list)
    })
    const u4 = onSnapshot(collection(db, 'budget'), s => {
      const list: any[] = []
      s.forEach(d => list.push({ id: d.id, ...(d.data() as any) }))
      setBudget(list)
    })
    
    // Load chat history from database
    const chatQuery = firebaseQuery(collection(db, 'chatHistory'), orderBy('timestamp', 'asc'))
    const u5 = onSnapshot(chatQuery, s => {
      const chatMessages: Message[] = []
      s.forEach(d => {
        const data = d.data() as any
        chatMessages.push({
          role: data.role,
          content: data.content,
          timestamp: data.timestamp?.toMillis?.() || Date.now()
        })
      })
      setMessages(chatMessages)
    })
    
    return () => { u1(); u2(); u3(); u4(); u5() }
  }, [db])

  // Simple semantic similarity using keyword matching
  const calculateRelevance = (text: string, query: string): number => {
    const queryWords = query.toLowerCase().split(/\s+/)
    const textLower = text.toLowerCase()
    let score = 0
    queryWords.forEach(word => {
      if (word.length > 2) {
        const count = (textLower.match(new RegExp(word, 'g')) || []).length
        score += count
      }
    })
    return score
  }

  // Retrieve and rank relevant documents from database
  const retrieveRelevantContext = (userQuery: string): DatabaseItem[] => {
    const allItems: DatabaseItem[] = []

    // Add tasks with relevance scoring
    tasks.forEach(task => {
      const content = `Task: ${task.title || ''} | Contractor: ${task.contractor || ''} | Status: ${task.status || ''} | Description: ${task.description || ''}`
      const score = calculateRelevance(content, userQuery)
      if (score > 0) {
        allItems.push({ id: task.id, type: 'task', content, relevanceScore: score })
      }
    })

    // Add reports with relevance scoring
    reports.forEach(report => {
      const content = `Report: ${report.title || ''} | Date: ${report.date || ''} | Content: ${report.content || ''}`
      const score = calculateRelevance(content, userQuery)
      if (score > 0) {
        allItems.push({ id: report.id, type: 'report', content, relevanceScore: score })
      }
    })

    // Add contractors with relevance scoring
    contractors.forEach(contractor => {
      const content = `Contractor: ${contractor.name || ''} | Trade: ${contractor.trade || ''} | Contact: ${contractor.contact || ''}`
      const score = calculateRelevance(content, userQuery)
      if (score > 0) {
        allItems.push({ id: contractor.id, type: 'contractor', content, relevanceScore: score })
      }
    })

    // Add budget items with relevance scoring
    budget.forEach(item => {
      const content = `Budget Item: ${item.item || ''} | Amount: ${item.amount || ''} | Status: ${item.status || ''}`
      const score = calculateRelevance(content, userQuery)
      if (score > 0) {
        allItems.push({ id: item.id, type: 'budget', content, relevanceScore: score })
      }
    })

    // Sort by relevance and return top 10
    return allItems.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0)).slice(0, 10)
  }

  // Save message to Firestore
  const saveMessageToDb = async (role: 'user' | 'assistant', content: string) => {
    if (!db) return
    try {
      await addDoc(collection(db, 'chatHistory'), {
        role,
        content,
        timestamp: serverTimestamp(),
        userRole: role === 'user' ? role : null
      })
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  const run = async () => {
    if (!query.trim()) return
    
    setLoading(true)
    const userMessage: Message = { role: 'user', content: query, timestamp: Date.now() }
    setMessages(prev => [...prev, userMessage])
    await saveMessageToDb('user', query)
    setQuery('')

    try {
      // Retrieve relevant context from database (RAG)
      const relevantDocs = retrieveRelevantContext(query)

      // Build comprehensive context for the model
      const projectSummary = `Project Status:
- Total Tasks: ${tasks.length}
- Completed Tasks: ${tasks.filter(t => t.status === 'pm_approved').length}
- In Progress: ${tasks.filter(t => t.status === 'waiting_pm_approval').length}
- Not Started: ${tasks.filter(t => t.status === 'not_started').length}
- Daily Reports Submitted: ${reports.length}
- Active Contractors: ${contractors.length}
- Budget Items: ${budget.length}`

      // Build retrieved documents context
      const retrievedContext = relevantDocs.length > 0 
        ? `\nRelevant Information from Database:\n${relevantDocs.map((doc, i) => `${i + 1}. [${doc.type.toUpperCase()}] ${doc.content}`).join('\n')}`
        : '\nNo specific relevant documents found in database.'

      const fullContext = `${projectSummary}${retrievedContext}\n\nUser Role: ${role}\nUser Question: ${query}`

      console.log('Calling llm7.io API with RAG context...')
      console.log('Retrieved documents:', relevantDocs.length)

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
              content: 'You are a helpful construction project assistant. Provide accurate, concise answers based on the project context provided.'
            },
            {
              role: 'user',
              content: fullContext
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
      const aiResponse = data.choices?.[0]?.message?.content || 'No response received from llm7.io'
      const assistantMessage: Message = { role: 'assistant', content: aiResponse, timestamp: Date.now() }
      setMessages(prev => [...prev, assistantMessage])
      await saveMessageToDb('assistant', aiResponse)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      console.error('Error:', errorMsg)
      const errorMessage: Message = { role: 'assistant', content: `❌ Error: ${errorMsg}`, timestamp: Date.now() }
      setMessages(prev => [...prev, errorMessage])
      await saveMessageToDb('assistant', `❌ Error: ${errorMsg}`)
    }
    setLoading(false)
  }

  return (
    <div className="grid grid-cols-1 gap-8 h-[calc(100vh-180px)]">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden flex flex-col">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-8 py-6">
          <h3 className="text-2xl font-bold text-white">Ask Gemini 💬</h3>
          <p className="text-blue-100 text-sm mt-1">Get AI insights about your project</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-center">
              <div>
                <div className="text-5xl mb-4">🤖</div>
                <p className="text-slate-500 dark:text-slate-400 font-medium">Ask me anything about your construction project</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">Tasks, reports, timeline, progress, and more</p>
              </div>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
                <div className={`max-w-2xl px-4 py-3 rounded-xl ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-bl-none'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <span className="text-xs opacity-70 mt-1 block">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-100 dark:bg-slate-700 text-slate-900 dark:text-slate-100 px-4 py-3 rounded-xl rounded-bl-none">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 dark:border-slate-700 p-6 bg-slate-50 dark:bg-slate-900">
          <div className="flex gap-3">
            <input
              className="flex-1 border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-20 focus:border-blue-500 placeholder-slate-400 dark:placeholder-slate-500 font-medium"
              placeholder="Ask about tasks, reports, progress..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !loading && run()}
              disabled={loading}
            />
            <button
              onClick={run}
              disabled={loading || !query.trim()}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-slate-400 disabled:to-slate-500 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-blue-200 dark:hover:shadow-blue-900 transition-all active:scale-95 disabled:cursor-not-allowed"
            >
              {loading ? '⏳' : '📤'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AskGemini
