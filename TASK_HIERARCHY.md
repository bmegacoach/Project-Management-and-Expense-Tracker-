# Task Hierarchy System - Complete Guide

## Database Structure

The tasks are now organized hierarchically in Firestore with the following structure:

```
firestore/
├── phases/
│   ├── phase-1-pre-construction-demolition/
│   │   ├── metadata (document)
│   │   │   ├── name: "Phase 1: Pre-Construction & Demolition"
│   │   │   ├── order: 1
│   │   │   ├── dependentTaskCount: 4
│   │   │   ├── nonDependentTaskCount: 1
│   │   ├── dependentTasks/ (collection)
│   │   │   ├── {taskId}/ (document)
│   │   │   │   ├── id, name, contractor, lineItem, status
│   │   │   │   └── subtasks/ (collection)
│   │   │   │       └── {subtaskId}/ (document)
│   │   │   │           ├── id, name, status
│   │   │   │           ├── createdAt, updatedAt
│   │   │   └── ...more tasks
│   │   └── nonDependentTasks/ (collection)
│   │       ├── {taskId}/ (document)
│   │       │   ├── id, name, contractor, lineItem, status
│   │       │   └── subtasks/ (collection)
│   │       │       └── {subtaskId}/ (document)
│   │       └── ...more tasks
│   ├── phase-2-structural-envelope/
│   ├── phase-3-mep-rough-in/
│   ├── phase-4-interior-finishes-exterior-cladding/
│   └── phase-5-fixtures-appliances-final-touches/
```

## Task Properties

Each task document contains:

```javascript
{
  id: string,                    // Unique identifier
  name: string,                  // Task name
  contractor: string,            // Assigned contractor
  lineItem: string,              // Budget line item reference
  isNonDependency: boolean,      // True for non-dependent tasks
  status: string,                // 'pending' | 'site_completed' | 'pm_approved'
  approvedValue: number,         // Approved budget value
  createdAt: ISO8601,           // Creation timestamp
  updatedAt: ISO8601            // Last update timestamp
}
```

## Subtask Properties

Each subtask document contains:

```javascript
{
  id: string,                    // Unique identifier
  name: string,                  // Subtask name
  status: string,                // 'pending' | 'site_completed' | 'pm_approved'
  createdAt: ISO8601,           // Creation timestamp
  updatedAt: ISO8601            // Last update timestamp
}
```

## CRUD Operations

### Create Tasks

```typescript
// Add a new task to a phase
const phaseRef = doc(db, 'phases', phaseId);
const taskRef = doc(
  phaseRef,
  isNonDependent ? 'nonDependentTasks' : 'dependentTasks',
  taskId
);

await updateDoc(taskRef, {
  name: 'Task Name',
  contractor: 'Contractor Name',
  lineItem: 'Line Item',
  isNonDependency: true,
  status: 'pending',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});
```

### Read Tasks

```typescript
// Get all dependent tasks in a phase
const dependentSnapshot = await getDocs(
  collection(doc(db, 'phases', phaseId), 'dependentTasks')
);

// Get all non-dependent tasks in a phase
const nonDependentSnapshot = await getDocs(
  collection(doc(db, 'phases', phaseId), 'nonDependentTasks')
);

// Get subtasks for a task
const subtasksSnapshot = await getDocs(
  collection(
    doc(doc(db, 'phases', phaseId), collectionName, taskId),
    'subtasks'
  )
);
```

### Update Tasks

```typescript
// Update task properties
const taskRef = doc(
  doc(db, 'phases', phaseId),
  collectionName,
  taskId
);

await updateDoc(taskRef, {
  name: 'Updated Name',
  status: 'site_completed',
  updatedAt: new Date().toISOString()
});

// Update subtask status
const subtaskRef = doc(
  doc(doc(db, 'phases', phaseId), collectionName, taskId),
  'subtasks',
  subtaskId
);

await updateDoc(subtaskRef, {
  status: 'pm_approved',
  updatedAt: new Date().toISOString()
});
```

### Delete Tasks

```typescript
// Delete a task
const taskRef = doc(
  doc(db, 'phases', phaseId),
  collectionName,
  taskId
);
await deleteDoc(taskRef);

// Delete a subtask
const subtaskRef = doc(
  doc(doc(db, 'phases', phaseId), collectionName, taskId),
  'subtasks',
  subtaskId
);
await deleteDoc(subtaskRef);
```

## Real-time Listeners

The Tasks component uses real-time Firestore listeners to automatically update the UI when data changes:

```typescript
// Listen to dependent tasks
const unsubDependent = onSnapshot(
  collection(phaseRef, 'dependentTasks'),
  (snapshot) => {
    // Update UI with new data
  }
);

// Listen to non-dependent tasks
const unsubNonDependent = onSnapshot(
  collection(phaseRef, 'nonDependentTasks'),
  (snapshot) => {
    // Update UI with new data
  }
);

// Listen to subtasks
const unsubSubtasks = onSnapshot(
  collection(taskRef, 'subtasks'),
  (snapshot) => {
    // Update UI with new data
  }
);
```

## Phase IDs

The system uses the following phase identifiers:

1. `phase-1-pre-construction-demolition`
2. `phase-2-structural-envelope`
3. `phase-3-mep-rough-in`
4. `phase-4-interior-finishes-exterior-cladding`
5. `phase-5-fixtures-appliances-final-touches`

## UI Features

### Phase Organization
- Tasks are grouped by phase
- Each phase shows separate sections for dependent and non-dependent tasks
- Phase metadata displays task counts

### Task Management
- **Add Task**: Select phase, enter name, select dependency type
- **Edit Task**: Modify task properties inline
- **Delete Task**: Remove task with confirmation
- **View Details**: Expand task to see subtasks
- **Track Status**: See subtask progress with status badges

### Subtask Management
- View all subtasks in expandable details
- Update subtask status (pending → site_completed → pm_approved)
- Delete individual subtasks
- Real-time status updates

## Migration

To import tasks from `tasks.json`:

```bash
node scripts/migrate-tasks.js
```

This will:
1. Read all tasks from `tasks.json`
2. Group them by phase and dependency type
3. Create hierarchical documents in Firestore
4. Initialize subtasks for each task

## Querying Examples

### Query all tasks in a phase
```typescript
const phaseRef = doc(db, 'phases', 'phase-1-pre-construction-demolition');
const dependentTasks = await getDocs(collection(phaseRef, 'dependentTasks'));
```

### Query tasks by contractor
```typescript
const phaseRef = doc(db, 'phases', 'phase-1-pre-construction-demolition');
const tasksSnap = await getDocs(
  query(
    collection(phaseRef, 'dependentTasks'),
    where('contractor', '==', 'Demolition Crew')
  )
);
```

### Query tasks by status
```typescript
const phaseRef = doc(db, 'phases', 'phase-1-pre-construction-demolition');
const tasksSnap = await getDocs(
  query(
    collection(phaseRef, 'dependentTasks'),
    where('status', '==', 'pending')
  )
);
```

## Data Integrity

- Each task maintains its hierarchy level (phase → dependency type → task)
- Subtasks are nested under their parent task
- Timestamps track creation and modifications
- Real-time listeners ensure UI stays synchronized with database

## Performance Considerations

- Hierarchical structure enables efficient pagination by phase
- Subcollections allow selective loading of subtasks
- Real-time listeners update only affected components
- Document paths are optimized for query efficiency
