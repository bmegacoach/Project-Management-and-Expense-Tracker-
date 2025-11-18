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

// Clear all contractors from all phases
const clearAllContractors = async (db) => {
  try {
    console.log('\n🧹 Clearing all contractors from database...')
    
    for (const phaseId of PHASE_IDS) {
      const contractorsRef = db.collection('phases').doc(phaseId).collection('contractors')
      const snapshot = await contractorsRef.get()
      
      if (!snapshot.empty) {
        const batch = db.batch()
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref)
        })
        await batch.commit()
        console.log(`  ✓ Cleared contractors in ${phaseId} (${snapshot.size} deleted)`)
      } else {
        console.log(`  ℹ️  No contractors in ${phaseId}`)
      }
    }

    console.log('\n✅ All contractors cleared successfully!')
  } catch (error) {
    console.error('❌ Error clearing contractors:', error.message)
    throw error
  }
}

// Main execution
const main = async () => {
  console.log('🚀 Clear All Contractors Script\n')
  
  const db = await initializeFirebase()
  await clearAllContractors(db)
  
  process.exit(0)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
