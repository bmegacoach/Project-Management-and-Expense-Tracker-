# Budget Data Extraction & Analysis Guide

## Overview

This guide helps you extract, analyze, and improve your budget data from Firebase using the AI system instructions for budget review.

## Quick Start

### Option 1: View Budget Data in Your App (Easiest)

1. **Start your app**: `npm run dev`
2. **Go to the Budget page** in your application
3. The improved Budget page now displays:
   - Budget items grouped by phase
   - Human-friendly status labels (In Progress, Completed, etc.)
   - Phase-level summaries (total budget, spent, remaining)
   - Project totals and status legend

### Option 2: Extract & Analyze in Browser Console

1. **Open your app** in browser
2. **Open Developer Tools** (F12)
3. **Go to Console tab**
4. **Run this code**:

```javascript
// Paste in browser console - requires your app to be loaded
import extractBudgetData from '/src/utils/extractBudgetData.ts';

// If you have access to the db instance:
// extractAndAnalyzeBudgetData(db).then(result => {
//   console.log('Analysis complete:', result);
// });
```

### Option 3: Seed Sample Data First

If you have no budget data in Firebase yet:

```bash
# 1. Create a service account JSON file
# Download from Firebase Console → Project Settings → Service Accounts
# Save as: firebase-service-account.json

# 2. Run the seed script
node scripts/seed-budget-data.mjs
```

This populates your Firebase with 26 realistic budget items for your construction project.

## The Improved Budget Component

The updated `Budget.tsx` component includes:

### ✅ Human-Friendly Status Labels

Instead of numeric codes (1, 2, 3...), items show:
- 1 = **Not Started** (gray)
- 2 = **In Progress** (blue)
- 3 = **On Hold** (orange)
- 4 = **Completed** (green)
- 5 = **Pending Review** (purple)
- 6 = **Approved/Closed** (teal)

### ✅ Phase-Based Organization

Budget items are grouped by project phase:
- Phase 1: Pre-Construction & Demolition
- Phase 2: Structural & Envelope
- Phase 3: MEP Rough-in
- Phase 4: Interior Finishes & Exterior Cladding
- Phase 5: Fixtures, Appliances & Final Touches

Each phase shows:
- 💰 Phase budget total
- 💸 Amount spent so far
- 📊 Remaining budget
- 🔥 Burn rate (% spent)

### ✅ Detailed Table Format

Per-item breakdown includes:
| Column | Data |
|--------|------|
| Item Name | Clear name + notes/risks |
| Allocated | Budget amount for this item |
| Spent | Amount spent/committed |
| Remaining | Available budget |
| Status | Human-friendly status |
| Owner | Responsible person |

### ✅ Project Summary

Bottom section displays:
- **Total Budget**: Sum of all allocated amounts
- **Total Spent**: Sum of all spending
- **Total Remaining**: Available budget remaining
- **Status Legend**: Visual reference for all status labels

## Budget Data Structure

When adding budget items to Firebase, use this structure:

```typescript
{
  name: string;           // e.g., "Foundation Repair & Addition"
  phase: string;          // e.g., "Phase 2: Structural & Envelope"
  value: number;          // Allocated amount in dollars
  spent: number;          // Amount spent/committed
  status: number;         // 1-6 (see mapping above)
  owner?: string;         // Person responsible
  dueDate?: string;       // Deadline (YYYY-MM-DD)
  notes?: string;         // Risk notes or comments
}
```

### Example Item

```json
{
  "name": "Foundation Repair & Addition",
  "phase": "Phase 2: Structural & Envelope",
  "value": 22000,
  "spent": 0,
  "status": 1,
  "owner": "Foundation Contractor",
  "dueDate": "2025-03-15",
  "notes": "1000 sq ft addition slab integration"
}
```

## Analysis Tools

### Built-in in Your App

The Budget page in your app automatically shows:
- Phase summaries
- Item-level details
- Color-coded status
- Burn rate indicators
- Currency formatting

### Browser-Based Analysis

Use `src/utils/extractBudgetData.ts` for custom analysis:

```typescript
import extractBudgetData from '@/utils/extractBudgetData';

// In your component:
const analysis = await extractBudgetData(db);
// Returns:
// {
//   items: [...],
//   totals: { allocated, spent, remaining, burnRate },
//   statusCounts: { "In Progress": 5, ... }
// }
```

## How to Add Budget Items

### Via UI (Easiest)
1. Open your app
2. Go to **💰 Budget** tab
3. Use the "Budget Line Items" section to add/edit items
4. Items are saved to Firebase automatically

### Via Firebase Console
1. Go to Firebase Console
2. Select your project
3. Navigate to **Firestore Database**
4. Create/edit documents in **budgetLineItems** collection
5. Use the structure from above

### Via Seed Script
```bash
node scripts/seed-budget-data.mjs
```

Creates 26 sample budget items for the entire project.

## Status Codes Reference

| Code | Label | Color | Use When |
|------|-------|-------|----------|
| 1 | Not Started | Gray | Planning phase, not yet begun |
| 2 | In Progress | Blue | Active work happening |
| 3 | On Hold | Orange | Work paused, awaiting something |
| 4 | Completed | Green | Work finished and paid |
| 5 | Pending Review | Purple | Work done, awaiting approval |
| 6 | Approved/Closed | Teal | Approved and closed |

## Troubleshooting

### No budget items showing?
1. Check **Firestore → budgetLineItems collection** exists
2. If empty, run: `node scripts/seed-budget-data.mjs`
3. Refresh your app

### Can't run seed script?
1. Ensure `firebase-service-account.json` exists in project root
2. Download from Firebase Console → Project Settings → Service Accounts
3. Save with the service account JSON

### Amounts showing as $0?
1. Check the `value` field is populated in each item
2. Ensure `spent` is less than or equal to `value`
3. Check data types are numbers, not strings

### Status not showing correctly?
1. Verify `status` field is a number (1-6)
2. Check STATUS_LABELS mapping in `Budget.tsx`
3. Refresh page to load latest data

## Exporting Budget Data

To get your current budget data as JSON:

1. **In Browser Console**:
```javascript
// Get current budget items
const items = db.collection('budgetLineItems').get()
  .then(snap => {
    const data = [];
    snap.forEach(doc => data.push({id: doc.id, ...doc.data()}));
    console.log(JSON.stringify(data, null, 2));
  });
```

2. **Via Firestore Export**:
   - Firebase Console → Firestore → Start Collection
   - Can export data as JSON through Google Cloud

## Next Steps

1. ✅ Start your app: `npm run dev`
2. ✅ Go to Budget page
3. ✅ Add/edit budget items
4. ✅ Review phase summaries
5. ✅ Monitor burn rates
6. ✅ Update statuses as work progresses

## Questions?

For AI-powered budget review and improvements, provide your budget table/export and the system will:
- Identify missing information
- Convert codes to human-friendly labels
- Clean and reformat the data
- Generate summary snapshots
- Suggest improvements
