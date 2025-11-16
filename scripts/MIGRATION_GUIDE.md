# Data Migration Guide - Briscoe Project

This guide explains how to migrate data from `data.json` to Firebase Firestore.

## ⚠️ Important: Service Account vs Web Credentials

Your `.env.local` contains **web credentials** (VITE_FIREBASE_*) used by the browser app.

The migration script requires **service account credentials** - these are different and much more powerful.

### What You Have vs What You Need

| Type | Location | Used By | Purpose |
|------|----------|---------|---------|
| **Web Credentials** | `.env.local` (VITE_*) | Browser app | Client-side access, limited permissions |
| **Service Account** | `service-account.json` | Migration script | Admin access, full Firestore write access |

**Do NOT put your service account in `.env.local`** - it's a security risk!

## Prerequisites

1. **Node.js**: Ensure you have Node.js 14+ installed
2. **Firebase Admin SDK**: Already installed as part of project dependencies
3. **Service Account Key**: Download from Firebase Console (⚠️ Different from `.env.local`)

## Getting Your Firebase Service Account Key

⚠️ **This is different from your web credentials in `.env.local`**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **tech-camp-construction-project**
3. Click ⚙️ **Settings** (gear icon, top left)
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key** button
6. A JSON file downloads - **this is your service account**
7. Keep this file **PRIVATE** - don't commit to git!

## Running the Migration

### Option 1: Place service-account.json in scripts/ (Easiest)

1. Download service account JSON from Firebase Console (see above)
2. Save it as `scripts/service-account.json`
3. Run:
```bash
npm install firebase-admin  # Only needed first time
node scripts/migrate-data.js
```

### Option 2: Using Environment Variable

```bash
npm install firebase-admin  # Only needed first time
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json node scripts/migrate-data.js
```

On Windows PowerShell:
```powershell
npm install firebase-admin  # Only needed first time
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\path\to\service-account.json"
node scripts/migrate-data.js
```

## What Gets Migrated

### 1. **Tasks Collection** (25 tasks)
- Task title, phase, contractor, line item
- Dependency flags (isNonDependency)
- Sub-tasks with status tracking
- Auto-initialized with status: 'pending', approvedValue: 0

### 2. **Contractors Collection** (5 contractors)
- Name, description, phase, contact info
- Status (active/inactive)
- Timestamps for tracking

### 3. **Budget Line Items Collection** (37 line items)
- Item name and budgeted value
- Spent and remaining amounts (initialized to 0 and budgeted value)
- All items from the data.json budgetLineItems object

### 4. **Project Metadata** (config/project document)
- Borrower info, property address, contacts
- Project duration, budget, interest payment
- Number of draws

### 5. **PRD Configuration** (config/prd document)
- PROJECT_WORK_VALUE: $110,000
- TOTAL_SCHEDULED_DRAWS: $127,400
- MONTHLY_INTEREST: $2,900
- Project metadata from data.json

## Post-Migration Tasks

After running the migration script:

1. **Verify Data**: Check Firebase Console to ensure all documents are created
2. **Test UI**: Open the app and verify:
   - Dashboard shows correct totals
   - Tasks display with all metadata
   - Contractors show descriptions
   - Budget line items are accessible
3. **Update Approvals**: Go to Dashboard → Budget, update approvedValue for tasks as needed

## Troubleshooting

### "Service account not found"
- ✅ Place service-account.json in `scripts/` directory, OR
- ✅ Set GOOGLE_APPLICATION_CREDENTIALS environment variable
- ✅ Verify file path is correct and file is readable

### "Invalid service account JSON"
- ❌ Don't use credentials from `.env.local` - those are web credentials
- ✅ Download fresh service account from Firebase Console
- ✅ Should contain: `type: "service_account"`, `private_key`, `project_id`

### "Permission denied" errors
- Service account may not have Firestore write permissions
- Go to Firebase Console → IAM → Ensure service account has "Editor" role
- Or go to Firestore → Rules and ensure service account can write

### "tech-camp-construction-project not found"
- Service account from different Firebase project
- Verify you downloaded from correct Firebase project
- Check `project_id` in service account JSON matches your project

## 🔒 Security Notes

⚠️ **IMPORTANT**: 
- Service account credentials are ADMIN - they can do anything in your Firebase project
- **NEVER commit `service-account.json` to git**
- **NEVER put it in `.env.local`** - that's exposed in the browser
- Add `service-account.json` to `.gitignore`
- Delete the file after migration is complete

## Rollback / Deletion

If you need to delete migrated data:

```javascript
// In Firebase Console Firestore:
// 1. Go to Collections
// 2. Select "tasks", right-click on collection
// 3. Click "Delete collection"
// 4. Repeat for: contractors, budgetLineItems, config
```

Or use Firebase Admin SDK:

```javascript
const admin = require('firebase-admin');
// ... initialize admin ...

async function deleteCollections() {
  const collections = ['tasks', 'contractors', 'budgetLineItems'];
  for (const collection of collections) {
    const snapshot = await admin.firestore().collection(collection).get();
    for (const doc of snapshot.docs) {
      await doc.ref.delete();
    }
  }
}
```

## Success Indicators

After successful migration, you should see output like:

```
✓ Loaded service account from scripts/service-account.json
✓ Firebase Admin SDK initialized

🚀 Starting data migration...

📋 Migrating tasks...
  ✓ Created task: Permit Finalization
  ✓ Created task: Mobile Home Setup
  ... (23 more tasks)

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

## Questions?

Check the app's Firebase configuration in `src/firebase.ts` or review the migration script at `scripts/migrate-data.js`.
