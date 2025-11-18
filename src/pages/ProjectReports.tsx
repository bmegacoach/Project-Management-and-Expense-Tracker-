import React, { useEffect, useState } from 'react'
import { Firestore, collection, getDocs, doc, getDoc } from 'firebase/firestore'

type Role = 'site_manager' | 'project_manager' | 'portfolio_manager'

interface ProjectReport {
  projectName: string
  projectAddress: string
  reportDate: string
  generatedAt: string
  sections: {
    financialSummary: FinancialSection
    progressReport: ProgressSection
    riskAssessment: RiskSection
    teamPerformance: TeamSection
  }
}

interface FinancialSection {
  totalBudget: number
  totalSpent: number
  percentageUsed: number
  remainingBudget: number
  expensesByCategory: Record<string, number>
  upcomingBills: number
}

interface ProgressSection {
  overallProgress: number
  phaseProgress: Record<string, number>
  tasksCompleted: number
  tasksRemaining: number
  completionTimeline: string
}

interface RiskSection {
  highRiskItems: Array<{ item: string; impact: string; mitigation: string }>
  mediumRiskItems: Array<{ item: string; impact: string; mitigation: string }>
  schedule: string
  budget: string
}

interface TeamSection {
  averagePerformance: number
  topPerformers: string[]
  requiresTraining: string[]
  teamUtilization: number
  turnoverRisk: string
}

function ProjectReports({ db, role }: { db: Firestore | null; role: Role }) {
  const [report, setReport] = useState<ProjectReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'json'>('pdf')
  const [reportType, setReportType] = useState<'executive' | 'detailed' | 'financial'>('executive')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }

    const loadProjectData = async () => {
      try {
        // Get project config
        const configDoc = await getDoc(doc(db, 'config', 'prd'))
        const configData = configDoc.data() || {}

        // Get budget allocations
        const budgetSnap = await getDocs(collection(db, 'budgetAllocations'))
        let totalBudget = 0
        let totalSpent = 0
        const expensesByCategory: Record<string, number> = {}

        budgetSnap.forEach(doc => {
          const data = doc.data()
          totalBudget += data.allocated || 0
          totalSpent += data.spent || 0
          expensesByCategory[data.category] = (expensesByCategory[data.category] || 0) + (data.spent || 0)
        })

        // Get expenses
        const expensesSnap = await getDocs(collection(db, 'expenses'))
        let expenseCount = 0
        let approvedExpenses = 0

        expensesSnap.forEach(doc => {
          expenseCount++
          if (doc.data().status === 'approved') approvedExpenses++
        })

        // Create sample report (in production, this would aggregate real data)
        const mockReport: ProjectReport = {
          projectName: configData.PROJECT_NAME || 'RED CARPET CONTRACTORS Project',
          projectAddress: configData.PROPERTY_ADDRESS || '4821 Briscoe St & 4829 Briscoe St, Houston, TX 77033',
          reportDate: new Date().toISOString().split('T')[0],
          generatedAt: new Date().toLocaleString(),
          sections: {
            financialSummary: {
              totalBudget,
              totalSpent,
              percentageUsed: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0,
              remainingBudget: totalBudget - totalSpent,
              expensesByCategory,
              upcomingBills: Math.round(totalBudget * 0.15)
            },
            progressReport: {
              overallProgress: 65,
              phaseProgress: {
                'Phase 1': 100,
                'Phase 2': 85,
                'Phase 3': 60,
                'Phase 4': 40,
                'Phase 5': 5
              },
              tasksCompleted: 125,
              tasksRemaining: 67,
              completionTimeline: 'On Track'
            },
            riskAssessment: {
              highRiskItems: [
                { item: 'Supply Chain Delays', impact: 'Could delay Phase 3 completion by 2 weeks', mitigation: 'Identify alternative suppliers' },
                { item: 'Weather-Related Delays', impact: 'Outdoor work may be affected', mitigation: 'Maintain flexible scheduling' }
              ],
              mediumRiskItems: [
                { item: 'Labor Availability', impact: 'Could impact productivity', mitigation: 'Build relationships with local contractors' },
                { item: 'Permit Approval', impact: 'May slow down Phase 2', mitigation: 'Expedite permits with city' }
              ],
              schedule: 'On Track - All major milestones met to date',
              budget: 'Healthy - Current spending at 68% of allocated budget'
            },
            teamPerformance: {
              averagePerformance: 4.2,
              topPerformers: ['Team Alpha', 'Team Bravo'],
              requiresTraining: ['Safety Protocols', 'Equipment Operation'],
              teamUtilization: 85,
              turnoverRisk: 'Low'
            }
          }
        }

        setReport(mockReport)
      } catch (error) {
        console.error('Error loading project data:', error)
        setMessage({ type: 'error', text: 'Failed to load project data' })
      }
      setLoading(false)
    }

    loadProjectData()
  }, [db])

  const exportReport = () => {
    if (!report) return

    try {
      if (exportFormat === 'json') {
        const dataStr = JSON.stringify(report, null, 2)
        const element = document.createElement('a')
        element.setAttribute('href', 'data:text/json;charset=utf-8,' + encodeURIComponent(dataStr))
        element.setAttribute('download', `project-report-${report.reportDate}.json`)
        element.style.display = 'none'
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
        setMessage({ type: 'success', text: `Report exported as JSON` })
      } else if (exportFormat === 'csv') {
        let csv = 'Project Report\n'
        csv += `Project,${report.projectName}\n`
        csv += `Address,${report.projectAddress}\n`
        csv += `Report Date,${report.reportDate}\n\n`
        csv += 'Financial Summary\n'
        csv += `Total Budget,${report.sections.financialSummary.totalBudget}\n`
        csv += `Total Spent,${report.sections.financialSummary.totalSpent}\n`
        csv += `Percentage Used,${report.sections.financialSummary.percentageUsed}%\n`

        const element = document.createElement('a')
        element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv))
        element.setAttribute('download', `project-report-${report.reportDate}.csv`)
        element.style.display = 'none'
        document.body.appendChild(element)
        element.click()
        document.body.removeChild(element)
        setMessage({ type: 'success', text: 'Report exported as CSV' })
      } else {
        // PDF export - simplified (would require html2pdf library in production)
        setMessage({ type: 'success', text: 'PDF export feature coming soon - Use JSON export for now' })
      }
    } catch (error) {
      console.error('Export error:', error)
      setMessage({ type: 'error', text: 'Failed to export report' })
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="text-center py-12">
          <div className="inline-block animate-spin h-12 w-12 border-4 border-blue-600 border-t-transparent rounded-full"></div>
          <p className="mt-4 text-slate-600 dark:text-slate-400">Generating report...</p>
        </div>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-slate-50 dark:bg-slate-700 p-12 rounded-lg text-center">
          <p className="text-lg font-semibold text-slate-700 dark:text-slate-300">No data available</p>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Project data is needed to generate reports</p>
        </div>
      </div>
    )
  }

  const financialData = report.sections.financialSummary
  const progressData = report.sections.progressReport
  const riskData = report.sections.riskAssessment
  const teamData = report.sections.teamPerformance

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 rounded-lg sm:rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-lg p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">📄 Project Reports</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Generate and export comprehensive project documentation</p>
          </div>
          <span className="text-4xl">📑</span>
        </div>

        {message && (
          <div
            className={`p-4 rounded-lg border-2 mb-6 ${
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

      {/* Report Info */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900 dark:to-purple-900 rounded-lg border-2 border-slate-200 dark:border-slate-700 p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">PROJECT</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{report.projectName}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">{report.projectAddress}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-1">REPORT GENERATED</p>
            <p className="text-lg font-bold text-slate-900 dark:text-white">{report.generatedAt}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-2">Report Date: {report.reportDate}</p>
          </div>
        </div>
      </div>

      {/* Export Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">📤 Export Options</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white font-semibold"
            >
              <option value="executive">Executive Summary</option>
              <option value="detailed">Detailed Report</option>
              <option value="financial">Financial Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Export Format</label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as any)}
              className="w-full border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-600 rounded-lg px-4 py-2 text-slate-900 dark:text-white font-semibold"
            >
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF (Coming Soon)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={exportReport}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all"
            >
              ⬇️ Export Report
            </button>
          </div>
        </div>
      </div>

      {/* Financial Summary */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">💰 Financial Summary</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900 dark:to-blue-800 rounded-lg p-4">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Total Budget</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              ${(financialData.totalBudget / 1000).toFixed(1)}K
            </p>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900 dark:to-orange-800 rounded-lg p-4">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Spent</p>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              ${(financialData.totalSpent / 1000).toFixed(1)}K
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{financialData.percentageUsed}%</p>
          </div>

          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900 dark:to-green-800 rounded-lg p-4">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Remaining</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              ${(financialData.remainingBudget / 1000).toFixed(1)}K
            </p>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900 dark:to-purple-800 rounded-lg p-4">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">Upcoming Bills</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              ${(financialData.upcomingBills / 1000).toFixed(1)}K
            </p>
          </div>
        </div>

        {Object.entries(financialData.expensesByCategory)
          .filter(([_, amount]) => amount > 0)
          .sort(([_, a], [__, b]) => b - a)
          .map(([category, amount]) => (
            <div key={category} className="mb-4 pb-4 border-b border-slate-200 dark:border-slate-700 last:border-b-0 last:pb-0 last:mb-0">
              <div className="flex justify-between mb-2">
                <span className="font-semibold text-slate-900 dark:text-white">{category}</span>
                <span className="font-bold text-slate-900 dark:text-white">${(amount / 1000).toFixed(1)}K</span>
              </div>
            </div>
          ))}
      </div>

      {/* Progress Report */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">📊 Progress Report</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{progressData.overallProgress}%</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">Overall Progress</p>
          </div>

          <div className="text-center">
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">{progressData.tasksCompleted}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">Completed Tasks</p>
          </div>

          <div className="text-center">
            <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{progressData.tasksRemaining}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">Remaining Tasks</p>
          </div>

          <div className="text-center">
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{progressData.completionTimeline}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">Timeline Status</p>
          </div>
        </div>

        <div className="space-y-4">
          {Object.entries(progressData.phaseProgress).map(([phase, percentage]) => (
            <div key={phase}>
              <div className="flex justify-between mb-2">
                <span className="font-semibold text-slate-900 dark:text-white">{phase}</span>
                <span className="font-bold text-slate-900 dark:text-white">{percentage}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-600"
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Risk Assessment */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">⚠️ Risk Assessment</h3>

        <div className="mb-6">
          <h4 className="font-bold text-slate-900 dark:text-white mb-4">High Risk Items</h4>
          <div className="space-y-4">
            {riskData.highRiskItems.map((item, idx) => (
              <div key={idx} className="bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-lg p-4">
                <p className="font-bold text-slate-900 dark:text-white">{item.item}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-2"><strong>Impact:</strong> {item.impact}</p>
                <p className="text-sm text-slate-700 dark:text-slate-300"><strong>Mitigation:</strong> {item.mitigation}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
            <p className="font-bold text-slate-900 dark:text-white mb-2">Schedule Risk</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{riskData.schedule}</p>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900 rounded-lg p-4">
            <p className="font-bold text-slate-900 dark:text-white mb-2">Budget Risk</p>
            <p className="text-sm text-slate-700 dark:text-slate-300">{riskData.budget}</p>
          </div>
        </div>
      </div>

      {/* Team Performance */}
      <div className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 shadow-lg p-6">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">👥 Team Performance</h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="text-center">
            <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">{teamData.averagePerformance.toFixed(1)}/5</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">Avg Performance</p>
          </div>

          <div className="text-center">
            <p className="text-4xl font-bold text-green-600 dark:text-green-400">{teamData.topPerformers.length}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">Top Performers</p>
          </div>

          <div className="text-center">
            <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">{teamData.requiresTraining.length}</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">Training Needs</p>
          </div>

          <div className="text-center">
            <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{teamData.teamUtilization}%</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-semibold mt-2">Utilization</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="font-bold text-slate-900 dark:text-white mb-3">✅ Top Performers</p>
            <ul className="space-y-2">
              {teamData.topPerformers.map((team, idx) => (
                <li key={idx} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span className="text-green-600">★</span> {team}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-bold text-slate-900 dark:text-white mb-3">📚 Training Needs</p>
            <ul className="space-y-2">
              {teamData.requiresTraining.map((training, idx) => (
                <li key={idx} className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                  <span className="text-yellow-600">•</span> {training}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProjectReports
