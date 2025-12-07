#!/usr/bin/env node

/**
 * Firebase Budget Data Extractor
 * Pulls budget line items from Firebase and outputs them as a clean table
 */

require('dotenv').config();

const admin = require('firebase-admin');

// Initialize Firebase Admin
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Try using service account if available, otherwise use client config
let db;
try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: firebaseConfig.projectId
    });
  } else {
    console.error('ERROR: FIREBASE_SERVICE_ACCOUNT environment variable not set.');
    console.error('Please set up Firebase Admin credentials to pull data from Firestore.');
    process.exit(1);
  }
  db = admin.firestore();
} catch (error) {
  console.error('Firebase initialization error:', error.message);
  process.exit(1);
}

// Status label mapping
const STATUS_LABELS = {
  1: 'Not Started',
  2: 'In Progress',
  3: 'On Hold',
  4: 'Completed',
  5: 'Pending Review',
  6: 'Approved / Closed'
};

async function getBudgetData() {
  try {
    console.log('\n📊 Fetching Budget Line Items from Firebase...\n');

    // Get budget line items
    const budgetItemsSnap = await db.collection('budgetLineItems').get();
    const budgetItems = [];

    budgetItemsSnap.forEach(doc => {
      const data = doc.data();
      budgetItems.push({
        id: doc.id,
        name: data.name || '[Unnamed]',
        phase: data.phase || '[Phase Not Specified]',
        value: data.value || 0,
        spent: data.spent || 0,
        status: data.status || 1,
        owner: data.owner || '[Owner Not Specified]',
        dueDate: data.dueDate || '[No Due Date]',
        notes: data.notes || ''
      });
    });

    if (budgetItems.length === 0) {
      console.log('⚠️  No budget items found in Firebase.\n');
      return;
    }

    // Sort by phase
    budgetItems.sort((a, b) => a.phase.localeCompare(b.phase));

    // Display Results
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');
    console.log('                         BUDGET LINE ITEMS ANALYSIS\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    // Calculate totals
    const totalAllocated = budgetItems.reduce((sum, item) => sum + item.value, 0);
    const totalSpent = budgetItems.reduce((sum, item) => sum + item.spent, 0);
    const totalRemaining = totalAllocated - totalSpent;

    // Status counts
    const statusCounts = {};
    budgetItems.forEach(item => {
      const label = STATUS_LABELS[item.status] || 'Unknown';
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });

    // Summary
    console.log('📈 BUDGET SUMMARY SNAPSHOT\n');
    console.log(`  Total Allocated:      $${totalAllocated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`  Total Spent/Committed: $${totalSpent.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`  Total Remaining:       $${totalRemaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
    console.log(`  Burn Rate:             ${((totalSpent / totalAllocated) * 100).toFixed(1)}%`);
    console.log(`  Number of Items:       ${budgetItems.length}\n`);

    console.log('📋 STATUS OVERVIEW\n');
    Object.entries(statusCounts).forEach(([label, count]) => {
      console.log(`  ${label}: ${count} item(s)`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');
    console.log('                          DETAILED BUDGET TABLE\n');
    console.log('═══════════════════════════════════════════════════════════════════════════════\n');

    // Group by phase and display
    const phases = [...new Set(budgetItems.map(item => item.phase))];

    phases.forEach(phase => {
      const phaseItems = budgetItems.filter(item => item.phase === phase);
      const phaseAllocated = phaseItems.reduce((sum, item) => sum + item.value, 0);
      const phaseSpent = phaseItems.reduce((sum, item) => sum + item.spent, 0);
      const phaseRemaining = phaseAllocated - phaseSpent;
      const phaseBurnRate = ((phaseSpent / phaseAllocated) * 100).toFixed(1);

      console.log(`\n🔹 ${phase}`);
      console.log(`   Budget: $${phaseAllocated.toLocaleString()} | Spent: $${phaseSpent.toLocaleString()} | Remaining: $${phaseRemaining.toLocaleString()} | Burn: ${phaseBurnRate}%\n`);

      // Create table for this phase
      console.log('┌─────────────────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────┬──────────────────────────┐');
      console.log('│ Item Name                       │ Allocated ($)        │ Spent ($)            │ Remaining ($)        │ Status               │ Owner                    │');
      console.log('├─────────────────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────┼──────────────────────────┤');

      phaseItems.forEach(item => {
        const remaining = item.value - item.spent;
        const statusLabel = STATUS_LABELS[item.status] || 'Unknown';
        
        const name = item.name.substring(0, 31).padEnd(31);
        const allocated = `$${item.value.toLocaleString()}`.padStart(20);
        const spent = `$${item.spent.toLocaleString()}`.padStart(20);
        const remainingStr = `$${remaining.toLocaleString()}`.padStart(20);
        const status = statusLabel.substring(0, 20).padEnd(20);
        const owner = item.owner.substring(0, 24).padEnd(24);

        console.log(`│ ${name} │ ${allocated} │ ${spent} │ ${remainingStr} │ ${status} │ ${owner} │`);

        if (item.notes) {
          console.log(`│ ➜ Notes: ${item.notes.substring(0, 85).padEnd(85)} │`);
        }
        if (item.dueDate && item.dueDate !== '[No Due Date]') {
          console.log(`│ ➜ Due: ${item.dueDate.padEnd(92)} │`);
        }
      });

      console.log('└─────────────────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────┴──────────────────────────┘');
    });

    console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');

    // Export as JSON
    console.log('📥 RAW DATA (JSON FORMAT)\n');
    console.log(JSON.stringify(budgetItems, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('Error fetching budget data:', error.message);
    process.exit(1);
  } finally {
    await admin.app().delete();
  }
}

getBudgetData();
