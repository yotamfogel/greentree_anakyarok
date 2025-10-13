# PostgreSQL Operations Guide

This document lists all PostgreSQL database operations in the codebase with their exact locations. Each operation is marked with a specific comment for easy searching and modification in offline networks.

## Search Tips
Use your IDE's search function (Ctrl+Shift+F in most editors) to find these comments:
- `# Fetching data from Postgres`
- `# Saving data to Postgres`
- `# Updating data in Postgres`
- `# Deleting data from Postgres`
- `# Creating tables in Postgres`

---

## 1. FETCHING DATA FROM POSTGRES

### File: `src/services/postgreSQLService.ts`

#### Load Sagachim Status (Line ~187)
```typescript
// # Fetching data from Postgres
const result = await this.pool.query('SELECT * FROM sagachim_status ORDER BY last_modified_at DESC')
```

#### Load Sagachs (Line ~210)
```typescript
// # Fetching data from Postgres
const result = await this.pool.query('SELECT * FROM sagachs ORDER BY last_modified_at DESC')
```

#### Get Recent Changes (Audit Trail) (Line ~399)
```typescript
// # Fetching data from Postgres
const result = await this.pool.query(
  'SELECT * FROM data_changes ORDER BY timestamp DESC LIMIT $1',
  [limit]
)
```

### File: `src/contexts/SagachDataContext.tsx`

#### Load All Data on Initialization (Line ~311)
```typescript
// # Fetching data from Postgres
const [sagachData, statusData] = await Promise.all([
  databaseService.loadSagachs(),
  databaseService.loadSagachimStatus()
])
```

### File: `src/services/notificationService.ts`

#### Load Sagachim for Notifications (Line ~126)
```typescript
// # Fetching data from Postgres
const sagachim = await this.dbService.loadSagachimStatus()
```

---

## 2. SAVING DATA TO POSTGRES

### File: `src/services/postgreSQLService.ts`

#### Save Sagachim Status (Line ~276)
**Note:** This uses UPSERT (INSERT ... ON CONFLICT UPDATE), so it saves AND updates
```typescript
// # Saving data to Postgres (also updates existing records)
await this.pool.query(query, values)
```

#### Save Sagach (Line ~311)
**Note:** This uses UPSERT (INSERT ... ON CONFLICT UPDATE), so it saves AND updates
```typescript
// # Saving data to Postgres (also updates existing records)
await this.pool.query(query, [
  sagach.id, sagach.name, JSON.stringify(sagach.data),
  JSON.stringify(sagach.versions), sagach.currentVersion,
  sagach.createdBy, sagach.createdAt, sagach.lastModifiedBy, sagach.lastModifiedAt
])
```

#### Log Data Change (Audit Trail) (Line ~378)
```typescript
// # Saving data to Postgres
await this.pool.query(
  'INSERT INTO data_changes (event_type, event_data, user_id, user_name) VALUES ($1, $2, $3, $4)',
  [eventType, JSON.stringify(eventData), userId, userName]
)
```

### File: `src/contexts/SagachDataContext.tsx`

#### Save Sagachs (Line ~225)
```typescript
// # Saving data to Postgres
await Promise.all(data.map((sagach: SagachTable) => dbService.saveSagach(sagach)))
```

#### Save Sagachim Status (Line ~228)
```typescript
// # Saving data to Postgres
await Promise.all(data.map((item: SagachimStatusItem) => dbService.saveSagachimStatus(item)))
```

#### Log Change Events (Line ~261)
```typescript
// # Saving data to Postgres
if (useDatabase && dbService && dbService.isDatabaseConnected() && user) {
  try {
    await dbService.logDataChange(event.type, event.data, event.userId, event.userName)
```

---

## 3. UPDATING DATA IN POSTGRES

**Note:** Most updates are handled through the UPSERT operations in "Saving data" section above.

### File: `src/services/notificationService.ts`

#### Update Notification Subscriber Timestamp (Line ~308)
```typescript
// # Updating data in Postgres
try {
  const updatedSubscribers = (sagach.notificationSubscribers || []).map(sub => 
    sub.userId === subscriber.userId 
      ? { ...sub, lastNotificationSent: new Date().toISOString() }
      : sub
  )
  
  await this.dbService.updateSagachimStatus(sagach.id, {
    ...sagach,
    notificationSubscribers: updatedSubscribers
  })
```

---

## 4. DELETING DATA FROM POSTGRES

### File: `src/services/postgreSQLService.ts`

#### Delete Sagachim Status (Line ~338)
```typescript
// # Deleting data from Postgres
await this.pool.query('DELETE FROM sagachim_status WHERE id = $1', [id])
```

#### Delete Sagach (Line ~360)
```typescript
// # Deleting data from Postgres
await this.pool.query('DELETE FROM sagachs WHERE id = $1', [id])
```

### File: `src/contexts/SagachDataContext.tsx`

#### Delete Sagach (Line ~529)
```typescript
// # Deleting data from Postgres
if (useDatabase && dbService && dbService.isDatabaseConnected()) {
  try {
    await dbService.deleteSagach(id)
```

#### Delete Sagachim Status (Line ~629)
```typescript
// # Deleting data from Postgres
if (useDatabase && dbService && dbService.isDatabaseConnected()) {
  try {
    await dbService.deleteSagachimStatus(id)
```

---

## 5. CREATING TABLES IN POSTGRES

### File: `src/services/postgreSQLService.ts`

#### Create All Tables (Line ~110)
```typescript
// # Creating tables in Postgres
await this.pool.query(`
  CREATE TABLE IF NOT EXISTS sagachim_status (
    id VARCHAR(255) PRIMARY KEY,
    ...
  )
`)
```
**Tables Created:**
1. `sagachim_status` - Main sagachim status tracking
2. `sagachs` - Sagach data storage
3. `data_changes` - Audit trail for all changes

---

## Database Tables Schema

### Table: `sagachim_status`
Stores the status and tracking information for sagachim.

### Table: `sagachs`
Stores sagach data with versioning.

### Table: `data_changes`
Audit trail for all data modifications.

---

## Offline Network Modifications

When working in an offline network without PostgreSQL:

1. **Search for these comments** using your IDE's global search
2. **Comment out or modify** the PostgreSQL operations
3. **Ensure localStorage fallback** is working (already implemented)
4. The app will automatically fall back to localStorage if PostgreSQL is unavailable

## Files to Check for PostgreSQL Usage

1. `src/services/postgreSQLService.ts` - Main database service
2. `src/contexts/SagachDataContext.tsx` - Data context with DB operations
3. `src/services/notificationService.ts` - Notification system with DB operations
4. `src/components/DatabaseConfig.tsx` - Database configuration UI
5. `src/components/DatabaseStatus.tsx` - Database status display
6. `src/config/databaseConfig.ts` - Database configuration

---

## Visual Indicators

All PostgreSQL operations in the console are marked with 🐘 emoji:
- `🐘 ✅` - Successful operations
- `🐘 ❌` - Failed operations
- `🐘 ⚠️` - Warnings
- `🐘 💾` - Save operations
- `🐘 📥` - Load operations
- `🐘 🗑️` - Delete operations

---

*Last Updated: 2025-10-13*

