import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Phase ID mapping (must match Tasks.tsx)
const phaseNameToId = {
  'Phase 1: Pre-Construction & Demolition': 'phase-1-pre-construction-demolition',
  'Phase 2: Structural & Envelope': 'phase-2-structural-envelope',
  'Phase 3: MEP Rough-in': 'phase-3-mep-rough-in',
  'Phase 4: Interior Finishes & Exterior Cladding': 'phase-4-interior-finishes-exterior-cladding',
  'Phase 5: Fixtures, Appliances & Final Touches': 'phase-5-fixtures-appliances-final-touches'
}

// Initialize Firebase
const initializeFirebase = async () => {
  try {
    let serviceAccount
    const serviceAccountPath1 = path.join(__dirname, 'service-account.json')
    const serviceAccountPath2 = path.join(__dirname, 'service_account.json')

    if (fs.existsSync(serviceAccountPath1)) {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath1, 'utf8'))
    } else if (fs.existsSync(serviceAccountPath2)) {
      serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath2, 'utf8'))
    } else {
      throw new Error('Service account file not found')
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    })

    console.log('✅ Firebase Admin SDK initialized')
    return admin.firestore()
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message)
    process.exit(1)
  }
}

// Load contractors from JSON
const loadContractorsFromJSON = async () => {
  try {
    const contractorsPath = path.join(__dirname, 'contractors_data.json')
    const data = JSON.parse(fs.readFileSync(contractorsPath, 'utf8'))
    
    // Map phase data to use phaseId
    const phases = data.phases.map(phase => {
      let phaseId
      
      switch(phase.phaseNumber) {
        case 1:
          phaseId = 'phase-1-pre-construction-demolition'
          break
        case 2:
          phaseId = 'phase-2-structural-envelope'
          break
        case 3:
          phaseId = 'phase-3-mep-rough-in'
          break
        case 4:
          phaseId = 'phase-4-interior-finishes-exterior-cladding'
          break
        case 5:
          phaseId = 'phase-5-fixtures-appliances-final-touches'
          break
        default:
          phaseId = null
      }
      
      return {
        phaseId,
        phaseName: phase.phaseName,
        teams: phase.teams
      }
    }).filter(p => p.phaseId)
    
    console.log(`✅ Loaded ${data.phases.length} phases from contractors_data.json`)
    return phases
  } catch (error) {
    console.error('❌ Error loading contractors_data.json:', error.message)
    process.exit(1)
  }
}

// Sanitize ID function
const sanitizeId = (text) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

// Migrate contractors with hierarchy
const migrateContractorsWithHierarchy = async (db, phases) => {
  try {
    console.log('\n🔄 Starting hierarchical migration: Phase → Teams → Tasks...\n')
    
    let totalTeams = 0
    let totalTasks = 0
    let totalSubTasks = 0

    for (const phase of phases) {
      const phaseId = phase.phaseId
      const phaseName = phase.phaseName

      console.log(`📍 ${phaseName}`)

      for (const team of phase.teams) {
        try {
          const teamId = team.teamId || team.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
          
          const teamData = {
            name: team.name,
            description: team.description || '',
            phone: team.phone || '',
            email: team.email || '',
            tasks: team.tasks || [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }

          // Store under phases/{phaseId}/teams/{teamId}
          await db
            .collection('phases')
            .doc(phaseId)
            .collection('teams')
            .doc(teamId)
            .set(teamData)
          
          const taskCount = team.tasks?.length || 0
          const subTaskCount = team.tasks?.reduce((sum, task) => sum + (task.subTasks?.length || 0), 0) || 0
          
          totalTasks += taskCount
          totalSubTasks += subTaskCount
          totalTeams++

          console.log(`  ✓ ${team.name} (${taskCount} tasks, ${subTaskCount} sub-tasks)`)
        } catch (error) {
          console.error(`  ✗ Error migrating team ${team.name}:`, error.message)
        }
      }
    }

    console.log(`\n✅ Successfully migrated all data:`)
    console.log(`   Total phases: ${phases.length}`)
    console.log(`   Total teams: ${totalTeams}`)
    console.log(`   Total tasks: ${totalTasks}`)
    console.log(`   Total sub-tasks: ${totalSubTasks}`)
  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    throw error
  }
}

// Main execution
const main = async () => {
  console.log('🚀 Hierarchical Migration: Phase → Teams → Tasks\n')
  
  const db = await initializeFirebase()
  const phases = await loadContractorsFromJSON()
  
  await migrateContractorsWithHierarchy(db, phases)

  console.log('\n📋 Database Structure:')
  console.log('   phases/')
  console.log('   ├── {phaseId}/')
  console.log('   │   └── teams/')
  console.log('   │       └── {teamId}/')
  console.log('   │           ├── name')
  console.log('   │           ├── description')
  console.log('   │           ├── phone')
  console.log('   │           ├── email')
  console.log('   │           └── tasks[]')
  console.log('\n✅ All data has been successfully migrated to Firestore!\n')
  
  process.exit(0)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
