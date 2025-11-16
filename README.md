# Project Management & Expense Tracker

A comprehensive React + TypeScript + Firebase application for managing the Briscoe Project construction project, including task tracking, budget management, contractor coordination, and draw scheduling.

## 🎯 Project Overview

**Project Name**: RED CARPET CONTRACTORS - Tech Camp 1  
**Location**: 4821 Briscoe St, Houston, TX 77033  
**Total Budget**: $110,000  
**Project Duration**: 6 months  
**Total Draws**: 4 (Front-loaded)  
**Milestone Gate**: 70% Completed Work Percentage for draw approval

## ✨ Key Features

### 📊 Dashboard
- Real-time project metrics and KPIs
- Project Work Value tracking ($110K)
- Completed Work Percentage (CWP) calculation
- Approved work value display
- Visual progress bar with 70% milestone marker
- Total scheduled draws overview

### 💰 Budget Management
- **Draw Requests**: Create and track fund draw requests
- **Draw Scheduling**: Portfolio Managers can schedule draws (requires 70% CWP)
- **Disbursal Tracking**: Mark draws as disbursed
- **Budget Line Items**: 37 budget categories with:
  - Budgeted amounts
  - Actual spending tracking
  - Remaining budget visualization
  - Color-coded progress bars (Green/Yellow/Red)
- **Summary Stats**: Total budget, spent, and remaining amounts

### 📋 Task Management
- **5 Project Phases**:
  - Phase 1: Pre-Construction & Demolition
  - Phase 2: Structural & Envelope
  - Phase 3: MEP Rough-in
  - Phase 4: Interior Finishes & Exterior Cladding
  - Phase 5: Fixtures, Appliances & Final Touches

- **25 Major Tasks** with sub-tasks
- **Task Status Workflow**: Pending → Site Completed → PM Approved
- **Task Metadata**:
  - Non-Dependency flags (⚡)
  - Budget line item association (📌)
  - Approved dollar values (💵)
  - Contractor assignment
- **Bulk Approval**: Approve multiple tasks at once
- **Sub-Task Management**: Granular work tracking

### 👷 Contractor Management
- **5 Project Contractors/Teams**:
  - Demolition Crew
  - Foundation & Framing Team
  - MEP Specialists
  - Exterior & Envelope Crew
  - Interior Finishing Team

- **Contractor Details**:
  - Name and description
  - Phase assignment
  - Contact information (phone/email)
  - Status tracking
  - Progress metrics (% of assigned work completed)

### 📸 Media Management
- Document, image, and video storage
- Descriptive naming system
- Organized media links
- Firestore-backed storage

### 📊 Daily Reports
- Site progress documentation
- Photo uploads
- Daily notes and observations
- Materials tracking
- Inspection checklists
- Timestamped entries

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS (responsive design)
- **Database**: Firebase Firestore (real-time sync)
- **Build Tool**: Vite
- **Dark Mode**: Built-in theme support
- **Mobile**: Fully responsive (320px to desktop)

## 📁 Project Structure

```
src/
├── App.tsx                 # Main app with routing & PRD initialization
├── ThemeContext.tsx        # Dark mode theme management
├── firebase.ts             # Firebase configuration
├── pages/
│   ├── Dashboard.tsx       # Project overview & metrics
│   ├── Budget.tsx          # Draw requests & budget line items
│   ├── Tasks.tsx           # Task management & approval workflow
│   ├── Contractors.tsx     # Contractor management
│   ├── Media.tsx           # Document/media storage
│   ├── Reports.tsx         # Daily site reports
│   ├── GeminiPro.tsx       # (Optional AI feature)
│   └── AskGemini.tsx       # (Optional AI feature)
├── utils/
│   └── geminiModels.ts     # Gemini AI utilities (optional)
├── index.css               # Global styles
└── main.tsx                # Entry point

scripts/
├── migrate-data.js         # Data migration script
├── MIGRATION_GUIDE.md      # Detailed migration instructions
└── service-account.json    # Firebase admin credentials (add this)

Configuration Files:
├── tsconfig.json           # TypeScript config
├── vite.config.ts          # Vite bundler config
├── tailwind.config.ts      # Tailwind CSS config
├── postcss.config.js       # PostCSS config
├── package.json            # Dependencies
└── index.html              # HTML template
```

## 🚀 Getting Started

### Prerequisites
- Node.js 14+
- Firebase account with Firestore database
- npm or yarn package manager

### Installation

```bash
# Clone or extract the project
cd Project-Management-and-Expense-Tracker-

# Install dependencies
npm install

# Set up environment
# 1. Create Firebase project
# 2. Update src/firebase.ts with your credentials
# 3. Create Firestore database (test mode for development)

# Run development server
npm run dev

# Open http://localhost:5173 in browser
```

### Data Migration

```bash
# Copy your Firebase service account JSON
cp /path/to/service-account.json scripts/

# Run migration
node scripts/migrate-data.js

# Expected result: 25 tasks, 5 contractors, 37 budget items migrated
```

For detailed setup, see: **SETUP.md** and **scripts/MIGRATION_GUIDE.md**

## 📊 Database Collections

### Primary Collections

**tasks** (25 documents)
- Organized by phase
- Contains subtasks
- Tracks approval status and approved values
- Links to budget line items

**contractors** (5 documents)
- Team information
- Phase assignments
- Contact details
- Progress tracking

**budgetLineItems** (37 documents)
- Briscoe project budget categories
- Tracks budgeted vs. spent amounts
- Remaining balance calculation

**draws** (up to 4 documents)
- Draw request amounts
- Status tracking (pending/scheduled/disbursed)
- Scheduling dates
- Task allocation percentages

### Config Documents

**config/project**
- Project metadata (borrower, address, contacts)
- Project duration
- Budget information

**config/prd**
- PRD constants for this project
- PROJECT_WORK_VALUE: $110,000
- TOTAL_SCHEDULED_DRAWS: $127,400
- Interest payments and duration

**media/links**
- Project media and documents
- Organized by type

## 🎨 Features Highlighted

### Mobile Responsive
- Tailwind breakpoints: `sm:` (640px), `md:` (768px), `lg:` (1024px)
- Touch-friendly buttons and inputs
- Optimized for all screen sizes
- Dark mode support

### Real-Time Sync
- Firestore listeners on all collections
- Automatic UI updates when data changes
- Timestamp tracking (createdAt, updatedAt)

### Role-Based Access
- **Site Manager**: View/create reports, view tasks
- **Project Manager**: Approve tasks, set approved values, manage contractors
- **Portfolio Manager**: Schedule draws, disburse funds, view all metrics

### Data Validation
- Type-safe with TypeScript
- Required field validation in forms
- Firestore security rules ready

## 📈 CWP (Completed Work Percentage) Calculation

The 70% milestone gate is calculated as:

```
CWP % = (Sum of PM_Approved Task ApprovedValues) / PROJECT_WORK_VALUE × 100
       = (Sum of Approved Task Amounts) / $110,000 × 100
```

When CWP ≥ 70%:
- ✅ "Schedule Draw" button enables
- Portfolio Manager can request fund disbursement
- Email template auto-populates with project details

## 🔄 Draw Schedule

4 front-loaded draws across the project:
1. **Draw 1** (Initial): Awarded at 70% CWP milestone
2. **Draw 2**: Subsequent request after progress
3. **Draw 3**: Mid-project disbursement
4. **Draw 4**: Final draw

Monthly interest accrual: $2,900

## 🔒 Security

- Firebase Firestore security rules
- Google Cloud authentication ready
- Service account-based admin migrations
- Role-based UI access (client-side)
- Environment variable protection for credentials

## 🎯 Future Enhancements

- [ ] Google Cloud integration
- [ ] PDF report generation
- [ ] Email notifications for approvals
- [ ] Gantt chart for phase visualization
- [ ] Budget forecasting with ML
- [ ] Mobile app (React Native)
- [ ] Advanced analytics dashboard
- [ ] Change order tracking
- [ ] Vendor management
- [ ] Time tracking integration

## 📝 Documents

- **SETUP.md**: Complete setup and migration guide
- **scripts/MIGRATION_GUIDE.md**: Detailed migration instructions
- **README.md** (this file): Project overview and structure

## 🐛 Troubleshooting

**Issue**: "Cannot find Firestore collection"
- **Solution**: Run migration script to create collections

**Issue**: "CWP calculation not updating"
- **Solution**: Ensure tasks have `status: 'pm_approved'` and `approvedValue > 0`

**Issue**: "Budget line items not showing"
- **Solution**: Run migration to populate budgetLineItems collection

**Issue**: Dark mode not working
- **Solution**: Clear browser cache, ensure ThemeContext is loaded

## 📞 Support

For issues or questions:
1. Check SETUP.md and MIGRATION_GUIDE.md
2. Review browser console for errors (F12)
3. Verify Firestore connectivity in DevTools
4. Check that all required collections exist

## 📄 License

This project is created for the Briscoe Project management.

## 🎉 Ready to Build!

The application is fully configured for:
- Managing the Briscoe Project ($110K budget, 6-month duration)
- Tracking 25 tasks across 5 phases
- Managing 5 contractor teams
- Processing 4 front-loaded draws
- Maintaining 37 budget line items
- Real-time collaboration via Firestore
- Mobile-first responsive design

**Start**: Run migration, then open Dashboard to see your project metrics!

---

**Briscoe Project - Tech Camp 1**  
Location: 4821 Briscoe St, Houston, TX 77033  
Project Manager: Maurice | Portfolio Manager: Troy | Principal: Wallace
