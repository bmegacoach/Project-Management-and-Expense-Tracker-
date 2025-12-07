# 🚀 Quick Start: Extract & Analyze Budget Data

## Three Easy Ways to Pull Budget Data from Firebase

### ✅ **Option 1: Use the Web Extractor (EASIEST - No Setup)**

1. Open `budget-extractor.html` in your browser
   - Simply double-click the file or open in browser
   - OR: Drag and drop into browser window
   - OR: Copy this path in browser: `file:///d:/Project-Management-and-Expense-Tracker-/budget-extractor.html`

2. Click **"Extract Data"** button

3. See your complete budget analysis:
   - 📈 Summary totals
   - 📊 Budget by phase
   - 💾 Export as JSON or CSV

**No Firebase setup needed - uses your existing config!**

---

### ✅ **Option 2: View in Your App UI (Recommended for Long-Term)**

1. Run your app: `npm run dev`
2. Go to **💰 Budget** tab
3. See budget items organized by phase with:
   - Human-friendly status labels
   - Phase summaries
   - Burn rate indicators
   - Project totals

---

### ✅ **Option 3: Browser Console (For Developers)**

1. Run your app: `npm run dev`
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Copy and paste this:

```javascript
fetch('/scripts/extract-budget-console.js')
  .then(r => r.text())
  .then(code => eval(code));
```

Or just open `/scripts/extract-budget-console.js` content and paste into console.

---

## If You Have No Budget Data Yet

### Populate with Sample Data:

```bash
# 1. Get Firebase service account JSON
# Go to: Firebase Console → Project Settings → Service Accounts → Download JSON

# 2. Save it in project root as: firebase-service-account.json

# 3. Run the seed script
node scripts/seed-budget-data.mjs
```

This adds 26 realistic budget items for all 5 project phases.

---

## What You'll Get

### Summary Snapshot:
- Total Allocated Budget
- Total Spent/Committed
- Total Remaining
- Overall Burn Rate %
- Item Count

### Detailed Breakdown:
- Items grouped by phase
- Per-item: Name, Allocated, Spent, Remaining
- Status labels (In Progress, Completed, etc.)
- Owner and Due Dates
- Phase-level burn rates

### Export Options:
- 📥 Copy as JSON
- 📥 Download JSON file
- 📥 Copy as CSV

---

## Status Codes Reference

| Code | Label | Means |
|------|-------|-------|
| 1 | Not Started | Planning, not begun |
| 2 | In Progress | Active work |
| 3 | On Hold | Paused |
| 4 | Completed | Work finished |
| 5 | Pending Review | Waiting for approval |
| 6 | Approved/Closed | Approved & closed |

---

## Budget Data Structure

When viewing or adding items, each has:

```json
{
  "name": "Foundation Repair & Addition",
  "phase": "Phase 2: Structural & Envelope",
  "value": 22000,           // Allocated budget
  "spent": 0,               // Amount spent so far
  "status": 1,              // Code 1-6
  "owner": "John Contractor",
  "dueDate": "2025-03-15",
  "notes": "1000 sq ft addition"
}
```

---

## Common Issues & Fixes

### "No budget items found"
→ Run seed script: `node scripts/seed-budget-data.mjs`

### "Firebase not initialized"
→ Make sure `.env.local` exists with Firebase config

### "Can't run seed script"
→ Download Firebase service account JSON and save as `firebase-service-account.json`

### Amounts showing as $0
→ Check `value` field is a number, not string

---

## Next Steps

1. ✅ Choose extraction method above (Option 1 is easiest!)
2. ✅ Extract your budget data
3. ✅ Review for missing or incomplete items
4. ✅ Analyze spending vs. budget
5. ✅ Share data with AI for improvement suggestions

---

## Pro Tips

💡 **Keep budget-extractor.html bookmarked** - use it anytime to see current status

💡 **Export data regularly** - save snapshots of budget over time

💡 **Use Status codes** to track progress - update as work completes

💡 **Add Notes** - track risks and important budget info per item

---

**Questions?** Check `BUDGET_EXTRACTION_GUIDE.md` for detailed information.
