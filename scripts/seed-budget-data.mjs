#!/usr/bin/env node

/**
 * Seed Budget Data Script
 * Populates Firebase with sample budget line items for the project
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check for Firebase service account
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || 
  './firebase-service-account.json';

let db;

try {
  // Try to initialize with service account
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  
  db = admin.firestore();
  console.log('✅ Firebase initialized with service account\n');
} catch (error) {
  console.error('❌ Firebase initialization failed');
  console.error('Please ensure FIREBASE_SERVICE_ACCOUNT_PATH is set or firebase-service-account.json exists');
  console.error('\nTo use this script:');
  console.error('1. Download your Firebase service account JSON from Firebase Console');
  console.error('2. Save it as: firebase-service-account.json');
  console.error('3. Or set FIREBASE_SERVICE_ACCOUNT_PATH environment variable');
  process.exit(1);
}

// Sample budget data based on the project phases
const budgetData = [
  // Phase 1: Pre-Construction & Demolition
  {
    name: 'Permits & Inspections',
    phase: 'Phase 1: Pre-Construction & Demolition',
    value: 5000,
    spent: 0,
    status: 1,
    owner: 'Project Manager',
    dueDate: '2025-01-15',
    notes: 'Rehab permit and pre-demo inspection'
  },
  {
    name: 'Mobile Home Setup & Temporary Facilities',
    phase: 'Phase 1: Pre-Construction & Demolition',
    value: 8500,
    spent: 2000,
    status: 2,
    owner: 'Site Manager',
    dueDate: '2025-01-20',
    notes: 'Mobile home, water/power, bunk beds'
  },
  {
    name: 'Site Security System Installation',
    phase: 'Phase 1: Pre-Construction & Demolition',
    value: 3200,
    spent: 3200,
    status: 4,
    owner: 'Safety Officer',
    dueDate: '2025-01-10',
    notes: 'Cameras and 24/7 monitoring service'
  },
  {
    name: 'Site Logistics (Container/Dumpster)',
    phase: 'Phase 1: Pre-Construction & Demolition',
    value: 2500,
    spent: 1250,
    status: 2,
    owner: 'Site Manager',
    dueDate: '2025-01-25',
    notes: 'Secured storage and debris removal'
  },
  {
    name: 'Selective Demolition',
    phase: 'Phase 1: Pre-Construction & Demolition',
    value: 18000,
    spent: 0,
    status: 1,
    owner: 'Demolition Crew Lead',
    dueDate: '2025-02-15',
    notes: 'Roof, walls, mechanical systems, debris management'
  },

  // Phase 2: Structural & Envelope
  {
    name: 'Foundation Repair & Addition',
    phase: 'Phase 2: Structural & Envelope',
    value: 22000,
    spent: 0,
    status: 1,
    owner: 'Foundation Contractor',
    dueDate: '2025-03-15',
    notes: '1000 sq ft addition slab integration'
  },
  {
    name: 'Framing Labor (11ft Ceilings)',
    phase: 'Phase 2: Structural & Envelope',
    value: 16500,
    spent: 0,
    status: 1,
    owner: 'Framing Lead',
    dueDate: '2025-04-10',
    notes: 'Addition, relocated walls, partitions'
  },
  {
    name: 'Roofing Installation',
    phase: 'Phase 2: Structural & Envelope',
    value: 9800,
    spent: 0,
    status: 1,
    owner: 'Roofing Contractor',
    dueDate: '2025-04-20',
    notes: 'Light asphalt shingles, gutters'
  },
  {
    name: 'Windows & Exterior Doors',
    phase: 'Phase 2: Structural & Envelope',
    value: 8200,
    spent: 0,
    status: 1,
    owner: 'Envelope Crew',
    dueDate: '2025-04-25',
    notes: 'Energy-efficient windows and doors'
  },
  {
    name: 'Exterior Sheathing & Weather Barrier',
    phase: 'Phase 2: Structural & Envelope',
    value: 5400,
    spent: 0,
    status: 1,
    owner: 'Envelope Crew',
    dueDate: '2025-05-05',
    notes: 'WRB installation'
  },
  {
    name: 'Hardi Plank Siding (Material Procurement)',
    phase: 'Phase 2: Structural & Envelope',
    value: 6800,
    spent: 6800,
    status: 4,
    owner: 'Materials Manager',
    dueDate: '2025-02-01',
    notes: 'Ordered and in secured storage'
  },

  // Phase 3: MEP Rough-in
  {
    name: 'HVAC Rough-in & Equipment',
    phase: 'Phase 3: MEP Rough-in',
    value: 14000,
    spent: 0,
    status: 1,
    owner: 'MEP Specialist',
    dueDate: '2025-05-20',
    notes: 'Ductwork, units, refrigerant lines'
  },
  {
    name: 'Plumbing Rough-in',
    phase: 'Phase 3: MEP Rough-in',
    value: 12500,
    spent: 0,
    status: 1,
    owner: 'Plumber',
    dueDate: '2025-05-20',
    notes: 'Water supply, DWV, water heater'
  },
  {
    name: 'Electrical Rough-in',
    phase: 'Phase 3: MEP Rough-in',
    value: 11200,
    spent: 0,
    status: 1,
    owner: 'Electrician',
    dueDate: '2025-05-20',
    notes: 'Panel, wiring, outlets/switches'
  },
  {
    name: 'Insulation Installation',
    phase: 'Phase 3: MEP Rough-in',
    value: 7800,
    spent: 0,
    status: 1,
    owner: 'Interior Crew',
    dueDate: '2025-05-25',
    notes: 'Exterior walls and ceilings'
  },
  {
    name: 'MEP Rough-in Inspections',
    phase: 'Phase 3: MEP Rough-in',
    value: 2000,
    spent: 0,
    status: 1,
    owner: 'Project Manager',
    dueDate: '2025-06-01',
    notes: 'Structural, electrical, plumbing, HVAC inspections'
  },

  // Phase 4: Interior Finishes & Exterior Cladding
  {
    name: 'Drywall Installation & Finishing',
    phase: 'Phase 4: Interior Finishes & Exterior Cladding',
    value: 13500,
    spent: 0,
    status: 1,
    owner: 'Drywall Crew',
    dueDate: '2025-06-25',
    notes: 'Level 4/5 finish, 11ft ceilings'
  },
  {
    name: 'Interior Painting',
    phase: 'Phase 4: Interior Finishes & Exterior Cladding',
    value: 9200,
    spent: 0,
    status: 1,
    owner: 'Painter',
    dueDate: '2025-07-10',
    notes: 'Low-VOC, durable finish'
  },
  {
    name: 'Flooring Installation (Concrete & LVT)',
    phase: 'Phase 4: Interior Finishes & Exterior Cladding',
    value: 11000,
    spent: 0,
    status: 1,
    owner: 'Flooring Contractor',
    dueDate: '2025-07-15',
    notes: 'Polished concrete + LVT in baths/kitchen'
  },
  {
    name: 'Cabinetry & Countertops',
    phase: 'Phase 4: Interior Finishes & Exterior Cladding',
    value: 8500,
    spent: 0,
    status: 1,
    owner: 'Cabinet Installer',
    dueDate: '2025-07-20',
    notes: 'Kitchen and bathroom vanities'
  },
  {
    name: 'Interior Doors & Trim',
    phase: 'Phase 4: Interior Finishes & Exterior Cladding',
    value: 6800,
    spent: 0,
    status: 1,
    owner: 'Interior Crew',
    dueDate: '2025-07-25',
    notes: 'All doors, hardware, and trim'
  },
  {
    name: 'Exterior Siding Installation (Hardi Plank)',
    phase: 'Phase 4: Interior Finishes & Exterior Cladding',
    value: 9500,
    spent: 0,
    status: 1,
    owner: 'Envelope Crew',
    dueDate: '2025-08-10',
    notes: 'Install, caulk, and paint'
  },

  // Phase 5: Fixtures, Appliances & Final Touches
  {
    name: 'Finish Electrical (Fixtures & Appliances)',
    phase: 'Phase 5: Fixtures, Appliances & Final Touches',
    value: 7500,
    spent: 0,
    status: 1,
    owner: 'Electrician',
    dueDate: '2025-08-20',
    notes: 'Light fixtures, outlets, appliances'
  },
  {
    name: 'Finish Plumbing (Fixtures & Hardware)',
    phase: 'Phase 5: Fixtures, Appliances & Final Touches',
    value: 6800,
    spent: 0,
    status: 1,
    owner: 'Plumber',
    dueDate: '2025-08-20',
    notes: 'Toilets, sinks, faucets, showers'
  },
  {
    name: 'Final Cleaning & Preparation',
    phase: 'Phase 5: Fixtures, Appliances & Final Touches',
    value: 3500,
    spent: 0,
    status: 1,
    owner: 'Cleaning Crew',
    dueDate: '2025-09-01',
    notes: 'Interior, exterior, and window cleaning'
  },
  {
    name: 'Final Inspections & Certificate of Occupancy',
    phase: 'Phase 5: Fixtures, Appliances & Final Touches',
    value: 1500,
    spent: 0,
    status: 1,
    owner: 'Project Manager',
    dueDate: '2025-09-05',
    notes: 'Final walk-through and CO obtention'
  }
];

async function seedBudgetData() {
  try {
    console.log('🌱 Seeding budget data into Firebase...\n');

    // Check if data already exists
    const existing = await db.collection('budgetLineItems').limit(1).get();
    
    if (!existing.empty) {
      console.log('⚠️  Budget data already exists in Firebase.');
      console.log('Delete existing data first if you want to reseed.\n');
      console.log('Existing items:');
      existing.forEach(doc => {
        console.log(`  - ${doc.data().name}`);
      });
      await admin.app().delete();
      return;
    }

    // Add all budget items
    for (const item of budgetData) {
      await db.collection('budgetLineItems').add(item);
      console.log(`✅ Added: ${item.name}`);
    }

    console.log(`\n✅ Successfully seeded ${budgetData.length} budget items!\n`);

    // Display summary
    const total = budgetData.reduce((sum, item) => sum + item.value, 0);
    console.log('📊 Summary:');
    console.log(`   Total Project Budget: $${total.toLocaleString()}`);
    console.log(`   Items by Phase:`);
    
    const phases = [...new Set(budgetData.map(item => item.phase))];
    phases.forEach(phase => {
      const phaseItems = budgetData.filter(item => item.phase === phase);
      const phaseTotal = phaseItems.reduce((sum, item) => sum + item.value, 0);
      console.log(`   - ${phase}: $${phaseTotal.toLocaleString()} (${phaseItems.length} items)`);
    });

  } catch (error) {
    console.error('Error seeding budget data:', error);
  } finally {
    await admin.app().delete();
  }
}

seedBudgetData();
