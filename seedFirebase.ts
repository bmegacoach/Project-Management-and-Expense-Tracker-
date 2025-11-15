import { initializeApp } from 'firebase/app'
import { getFirestore, collection, addDoc, doc, setDoc } from 'firebase/firestore'

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyALLCpmX9jtAHNVKdCkK53ZG_-Osav4PYI",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "tech-camp-construction-project.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "tech-camp-construction-project",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "tech-camp-construction-project.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "8702531655",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:8702531655:web:fbe635528823cebfb23962"
}

const app = initializeApp(config)
const db = getFirestore(app)

async function seedDatabase() {
  console.log('Starting database seed...')

  try {
    // Seed Tasks
    const tasksData = [
      {
        title: 'Foundation Work',
        phase: 'Phase 1',
        contractor: 'ABC Contractors',
        status: 'pending',
        subtasks: [
          { id: 'sub-1', title: 'Excavation', status: 'pending' },
          { id: 'sub-2', title: 'Concrete Pour', status: 'pending' }
        ]
      },
      {
        title: 'Framing',
        phase: 'Phase 2',
        contractor: 'XYZ Builders',
        status: 'site_completed',
        subtasks: [
          { id: 'sub-3', title: 'Wall Framing', status: 'site_completed' },
          { id: 'sub-4', title: 'Roof Framing', status: 'pm_approved' }
        ]
      },
      {
        title: 'Plumbing Installation',
        phase: 'Phase 3',
        contractor: 'Pro Plumbing',
        status: 'pending',
        subtasks: [
          { id: 'sub-5', title: 'Rough-in', status: 'pending' }
        ]
      },
      {
        title: 'Electrical Wiring',
        phase: 'Phase 3',
        contractor: 'Spark Electric',
        status: 'pending',
        subtasks: [
          { id: 'sub-6', title: 'Panel Installation', status: 'pending' },
          { id: 'sub-7', title: 'Wire Run', status: 'pending' }
        ]
      }
    ]

    for (const task of tasksData) {
      await addDoc(collection(db, 'tasks'), task)
      console.log(`Added task: ${task.title}`)
    }

    // Seed Contractors
    const contractorsData = [
      {
        name: 'ABC Contractors',
        phase: 'Phase 1',
        phone: '555-0101',
        email: 'abc@contractors.com'
      },
      {
        name: 'XYZ Builders',
        phase: 'Phase 2',
        phone: '555-0102',
        email: 'xyz@builders.com'
      },
      {
        name: 'Pro Plumbing',
        phase: 'Phase 3',
        phone: '555-0103',
        email: 'pro@plumbing.com'
      },
      {
        name: 'Spark Electric',
        phase: 'Phase 3',
        phone: '555-0104',
        email: 'spark@electric.com'
      }
    ]

    for (const contractor of contractorsData) {
      await addDoc(collection(db, 'contractors'), contractor)
      console.log(`Added contractor: ${contractor.name}`)
    }

    // Seed Budget
    const budgetData = [
      {
        item: 'Labor - Phase 1',
        phase: 'Phase 1',
        budgeted: 15000,
        spent: 12500,
        category: 'Labor'
      },
      {
        item: 'Materials - Phase 1',
        phase: 'Phase 1',
        budgeted: 25000,
        spent: 20300,
        category: 'Materials'
      },
      {
        item: 'Labor - Phase 2',
        phase: 'Phase 2',
        budgeted: 18000,
        spent: 16800,
        category: 'Labor'
      },
      {
        item: 'Materials - Phase 2',
        phase: 'Phase 2',
        budgeted: 32000,
        spent: 28900,
        category: 'Materials'
      },
      {
        item: 'Equipment Rental',
        phase: 'Phase 1-3',
        budgeted: 8000,
        spent: 5200,
        category: 'Equipment'
      }
    ]

    for (const budget of budgetData) {
      await addDoc(collection(db, 'budget'), budget)
      console.log(`Added budget item: ${budget.item}`)
    }

    // Seed Reports
    const reportsData = [
      {
        date: new Date('2025-11-13').toISOString(),
        phase: 'Phase 1',
        report: 'Foundation completed on schedule. Concrete cured successfully.',
        weather: 'Clear',
        workers: 8
      },
      {
        date: new Date('2025-11-12').toISOString(),
        phase: 'Phase 2',
        report: 'Wall framing 50% complete. No safety incidents.',
        weather: 'Partly cloudy',
        workers: 12
      },
      {
        date: new Date('2025-11-11').toISOString(),
        phase: 'Phase 1',
        report: 'Excavation and site prep finished.',
        weather: 'Sunny',
        workers: 6
      }
    ]

    for (const report of reportsData) {
      await addDoc(collection(db, 'reports'), report)
      console.log(`Added report for ${report.date}`)
    }

    console.log('Database seed completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Error seeding database:', error)
    process.exit(1)
  }
}

seedDatabase()
