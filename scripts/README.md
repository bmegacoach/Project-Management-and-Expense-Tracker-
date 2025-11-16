# Migration Script - Technical Notes

## Problem Solved

The original migration script was using CommonJS (`require`) syntax, but your `package.json` has `"type": "module"`, which means all `.js` files are treated as ES modules.

**Error was**: `ReferenceError: require is not defined in ES module scope`

**Solution**: Converted the migration script to use ES module syntax (`import`/`export`).

## What Changed

### Before (CommonJS)
```javascript
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
```

### After (ES Modules)
```javascript
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```

Note: ES modules don't have `__dirname` by default, so we recreate it from `import.meta.url`.

## How to Run

```bash
# First time only - install migration dependencies
npm install firebase-admin

# Place your service account JSON in scripts/service-account.json
# Then run:
node scripts/migrate-data.js
```

## Dependencies

The migration script now requires:
- `firebase-admin`: Already installed via `npm install firebase-admin`
- Node.js 16+ (you have 22.20.0, so you're good!)
- A Firebase service account JSON file

## File

- Location: `scripts/migrate-data.js`
- Type: ES Module (`.js` file, uses `import` syntax)
- No TypeScript needed (plain JavaScript)

## Migration Checklist

- [x] Converted to ES modules syntax
- [x] Added proper error handling
- [x] Support for environment variables
- [x] Support for local service-account.json
- [x] Clear error messages
- [x] Firebase Admin SDK initialization
- [x] Data transformation logic
- [x] Firestore uploads for all collections
- [x] Success and error reporting

---

For full documentation, see: `scripts/MIGRATION_GUIDE.md`
