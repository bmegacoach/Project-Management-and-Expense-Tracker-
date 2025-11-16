# Getting Started Checklist

## ✅ Pre-Migration Setup (Do This First)

- [ ] Open Firebase Console: https://console.firebase.google.com/
- [ ] Select project: **tech-camp-construction-project**
- [ ] Click ⚙️ **Settings** (gear icon, top left)
- [ ] Go to **Service Accounts** tab
- [ ] Click **Generate New Private Key**
- [ ] Save the JSON file somewhere safe
- [ ] Rename it to: `service-account.json`
- [ ] Copy to: `scripts/service-account.json` in this project

⚠️ **Important Notes**:
- This is different from your `.env.local` credentials
- Don't commit this file to git
- Keep it private and secure

---

## 🚀 Migration Steps (In Order)

### Step 1: Verify Files
- [ ] Open terminal in project root
- [ ] Verify you have `scripts/service-account.json`
- [ ] Verify you have `data.json` in project root

### Step 2: Run Migration
```bash
node scripts/migrate-data.js
```

- [ ] Wait for all ✓ checkmarks
- [ ] See success message at end
- [ ] Note the summary (25 tasks, 5 contractors, 37 items)

### Step 3: Verify in Firebase Console
- [ ] Open Firebase Console
- [ ] Go to Firestore Database
- [ ] Click **Collections**
- [ ] Check for: `tasks`, `contractors`, `budgetLineItems`, `config`
- [ ] All 25 tasks should be visible
- [ ] All 5 contractors should be visible
- [ ] All 37 budget items should be visible

---

## 🎮 Start the App

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Start Development Server
```bash
npm run dev
```

### Step 3: Open in Browser
- [ ] Go to http://localhost:5173
- [ ] You should see login screen

---

## 📊 Verify Everything Works

### Dashboard Page
- [ ] Click **Dashboard** in sidebar
- [ ] See 4 metric cards:
  - Project Work Value: $110,000
  - Completed Work %: 0% (increases when you approve tasks)
  - Approved Work Value: $0
  - Total Draws: $127,400
- [ ] Progress bar visible below metrics

### Tasks Page
- [ ] Click **Tasks** in sidebar
- [ ] See 5 phases grouped:
  - Phase 1: Pre-Construction & Demolition
  - Phase 2: Structural & Envelope
  - Phase 3: MEP Rough-in
  - Phase 4: Interior Finishes & Exterior Cladding
  - Phase 5: Fixtures, Appliances & Final Touches
- [ ] See 25 total tasks with subtasks
- [ ] See badges: ⚡ Non-Dependency, 📌 LineItem, 💵 ApprovedValue

### Contractors Page
- [ ] Click **Contractors** in sidebar
- [ ] See 5 contractors:
  - Demolition Crew
  - Foundation & Framing Team
  - MEP Specialists
  - Exterior & Envelope Crew
  - Interior Finishing Team
- [ ] See their descriptions and contact info

### Budget Page
- [ ] Click **Budget** in sidebar
- [ ] See "Add Draw Request" section
- [ ] Scroll down to "Budget Line Items"
- [ ] See all 37 budget categories:
  - Permits, Roofing, HVAC, etc.
- [ ] See progress bars (color-coded)
- [ ] See summary stats at bottom:
  - Total Budget
  - Total Spent
  - Remaining

### Media Page
- [ ] Click **Media** in sidebar
- [ ] Should load (may be empty initially)
- [ ] Try uploading a test document

### Reports Page
- [ ] Click **Reports** in sidebar
- [ ] Should load
- [ ] Try creating a test report

---

## 🎯 Test Key Features

### Test 1: Approve a Task
1. Go to **Tasks**
2. Click on any task
3. Change status: Pending → Site Completed
4. Change again: Site Completed → PM Approved
5. Set ApprovedValue: Enter a dollar amount (e.g., $5,000)
6. Click Save
7. Go back to **Dashboard**
8. Check: "Completed Work %" should increase
9. Check: "Approved Work Value" should show your amount

### Test 2: Verify CWP Calculation
1. Approve several tasks with approvedValue amounts
2. Dashboard should show: (Total Approved / $110,000) × 100 = CWP %
3. When CWP ≥ 70%:
   - Go to **Budget**
   - Try creating a Draw Request
   - "Schedule Draw" button should now be enabled

### Test 3: Create Daily Report
1. Go to **Reports**
2. Click "+ New Report"
3. Fill in contractor name
4. Add notes, materials, checklist
5. Upload a photo
6. Click "Submit Report"
7. See it appear in "Recent Reports"

---

## ⚠️ Common Issues & Fixes

### Issue: "Service account not found"
**Fix**: 
- Make sure file is at `scripts/service-account.json`
- Check filename has no typos
- Verify file is readable

### Issue: "Permission denied" error
**Fix**:
- Download fresh service account from Firebase
- Ensure it's from correct Firebase project
- Check JSON contains `"type": "service_account"`

### Issue: "No collections showing up"
**Fix**:
- Check migration script ran successfully
- Verify all ✓ checkmarks appeared
- Wait a few seconds and refresh Firebase Console

### Issue: Dashboard shows $0 for everything
**Fix**:
- Migration might not have completed
- Check Firebase Console → Collections
- Ensure config/prd document exists

### Issue: Dark/Light mode toggle missing
**Fix**:
- Refresh browser (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache
- Look for theme toggle in top-right corner

---

## 📱 Testing on Different Devices

### Mobile Phone
- [ ] Open http://localhost:5173 from phone
- [ ] Or use ngrok to share: `ngrok http 5173`
- [ ] Test all buttons are clickable
- [ ] Test text is readable (not too small)
- [ ] Test dark mode on phone

### Tablet
- [ ] Open in tablet browser
- [ ] Test landscape and portrait modes
- [ ] Verify layout is responsive

### Desktop
- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari
- [ ] Test dark mode

---

## 🎉 Success Indicators

You'll know everything is working when:

✅ Migration script shows all success messages  
✅ Firebase Console shows all 5 collections  
✅ Dashboard loads with correct metrics  
✅ Tasks page shows all 25 tasks  
✅ Contractors page shows all 5 teams  
✅ Budget page shows all 37 line items  
✅ Can approve tasks and CWP updates  
✅ When CWP ≥ 70%, can schedule draw  
✅ Can create daily reports  
✅ Dark mode toggle works  
✅ All pages work on mobile  

---

## 📞 Need Help?

1. **Read**: `QUICK_REFERENCE.md` (1-page cheat sheet)
2. **Setup**: `SETUP.md` (detailed setup guide)
3. **Migration**: `scripts/MIGRATION_GUIDE.md` (migration help)
4. **Overview**: `README.md` (project details)
5. **Status**: `PROJECT_STATUS.md` (what's done)

---

## 🔒 Security Reminders

- [ ] Delete `scripts/service-account.json` after migration is complete
- [ ] Never commit service-account.json to git
- [ ] Keep `.env.local` private (already in .gitignore)
- [ ] Don't share credentials files with others
- [ ] Regenerate service account if you think it was exposed

---

## 🚀 Next Steps After Setup

1. **Explore**: Spend 10 minutes clicking through all pages
2. **Test**: Create a few test tasks and approvals
3. **Learn CWP**: Understand how Completed Work Percentage works
4. **Practice Approvals**: Practice approving tasks to hit 70% threshold
5. **Schedule Draw**: Try scheduling a draw (requires 70% CWP)
6. **Daily Reports**: Create sample daily site reports
7. **Dark Mode**: Test dark mode on different devices

---

## 📋 Project Summary

| Item | Value |
|------|-------|
| **Project** | RED CARPET CONTRACTORS - Tech Camp 1 |
| **Location** | 4821 Briscoe St, Houston, TX 77033 |
| **Budget** | $110,000 |
| **Duration** | 6 months |
| **Draws** | 4 (Front-loaded) |
| **Total Draw Amount** | $127,400 |
| **Milestone Gate** | 70% CWP |
| **Tasks** | 25 across 5 phases |
| **Contractors** | 5 teams |
| **Budget Items** | 37 categories |

---

## ✅ Final Checklist

Before you consider setup complete:

- [ ] service-account.json placed in scripts/
- [ ] Migration script ran successfully
- [ ] All collections visible in Firebase
- [ ] App starts with `npm run dev`
- [ ] Dashboard loads with metrics
- [ ] All 5 pages accessible
- [ ] Tasks page shows 25 tasks
- [ ] Budget page shows 37 line items
- [ ] Dark mode works
- [ ] Mobile view is responsive
- [ ] Can approve tasks and see CWP update
- [ ] Documentation files reviewed

---

You're ready to go! 🎉 Start with the Dashboard and explore!
