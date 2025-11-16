import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============================================================================
// FIREBASE INITIALIZATION
// ============================================================================

async function initializeFirebase() {
  console.log('🔐 Initializing Firebase...');

  let serviceAccountPath = path.join(__dirname, './service-account.json');
  let found = fs.existsSync(serviceAccountPath);

  if (!found) {
    serviceAccountPath = path.join(__dirname, './service_account.json');
    found = fs.existsSync(serviceAccountPath);
  }

  if (!found) {
    throw new Error('Service account file not found');
  }

  try {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log(`✓ Firebase Admin SDK initialized`);
  } catch (error) {
    throw new Error(`Failed to initialize Firebase: ${error.message}`);
  }
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function sanitizeId(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]/g, '')
    .substring(0, 255);
}

function transformTask(task) {
  return {
    id: task.id,
    name: task.name,
    title: task.name,
    phase: task.phase,
    contractor: task.contractor || '',
    lineItem: task.lineItem || '',
    isNonDependency: task.isNonDependency || false,
    approvedValue: 0,
    status: 'pending',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

// ============================================================================
// MIGRATION LOGIC
// ============================================================================

async function migrateTasksWithHierarchy(db, tasksData) {
  console.log('\n📋 Migrating tasks with hierarchy...');

  // Map phase names to IDs
  const phaseNameToId = {
    'Phase 1: Pre-Construction & Demolition': 'phase-1-pre-construction-demolition',
    'Phase 2: Structural & Envelope': 'phase-2-structural-envelope',
    'Phase 3: MEP Rough-in': 'phase-3-mep-rough-in',
    'Phase 4: Interior Finishes & Exterior Cladding': 'phase-4-interior-finishes-exterior-cladding',
    'Phase 5: Fixtures, Appliances & Final Touches': 'phase-5-fixtures-appliances-final-touches'
  };

  // Group tasks by phase
  const tasksByPhase = {};
  tasksData.tasks.forEach(task => {
    if (!tasksByPhase[task.phase]) {
      tasksByPhase[task.phase] = { dependent: [], nonDependent: [] };
    }
    if (task.isNonDependency) {
      tasksByPhase[task.phase].nonDependent.push(task);
    } else {
      tasksByPhase[task.phase].dependent.push(task);
    }
  });

  let totalCount = 0;

  // Iterate through each phase
  for (const [phaseName, tasksInPhase] of Object.entries(tasksByPhase)) {
    console.log(`\n  📍 ${phaseName}`);

    // Get the standardized phase ID
    const phaseId = phaseNameToId[phaseName] || sanitizeId(phaseName);
    const phaseRef = db.collection('phases').doc(phaseId);

    // First, create/update phase metadata
    await phaseRef.set({
      name: phaseName,
      order: Object.keys(tasksByPhase).indexOf(phaseName) + 1,
      dependentTaskCount: tasksInPhase.dependent.length,
      nonDependentTaskCount: tasksInPhase.nonDependent.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }, { merge: true });

    // Store dependent tasks
    console.log(`    ✓ Dependent tasks (${tasksInPhase.dependent.length})`);
    for (const task of tasksInPhase.dependent) {
      try {
        const taskId = sanitizeId(task.id);
        const transformedTask = transformTask(task);

        // Save task to: phases/{phaseId}/dependentTasks/{taskId}
        const taskRef = phaseRef.collection('dependentTasks').doc(taskId);
        await taskRef.set(transformedTask);

        // Save subtasks
        if (task.subTasks && task.subTasks.length > 0) {
          for (const subTask of task.subTasks) {
            const subtaskRef = taskRef.collection('subtasks').doc(subTask.id);
            await subtaskRef.set({
              id: subTask.id,
              name: subTask.name,
              status: subTask.status || 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }

        totalCount++;
      } catch (error) {
        console.error(`    ❌ Error migrating task ${task.id}:`, error.message);
      }
    }

    // Store non-dependent tasks
    console.log(`    ✓ Non-dependent tasks (${tasksInPhase.nonDependent.length})`);
    for (const task of tasksInPhase.nonDependent) {
      try {
        const taskId = sanitizeId(task.id);
        const transformedTask = transformTask(task);

        // Save task to: phases/{phaseId}/nonDependentTasks/{taskId}
        const taskRef = phaseRef.collection('nonDependentTasks').doc(taskId);
        await taskRef.set(transformedTask);

        // Save subtasks
        if (task.subTasks && task.subTasks.length > 0) {
          for (const subTask of task.subTasks) {
            const subtaskRef = taskRef.collection('subtasks').doc(subTask.id);
            await subtaskRef.set({
              id: subTask.id,
              name: subTask.name,
              status: subTask.status || 'pending',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
          }
        }

        totalCount++;
      } catch (error) {
        console.error(`    ❌ Error migrating task ${task.id}:`, error.message);
      }
    }
  }

  console.log(`\n  ✅ Migrated ${totalCount} tasks with all subtasks`);
  return totalCount;
}

// ============================================================================
// MAIN MIGRATION PROCESS
// ============================================================================

async function migrate() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('TASKS DATA MIGRATION WITH HIERARCHY');
    console.log('='.repeat(70));

    // Initialize Firebase
    await initializeFirebase();

    // Load tasks.json
    console.log('\n📂 Loading tasks.json...');
    const tasksPath = path.join(__dirname, './tasks.json');
    const tasksData = JSON.parse(fs.readFileSync(tasksPath, 'utf8'));
    console.log(`  ✓ Loaded ${tasksData.tasks.length} tasks`);

    const db = admin.firestore();

    // Migrate with hierarchy
    const count = await migrateTasksWithHierarchy(db, tasksData);

    // Summary
    console.log('\n' + '='.repeat(70));
    console.log('✅ MIGRATION COMPLETED SUCCESSFULLY');
    console.log('='.repeat(70));
    console.log(`
Database Structure:
  phases/
    ├── {phaseId}/
    │   ├── metadata (name, order, task counts)
    │   ├── dependentTasks/
    │   │   └── {taskId}/
    │   │       ├── task data
    │   │       └── subtasks/{subtaskId}
    │   └── nonDependentTasks/
    │       └── {taskId}/
    │           ├── task data
    │           └── subtasks/{subtaskId}

Summary:
  📋 Total Tasks: ${count}
  🏗️  Phases: ${Object.keys(JSON.parse(fs.readFileSync(tasksPath, 'utf8')).tasks.reduce((acc, t) => {
    if (!acc[t.phase]) acc[t.phase] = true;
    return acc;
  }, {})).length}

Ready for:
  ✓ Read - Query tasks by phase, dependency type, status
  ✓ Create - Add new tasks/subtasks at any level
  ✓ Update - Modify task properties, subtask status
  ✓ Delete - Remove tasks or subtasks
    `);

    process.exit(0);
  } catch (error) {
    console.error('\n❌ MIGRATION FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run migration
migrate();
