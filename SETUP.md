# Project Management & Expense Tracker - Setup & Migration Guide

Welcome to the Briscoe Project Management application! This guide will help you set up and migrate your project data.

## 📋 What's New in This Version

✅ **Mobile-Responsive Design**: All pages are fully responsive with Tailwind breakpoints (mobile-first)
✅ **PRD Implementation**: Full PRD (Project Requirements Document) integration
✅ **Data Migration**: Migrate legacy data.json to Firebase Firestore
✅ **Budget Line Items**: Complete budget breakdown with spending tracking
✅ **Contractor Descriptions**: Added description fields for all contractors
✅ **Task Enhancement**: New fields for non-dependency tasks, line items, and approved values

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Firebase

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Create a Firestore database (Start in test mode for development)
3. Download your Firebase config from: Project Settings → Web App
4. Update `src/firebase.ts` with your credentials

### 3. Run the Application

```bash
npm run dev
```

Open http://localhost:5173 in your browser.

## 📦 Database Schema

### Collections

#### **tasks**
```javascript
{
  title: string,
  name: string,
  phase: string,
  isNonDependency: boolean,
  lineItem: string,           // e.g., "Permits", "Foundation/Footing/Slab"
  contractor: string,
  approvedValue: number,      // $0 initially, set during approval
  status: "pending",
  subtasks: [
    { id: string, title: string, status: "pending" | "site_completed" | "pm_approved" }
  ],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **contractors**
```javascript
{
  name: string,
  description: string,        // e.g., "Responsible for all demolition and site clearing."
  phase: string,
  phone: string,
  email: string,
  status: "active" | "inactive",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **budgetLineItems**
```javascript
{
  name: string,              // e.g., "Permits", "Roofing", "HVAC"
  value: number,             // Budgeted amount
  spent: number,             // Amount spent so far
  remaining: number,         // value - spent
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### **draws**
```javascript
{
  drawNumber: number,
  amount: number,
  status: "pending" | "scheduled" | "disbursed",
  taskAllocation: number,    // Percentage of work for draw (0.25 for 25%)
  interestMonths: number,
  scheduledAt: string        // ISO date string
}
```

#### **config/project**
```javascript
{
  borrower: string,
  propertyAddress: string,
  contactPhone: string,
  contactEmail: string,
  totalBudget: number,
  projectDurationMonths: number,
  interestPaymentPerMonth: number,
  numDraws: number,
  contacts: [
    { role: string, name: string }
  ]
}
```

#### **config/prd**
```javascript
{
  PROJECT_WORK_VALUE: 110000,           // $110K
  TOTAL_SCHEDULED_DRAWS: 127400,        // $127.4K
  MONTHLY_INTEREST: 2900,               // $2,900/month
  PROJECT_DURATION_MONTHS: 6,
  PROPERTY_ADDRESS: string,
  PROJECT_NAME: string
}
```

#### **media/links**
```javascript
{
  items: [
    { id: string, name: string, link: string, type: "document" | "image" | "video" }
  ]
}
```

## 🔄 Data Migration Steps

### ⚠️ Important: Service Account vs Web Credentials

Your `.env.local` contains **web credentials** (VITE_FIREBASE_*) - these are for your browser app.

The migration script needs **service account credentials** - they're different and much more powerful.

**Do NOT put service account in `.env.local`** - it's a security risk!

### Step 1: Get Firebase Service Account Credentials

1. Go to Firebase Console → Your Project: **tech-camp-construction-project**
2. Click ⚙️ **Settings** (gear icon, top left)
3. Go to **Service Accounts** tab
4. Click **Generate New Private Key** button
5. A JSON file downloads - **this is your service account**
6. Keep it **PRIVATE** - don't commit to git!

### Step 2: Set Up Migration Environment

**Option A: Place file in scripts/ (Easiest)**
1. Save downloaded JSON as `scripts/service-account.json`
2. Skip to Step 3

**Option B: Use environment variable**

Windows PowerShell:
```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\service-account.json"
```

macOS/Linux:
```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"
```

### Step 3: Run Migration Script

```bash
npm install firebase-admin
node scripts/migrate-data.js
```

**Expected Output:**
```
✓ Loaded service account from scripts/service-account.json
✓ Firebase Admin SDK initialized

🚀 Starting data migration...

📋 Migrating tasks...
  ✓ Created task: Permit Finalization
  ... (24 more tasks)

👷 Migrating contractors...
  ✓ Created contractor: Demolition Crew
  ... (4 more contractors)

💰 Migrating budget line items...
  ✓ Created line item: Permits - $4000
  ... (36 more items)

🏗️ Migrating project metadata...
  ✓ Created project metadata

⚙️ Updating PRD configuration...
  ✓ Updated PRD configuration

✅ Data migration completed successfully!

Summary:
  • 25 tasks migrated
  • 5 contractors migrated
  • 37 budget line items migrated
  • Project metadata configured
```

### Step 4: Verify Migration

1. Open the app and go to **Dashboard** → Check that metrics load correctly
2. Go to **Tasks** → Verify all 25 tasks display with their phases and contractors
3. Go to **Contractors** → Check that contractor names and descriptions appear
4. Go to **Budget** → See the 37 budget line items with visual progress bars
5. Go to **Reports** → You can now create daily site reports

## 🎯 Key Features Explained

### Dashboard
- **Project Work Value**: Total $110,000 for the Briscoe Project
- **Completed Work Percentage**: Shows progress toward 70% milestone
- **Approved Work Value**: Sum of all tasks marked as "pm_approved"
- **Total Scheduled Draws**: $127,400 across 4 draws

### Budget Management
- **Add Draw Requests**: Create new draw requests (Portfolio Manager only)
- **Schedule Draw**: Requires 70% CWP (Completed Work Percentage) - enables draw scheduling
- **Budget Line Items**: Tracks spending for each budget category
  - Green: ≤50% spent
  - Yellow: 50-90% spent
  - Red: >90% spent

### Tasks Workflow
1. **Pending** → Site work begins
2. **Site Completed** → Sub-tasks finished on site
3. **PM Approved** → Project Manager approves and sets approvedValue
   - This amount contributes to CWP percentage
   - Milestone gate: 70% CWP needed for draw scheduling

### Task Metadata
- **⚡ Non-Dependency**: Independent tasks that don't block others
- **📌 Line Item**: Budget category this task belongs to
- **💵 Approved Value**: Dollar amount allocated to this task (PM sets after approval)

## 📱 Responsive Design

The app works perfectly on:
- **Mobile** (320px+): Single column, large touch targets
- **Tablet** (640px+): Two-column layouts where appropriate
- **Desktop** (1024px+): Full multi-column layouts

All colors and text scale responsively using Tailwind's `sm:`, `md:`, `lg:` prefixes.

## 🔐 Firebase Security Rules

For development (test mode):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

For production, set up proper authentication and role-based rules.

## 🎓 Page Guide

### Dashboard
- **Purpose**: High-level project overview
- **Key Metrics**: Work Value, CWP %, Approved Work, Total Draws
- **Users**: Everyone

### Budget
- **Purpose**: Manage draw requests and budget line items
- **Features**: Add draws, schedule (with 70% gate), view budget breakdown
- **Users**: Portfolio Managers (schedule/disburse), PMs (view)

### Tasks
- **Purpose**: Track project work phases and sub-tasks
- **Workflow**: Pending → Site Completed → PM Approved
- **Features**: Bulk approve, set approvedValue, view non-dependency tasks

### Contractors
- **Purpose**: Manage project teams and their progress
- **Info**: Name, description, phase, contact, % of assigned work completed
- **Users**: Everyone can view, PMs can manage

### Media
- **Purpose**: Store project documents, images, and videos
- **Features**: Upload with descriptive names and links
- **Organization**: Organized by media type

### Reports
- **Purpose**: Daily site progress documentation
- **Features**: Photo uploads, notes, materials, checklist items
- **Users**: Site managers create, everyone can view

## ❓ Troubleshooting

### Migration Fails: "Service account not found"
**Solution**: 
- Set `GOOGLE_APPLICATION_CREDENTIALS` environment variable, OR
- Copy service-account.json to `scripts/` folder

### Budget Line Items Not Showing
**Solution**: Run the migration script to populate the `budgetLineItems` collection

### Tasks Not Updating
**Solution**: Clear browser cache and reload - Firestore real-time listeners update automatically

### 70% Milestone Not Enabling Draw Schedule
**Issue**: CWP hasn't reached 70%
**Solution**: 
1. Go to Tasks
2. Move tasks to "pm_approved" status
3. Set their approvedValue amounts
4. Dashboard will recalculate CWP percentage

## 📞 Support

For issues:
1. Check the console for error messages (F12 → Console)
2. Verify Firebase connection in browser DevTools → Network
3. Check that all required Firestore collections exist
4. Ensure service account has proper permissions

## 🔄 Updating Approvals

To increase CWP and unlock draw scheduling:

1. Go to **Tasks** page
2. Select tasks to approve
3. Click "Bulk Approve" (or approve individually)
4. Set **approvedValue** for each task (dollar amount)
5. **Dashboard** will recalculate CWP automatically
6. When CWP ≥ 70%, "Schedule Draw" button enables

Formula: `CWP % = (Sum of Approved Values) / $110,000 × 100`

---

## 🎉 You're Ready!

The application is fully set up with:
- ✅ Mobile-responsive design
- ✅ Real-time Firebase Firestore sync
- ✅ Complete PRD constants integrated
- ✅ Budget line items tracking
- ✅ Migration script ready for data import
- ✅ Role-based features (Portfolio Manager, Project Manager, Site Manager)

Start by running the migration script to populate your data, then explore the Dashboard!

For detailed migration instructions, see: `scripts/MIGRATION_GUIDE.md`
