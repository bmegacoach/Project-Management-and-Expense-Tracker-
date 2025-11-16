# Quick Reference Guide

## 🚀 First-Time Setup (5 minutes)

```bash
# 1. Install packages
npm install

# 2. Install migration dependencies
npm install firebase-admin

# 3. Get Firebase SERVICE ACCOUNT from Firebase Console
# ⚠️ Different from .env.local credentials!
# Settings → Service Accounts → Generate New Private Key

# 4. Place service account in scripts/
cp /path/to/service-account.json scripts/

# 5. Run migration
node scripts/migrate-data.js

# 6. Start app
npm run dev
```

Open http://localhost:5173

**Note**: Your `.env.local` has web credentials for the app. The migration needs admin credentials (service account) - they're different files!

## 📊 Dashboard Overview

| Metric | What It Means |
|--------|---------------|
| **Project Work Value** | $110,000 total project budget |
| **Completed Work %** | Sum of approved task values / $110K |
| **Approved Work Value** | Total $ of all PM-approved tasks |
| **Total Draws** | $127,400 across 4 draws |

🎯 **Goal**: Reach 70% CWP to unlock draw scheduling

## 📋 Task Status Workflow

```
PENDING → SITE_COMPLETED → PM_APPROVED
  (New)      (Work Done)    (Approved + $Amount Set)
```

## 💰 Budget Line Items View

Shows 37 budget categories:
- **Permits** ($4K), **Roofing** ($10K), **HVAC** ($12K), etc.
- Color bars: 🟢 ≤50% | 🟡 50-90% | 🔴 >90% spent
- Summary at bottom: Total Budget, Spent, Remaining

## 👷 Contractor Teams

1. **Demolition Crew** - Phase 1
2. **Foundation & Framing Team** - Phase 2
3. **MEP Specialists** - Phase 3
4. **Exterior & Envelope Crew** - Phase 2
5. **Interior Finishing Team** - Phase 4

## 🎯 5 Project Phases

| Phase | Work | Key Tasks |
|-------|------|-----------|
| **Phase 1** | Pre-Const & Demo | Permits, site setup, demolition |
| **Phase 2** | Structural | Foundation, framing, roofing |
| **Phase 3** | MEP | HVAC, plumbing, electrical rough-in |
| **Phase 4** | Interior | Drywall, paint, flooring, cabinets |
| **Phase 5** | Finishes | Final electrical, plumbing, cleaning |

## 🎮 How to Use Key Features

### Approve Tasks & Unlock Draws
1. Go to **Tasks**
2. Click **Bulk Approve** or select tasks
3. **Set ApprovedValue** for each (total = CWP)
4. **Dashboard** recalculates % automatically
5. When CWP ≥ 70% → **Budget** page enables "Schedule Draw"

### Schedule a Draw
1. Go to **Budget**
2. Create "Draw Request" with amount
3. Portfolio Manager clicks "Schedule Draw" (requires 70% CWP)
4. Email template opens with project details
5. Send to contractor/lender
6. Mark "Disbursed" when funds received

### Track Budget Spending
1. Go to **Budget** → **Budget Line Items**
2. See all 37 categories with budgeted vs. spent
3. Visual progress bars show spending %
4. Summary shows total budget/spent/remaining

### Create Daily Report
1. Go to **Reports**
2. Click **+ New Report**
3. Add contractor, notes, materials
4. Upload photo
5. Add checklist items
6. Submit

### Add Contractor
1. Go to **Contractors**
2. Click **+ Add Contractor**
3. Fill name, description, phase, contact
4. Click **Create Contractor**

## 🔑 Key Numbers

| Item | Amount |
|------|--------|
| Project Budget | $110,000 |
| Total Draws | $127,400 |
| Monthly Interest | $2,900 |
| Project Duration | 6 months |
| Number of Draws | 4 |
| CWP Milestone | 70% |
| Number of Tasks | 25 |
| Budget Categories | 37 |
| Contractor Teams | 5 |

## 📱 Mobile Tips

- All pages work on phone/tablet
- Tap buttons for same action as desktop
- Swipe left/right on cards to see more
- Use landscape mode for charts
- Dark mode: Toggle in upper right

## 🔄 Common Tasks

**"I completed a task"**
1. Tasks page → Click task
2. Change status: Pending → Site Completed

**"PM approves the work"**
1. Tasks page → Select task
2. Change status: Site Completed → PM Approved
3. Set dollar amount in ApprovedValue
4. Submit

**"We're at 70% - request payment"**
1. Budget page → Add Draw Request
2. Enter amount ($?)
3. Portfolio Manager clicks "Schedule Draw"
4. Email opens - send to borrower

**"We need budget details"**
1. Budget page → Scroll to "Budget Line Items"
2. See all 37 categories with spending
3. Green = on track, Red = over budget

## 🔐 User Roles

| Role | Can Do |
|------|--------|
| **Site Manager** | Create reports, view tasks/contractors |
| **Project Manager** | Approve tasks, set values, manage contractors |
| **Portfolio Manager** | Schedule/disburse draws, view all metrics |

(Currently no login - use role selector in UI)

## 🐛 Quick Fixes

| Problem | Fix |
|---------|-----|
| Data not loading | Clear cache (Ctrl+F5), refresh browser |
| Migration failed | Check service-account.json exists in scripts/ |
| CWP not updating | Ensure tasks are pm_approved + have approvedValue |
| Budget items missing | Run: `node scripts/migrate-data.js` |
| Dark mode broken | Toggle theme, clear browser cache |

## 📞 Need Help?

1. **Read**: SETUP.md (full setup guide)
2. **Reference**: scripts/MIGRATION_GUIDE.md (detailed migration)
3. **Overview**: README.md (technical details)
4. **This file**: Quick Reference (cheat sheet)

## 💡 Pro Tips

✅ **Approve tasks in batches** to quickly reach 70% CWP  
✅ **Set realistic approvedValues** based on actual work  
✅ **Use contractor descriptions** to document responsibilities  
✅ **Attach photos in reports** for documentation  
✅ **Schedule draws after hitting 70%** to keep cash flowing  
✅ **Monitor budget line items** to catch overages early  

---

**Remember**: CWP = (Approved Task Values) / $110,000  
**When CWP ≥ 70%**: Draw scheduling unlocks! 🎉
