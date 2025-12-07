/**
 * Budget Data Extractor - Browser Console Helper
 * 
 * Usage:
 * 1. Copy this entire file content
 * 2. Open your app in browser (npm run dev)
 * 3. Go to Console tab (F12)
 * 4. Paste and run
 * 5. The data will be logged and available in the console
 */

(async function extractBudgetData() {
  console.log('📊 Extracting budget data from Firebase Firestore...\n');

  // Status mapping (matches Budget.tsx)
  const STATUS_LABELS = {
    1: 'Not Started',
    2: 'In Progress',
    3: 'On Hold',
    4: 'Completed',
    5: 'Pending Review',
    6: 'Approved / Closed'
  };

  try {
    // Get the db instance from window (injected by your app)
    if (!window.__BUDGET_DB__) {
      console.error('❌ Firebase not initialized yet. Please wait for the app to load completely.');
      return;
    }

    const db = window.__BUDGET_DB__;
    
    // Query budget line items
    const snapshot = await db.collection('budgetLineItems').get();

    if (snapshot.empty) {
      console.warn('⚠️  No budget items found in Firebase.');
      console.log('To add sample data, run this in your app:');
      console.log('  npm run seed-budget');
      return;
    }

    const budgetItems = [];
    snapshot.forEach(doc => {
      budgetItems.push({
        id: doc.id,
        ...doc.data()
      });
    });

    // Sort by phase
    budgetItems.sort((a, b) =>
      (a.phase || 'Other').localeCompare(b.phase || 'Other')
    );

    // Calculate totals
    const totalAllocated = budgetItems.reduce((sum, item) => sum + (item.value || 0), 0);
    const totalSpent = budgetItems.reduce((sum, item) => sum + (item.spent || 0), 0);
    const totalRemaining = totalAllocated - totalSpent;

    // Status overview
    const statusCounts = {};
    budgetItems.forEach(item => {
      const label = STATUS_LABELS[item.status] || 'Unknown';
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });

    // Display results
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('                  BUDGET DATA ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    console.log('📈 SUMMARY SNAPSHOT\n');
    console.log('  Total Allocated:      $' + totalAllocated.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }));
    console.log('  Total Spent:          $' + totalSpent.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }));
    console.log('  Total Remaining:      $' + totalRemaining.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }));
    console.log('  Overall Burn Rate:    ' + ((totalSpent / totalAllocated) * 100).toFixed(1) + '%');
    console.log('  Number of Items:      ' + budgetItems.length + '\n');

    console.log('📋 STATUS OVERVIEW\n');
    Object.entries(statusCounts).forEach(([label, count]) => {
      console.log('  ' + label + ': ' + count);
    });

    console.log('\n═══════════════════════════════════════════════════════════════\n');

    // Group by phase
    const phases = [...new Set(budgetItems.map(item => item.phase || 'Other'))];

    console.log('🔹 BUDGET BY PHASE\n');
    phases.forEach(phase => {
      const phaseItems = budgetItems.filter(item => (item.phase || 'Other') === phase);
      const phaseAllocated = phaseItems.reduce((sum, item) => sum + (item.value || 0), 0);
      const phaseSpent = phaseItems.reduce((sum, item) => sum + (item.spent || 0), 0);
      const phaseRemaining = phaseAllocated - phaseSpent;
      const phaseBurnRate = ((phaseSpent / phaseAllocated) * 100).toFixed(1);

      console.log(`%c${phase}`, 'font-weight: bold; font-size: 14px; color: #3b82f6;');
      console.log('  Allocated: $' + phaseAllocated.toLocaleString() +
        ' | Spent: $' + phaseSpent.toLocaleString() +
        ' | Remaining: $' + phaseRemaining.toLocaleString() +
        ' | Burn: ' + phaseBurnRate + '%\n');

      // Create table for phase
      console.table(
        phaseItems.map(item => ({
          'Item': item.name || '[Unnamed]',
          'Allocated': '$' + (item.value || 0).toLocaleString(),
          'Spent': '$' + (item.spent || 0).toLocaleString(),
          'Remaining': '$' + ((item.value || 0) - (item.spent || 0)).toLocaleString(),
          'Status': STATUS_LABELS[item.status] || 'Unknown',
          'Owner': item.owner || '[Not Set]',
          'Due Date': item.dueDate || '[Not Set]'
        }))
      );
    });

    console.log('\n═══════════════════════════════════════════════════════════════\n');
    console.log('%cRAW JSON DATA', 'font-weight: bold; font-size: 12px;');
    console.log(budgetItems);

    // Return data for further use
    return {
      items: budgetItems,
      totals: {
        allocated: totalAllocated,
        spent: totalSpent,
        remaining: totalRemaining,
        burnRate: ((totalSpent / totalAllocated) * 100).toFixed(1) + '%'
      },
      statusCounts: statusCounts,
      phaseBreakdown: phases.map(phase => {
        const phaseItems = budgetItems.filter(item => (item.phase || 'Other') === phase);
        return {
          phase: phase,
          allocated: phaseItems.reduce((s, i) => s + (i.value || 0), 0),
          spent: phaseItems.reduce((s, i) => s + (i.spent || 0), 0),
          items: phaseItems.length
        };
      })
    };

  } catch (error) {
    console.error('❌ Error extracting budget data:', error);
    console.log('Make sure your Firebase app is initialized and Firestore is loaded.');
  }
})();

console.log('\n💡 The data extraction is running. Results will appear above.');
