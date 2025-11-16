import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function initializeFirebase() {
  let serviceAccountPath = path.join(__dirname, './service-account.json');
  let found = fs.existsSync(serviceAccountPath);

  if (!found) {
    serviceAccountPath = path.join(__dirname, './service_account.json');
    found = fs.existsSync(serviceAccountPath);
  }

  if (!found) {
    throw new Error('Service account file not found');
  }

  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

async function clearTasks() {
  try {
    console.log('🗑️  Clearing all tasks...');
    const db = admin.firestore();
    const tasksCollection = db.collection('tasks');

    // Get all documents
    const snapshot = await tasksCollection.get();
    
    if (snapshot.empty) {
      console.log('✓ No tasks to delete');
      process.exit(0);
    }

    // Delete each document
    let count = 0;
    for (const doc of snapshot.docs) {
      await tasksCollection.doc(doc.id).delete();
      count++;
    }

    console.log(`✅ Deleted ${count} tasks`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing tasks:', error.message);
    process.exit(1);
  }
}

initializeFirebase();
clearTasks();
