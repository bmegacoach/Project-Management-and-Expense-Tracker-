/**
 * Budget Data Inspector
 * Add this to your browser console or create a dedicated tool page
 */

// When you have access to the db (Firestore instance), run:

async function extractAndAnalyzeBudgetData(db) {
  try {
    console.log('\n📊 Extracting Budget Data from Firebase...\n');

    // Get budget line items
    const budgetQuery = await db.collection('budgetLineItems').get();
    const budgetItems = [];

    budgetQuery.forEach(doc => {
      const data = doc.data();
      budgetItems.push({
        id: doc.id,
        ...data
      });
    });

    if (budgetItems.length === 0) {
      console.warn('⚠️  No budget items found in Firebase budgetLineItems collection');
      console.log('To add budget items, use the Budget page UI or run: scripts/seed-budget-data.js');
      return;
    }

    // Sort by phase
    budgetItems.sort((a, b) => 
      (a.phase || 'Other').localeCompare(b.phase || 'Other')
    );

    // Status mapping
    const STATUS_LABELS = {
      1: 'Not Started',
      2: 'In Progress',
      3: 'On Hold',
      4: 'Completed',
      5: 'Pending Review',
      6: 'Approved / Closed'
    };

    // Calculate metrics
    const totalAllocated = budgetItems.reduce((sum, item) => sum + (item.value || 0), 0);
    const totalSpent = budgetItems.reduce((sum, item) => sum + (item.spent || 0), 0);
    const totalRemaining = totalAllocated - totalSpent;

    // Create output
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('                    BUDGET DATA ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    console.log('📈 SUMMARY\n');
    console.log(`  Total Allocated:       $${totalAllocated.toLocaleString()}`);
    console.log(`  Total Spent:           $${totalSpent.toLocaleString()}`);
    console.log(`  Total Remaining:       $${totalRemaining.toLocaleString()}`);
    console.log(`  Burn Rate:             ${((totalSpent / totalAllocated) * 100).toFixed(1)}%`);
    console.log(`  Number of Items:       ${budgetItems.length}\n`);

    // Status overview
    const statusCounts = {};
    budgetItems.forEach(item => {
      const label = STATUS_LABELS[item.status] || 'Unknown';
      statusCounts[label] = (statusCounts[label] || 0) + 1;
    });

    console.log('📋 STATUS OVERVIEW\n');
    Object.entries(statusCounts).forEach(([label, count]) => {
      console.log(`  ${label}: ${count}`);
    });

    console.log('\n═══════════════════════════════════════════════════════════════════\n');
    console.log('📊 DETAILED DATA\n');
    console.table(budgetItems.map(item => ({
      'Item': item.name || '[Unnamed]',
      'Phase': item.phase || '[Not Set]',
      'Allocated': `$${(item.value || 0).toLocaleString()}`,
      'Spent': `$${(item.spent || 0).toLocaleString()}`,
      'Remaining': `$${((item.value || 0) - (item.spent || 0)).toLocaleString()}`,
      'Status': STATUS_LABELS[item.status] || 'Unknown',
      'Owner': item.owner || '[Not Set]',
      'Due Date': item.dueDate || '[Not Set]'
    })));

    console.log('\n═══════════════════════════════════════════════════════════════════\n');
    console.log('📥 RAW JSON DATA\n');
    console.log(JSON.stringify(budgetItems, null, 2));

    return {
      items: budgetItems,
      totals: {
        allocated: totalAllocated,
        spent: totalSpent,
        remaining: totalRemaining,
        burnRate: ((totalSpent / totalAllocated) * 100).toFixed(1)
      },
      statusCounts
    };

  } catch (error) {
    console.error('Error extracting budget data:', error);
  }
}

// Usage in browser console or from your app:
// 1. Import the db instance from your app
// 2. Call: extractAndAnalyzeBudgetData(db)

// Or export for use in React components:
export default extractAndAnalyzeBudgetData;
