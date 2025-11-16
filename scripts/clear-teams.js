import admin from 'firebase-admin'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PHASE_IDS = [
  'phase-1-pre-construction-demolition',
  'phase-2-structural-envelope',
  'phase-3-mep-rough-in',
  'phase-4-interior-finishes-exterior-cladding',
  'phase-5-fixtures-appliances-final-touches'
]

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

// Delete all teams from all phases
const clearAllTeams = async (db) => {
  try {
    console.log('\n🗑️  Clearing all teams from all phases...\n')
    
    let deletedCount = 0

    for (const phaseId of PHASE_IDS) {
      try {
        const teamsRef = db.collection('phases').doc(phaseId).collection('teams')
        const snapshot = await teamsRef.get()

        if (snapshot.empty) {
          console.log(`  ℹ️  ${phaseId}: No teams found`)
          continue
        }

        const batch = db.batch()
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref)
          deletedCount++
        })

        await batch.commit()
        console.log(`  ✓ Deleted ${snapshot.docs.length} teams from ${phaseId}`)
      } catch (error) {
        console.error(`  ✗ Error clearing ${phaseId}:`, error.message)
      }
    }

    console.log(`\n✅ Successfully deleted ${deletedCount} teams from all phases\n`)
  } catch (error) {
    console.error('❌ Clear failed:', error.message)
    throw error
  }
}

// Main execution
const main = async () => {
  console.log('🚀 Clear Teams Script\n')
  
  const db = await initializeFirebase()
  await clearAllTeams(db)
  
  process.exit(0)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
