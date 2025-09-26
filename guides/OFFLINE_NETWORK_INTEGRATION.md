# מדריך אינטגרציה לרשת אופליין - Offline Network Integration Guide

## סקירה כללית / Overview

מדריך זה מפרט כיצד להעביר את אתר העץ הירוק לרשת אופליין ולהתחבר למערכת הרשאות ולאחסון נתונים מרכזי של הרשת.

This guide details how to move The Green Tree website to an offline network and connect to the network's permission system and centralized data storage.

---

## 1. מבנה הנתונים הנוכחי / Current Data Structure

### 1.1 מערכת הרשאות / Permission System

**מיקום:** `src/contexts/PermissionContext.tsx`

**תפקידים קיימים:**
- `viewer` - צופה (הרשאות צפייה בלבד)
- `editor` - עורך (צפייה + הודעות)
- `admin` - מנהל (הרשאות מלאות)

**הרשאות מוגדרות:**
```typescript
export type Permission = 
  | 'edit_status'      // עריכת סטטוסים
  | 'create_sagach'    // יצירת סג"חים
  | 'delete_sagach'    // מחיקת סג"חים
  | 'chat_message'     // הודעות בצ'אט
  | 'manage_users'     // ניהול משתמשים
  | 'view_all'         // צפייה בכל הנתונים
```

### 1.2 נתוני סג"חים / Sagach Data

**מיקום:** `src/contexts/SagachDataContext.tsx`

**מבנה נתונים:**
- **SagachTable**: טבלאות סג"חים עם גרסאות
- **SagachimStatusItem**: פריטי סטטוס סג"חים
- **אחסון מקומי**: localStorage עם מפתחות:
  - `shared_sagach_data`
  - `shared_sagachim_status_data`
  - `shared_data_changes`

---

## 2. הכנות להעברה לרשת אופליין / Preparation for Offline Network

### 2.1 יצירת חבילת אופליין / Creating Offline Package

**שלב 1: בניית הפרויקט**
```bash
npm run build
```

**שלב 2: העתקת קבצים**
```bash
# העתק את תוכן תיקיית dist/ לתיקיית offline_package/
cp -r dist/* offline_package/
```

**שלב 3: יצירת קובץ הפעלה**
צור קובץ `start_offline.bat` (Windows) או `start_offline.sh` (Linux/Mac):

```batch
@echo off
echo Starting The Green Tree Offline...
start "" "offline_package/index.html"
```

### 2.2 הגדרת שרת מקומי / Local Server Setup

**אפשרות 1: Python HTTP Server**
```bash
cd offline_package
python -m http.server 8080
```

**אפשרות 2: Node.js HTTP Server**
```bash
npm install -g http-server
cd offline_package
http-server -p 8080
```

---

## 3. אינטגרציה עם מערכת הרשאות של הרשת / Network Permission System Integration

### 3.1 יצירת API Client

צור קובץ `src/services/NetworkAPI.ts`:

```typescript
interface NetworkUser {
  id: string
  name: string
  email: string
  role: 'viewer' | 'editor' | 'admin'
  department?: string
  clearanceLevel?: number
}

interface NetworkPermission {
  id: string
  name: string
  description: string
  resource: string
  action: string
}

class NetworkAPI {
  private baseURL: string
  private authToken: string | null = null

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  // התחברות לרשת
  async authenticate(username: string, password: string): Promise<NetworkUser> {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    
    if (!response.ok) {
      throw new Error('Authentication failed')
    }
    
    const data = await response.json()
    this.authToken = data.token
    return data.user
  }

  // קבלת הרשאות משתמש
  async getUserPermissions(userId: string): Promise<NetworkPermission[]> {
    const response = await fetch(`${this.baseURL}/users/${userId}/permissions`, {
      headers: { 'Authorization': `Bearer ${this.authToken}` }
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch permissions')
    }
    
    return response.json()
  }

  // בדיקת הרשאה ספציפית
  async checkPermission(resource: string, action: string): Promise<boolean> {
    const response = await fetch(`${this.baseURL}/permissions/check`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.authToken}`
      },
      body: JSON.stringify({ resource, action })
    })
    
    return response.ok
  }
}

export default NetworkAPI
```

### 3.2 עדכון PermissionContext

עדכן את `src/contexts/PermissionContext.tsx`:

```typescript
import NetworkAPI from '../services/NetworkAPI'

// הוסף מצב רשת
interface NetworkConfig {
  enabled: boolean
  baseURL: string
  api: NetworkAPI | null
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const [networkConfig, setNetworkConfig] = useState<NetworkConfig>({
    enabled: false,
    baseURL: '',
    api: null
  })

  // בדיקת חיבור לרשת
  const checkNetworkConnection = async () => {
    try {
      const response = await fetch('/api/health', { timeout: 5000 })
      return response.ok
    } catch {
      return false
    }
  }

  // התחברות לרשת
  const loginToNetwork = async (username: string, password: string) => {
    if (!networkConfig.api) {
      throw new Error('Network API not configured')
    }

    const user = await networkConfig.api.authenticate(username, password)
    const permissions = await networkConfig.api.getUserPermissions(user.id)
    
    // המרת הרשאות רשת להרשאות מקומיות
    const localPermissions = convertNetworkPermissions(permissions)
    
    setUser({
      ...user,
      permissions: localPermissions
    })
  }

  // המרת הרשאות רשת
  const convertNetworkPermissions = (networkPermissions: NetworkPermission[]): Permission[] => {
    const permissionMap: Record<string, Permission> = {
      'sagach:edit': 'edit_status',
      'sagach:create': 'create_sagach',
      'sagach:delete': 'delete_sagach',
      'chat:message': 'chat_message',
      'users:manage': 'manage_users',
      'data:view': 'view_all'
    }

    return networkPermissions
      .map(p => permissionMap[`${p.resource}:${p.action}`])
      .filter(Boolean) as Permission[]
  }
}
```

---

## 4. אינטגרציה עם אחסון נתונים מרכזי / Centralized Data Storage Integration

### 4.1 יצירת Data Sync Service

צור קובץ `src/services/DataSyncService.ts`:

```typescript
interface SyncConfig {
  enabled: boolean
  serverURL: string
  syncInterval: number
  conflictResolution: 'server' | 'client' | 'manual'
}

interface SyncStatus {
  lastSync: Date | null
  pendingChanges: number
  isOnline: boolean
  conflicts: DataConflict[]
}

interface DataConflict {
  id: string
  type: 'sagach' | 'status'
  localData: any
  serverData: any
  timestamp: Date
}

class DataSyncService {
  private config: SyncConfig
  private status: SyncStatus
  private syncTimer: NodeJS.Timeout | null = null

  constructor(config: SyncConfig) {
    this.config = config
    this.status = {
      lastSync: null,
      pendingChanges: 0,
      isOnline: false,
      conflicts: []
    }
  }

  // התחלת סנכרון
  startSync() {
    if (!this.config.enabled) return

    this.syncTimer = setInterval(() => {
      this.performSync()
    }, this.config.syncInterval)
  }

  // סנכרון נתונים
  async performSync() {
    try {
      // בדיקת חיבור
      this.status.isOnline = await this.checkConnection()
      if (!this.status.isOnline) return

      // שליחת שינויים מקומיים
      await this.pushLocalChanges()

      // קבלת שינויים מהשרת
      await this.pullServerChanges()

      this.status.lastSync = new Date()
    } catch (error) {
      console.error('Sync failed:', error)
    }
  }

  // שליחת שינויים מקומיים
  async pushLocalChanges() {
    const localChanges = this.getLocalChanges()
    if (localChanges.length === 0) return

    const response = await fetch(`${this.config.serverURL}/api/sync/push`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ changes: localChanges })
    })

    if (response.ok) {
      this.clearLocalChanges()
    }
  }

  // קבלת שינויים מהשרת
  async pullServerChanges() {
    const lastSync = this.status.lastSync?.toISOString() || new Date(0).toISOString()
    
    const response = await fetch(`${this.config.serverURL}/api/sync/pull?since=${lastSync}`)
    const serverChanges = await response.json()

    if (serverChanges.length > 0) {
      await this.applyServerChanges(serverChanges)
    }
  }

  // יישום שינויים מהשרת
  async applyServerChanges(changes: any[]) {
    for (const change of changes) {
      try {
        await this.applyChange(change)
      } catch (error) {
        // יצירת קונפליקט
        this.createConflict(change)
      }
    }
  }

  // פתרון קונפליקטים
  resolveConflict(conflictId: string, resolution: 'local' | 'server' | 'merge') {
    const conflict = this.status.conflicts.find(c => c.id === conflictId)
    if (!conflict) return

    switch (resolution) {
      case 'local':
        this.applyLocalResolution(conflict)
        break
      case 'server':
        this.applyServerResolution(conflict)
        break
      case 'merge':
        this.applyMergeResolution(conflict)
        break
    }

    this.status.conflicts = this.status.conflicts.filter(c => c.id !== conflictId)
  }
}

export default DataSyncService
```

### 4.2 עדכון SagachDataContext

עדכן את `src/contexts/SagachDataContext.tsx`:

```typescript
import DataSyncService from '../services/DataSyncService'

export const SagachDataProvider: React.FC<SagachDataProviderProps> = ({ children }) => {
  const [syncService, setSyncService] = useState<DataSyncService | null>(null)
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null)

  // אתחול שירות סנכרון
  useEffect(() => {
    const config: SyncConfig = {
      enabled: true,
      serverURL: process.env.REACT_APP_SERVER_URL || 'http://localhost:3001',
      syncInterval: 30000, // 30 שניות
      conflictResolution: 'manual'
    }

    const service = new DataSyncService(config)
    setSyncService(service)
    service.startSync()
  }, [])

  // שמירה עם סנכרון
  const saveDataWithSync = useCallback(async (type: 'sagachs' | 'sagachimStatus', data: any) => {
    // שמירה מקומית
    saveData(type, data)

    // סנכרון עם השרת
    if (syncService) {
      await syncService.pushChanges(type, data)
    }
  }, [syncService])

  // עדכון פונקציות השמירה
  const addSagach = useCallback(async (sagachData: Omit<SagachTable, 'createdBy' | 'createdAt' | 'lastModifiedBy' | 'lastModifiedAt'>) => {
    // ... קוד קיים ...
    
    // שמירה עם סנכרון
    await saveDataWithSync('sagachs', updatedSagachs)
  }, [saveDataWithSync])
}
```

---

## 5. הגדרת שרת נתונים / Data Server Setup

### 5.1 יצירת שרת Express

צור קובץ `server/app.js`:

```javascript
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const sqlite3 = require('sqlite3').verbose()

const app = express()
const PORT = process.env.PORT || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

// Middleware
app.use(cors())
app.use(express.json())

// Database setup
const db = new sqlite3.Database('./data/sagach_data.db')

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.sendStatus(401)
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403)
    req.user = user
    next()
  })
}

// Routes

// Authentication
app.post('/auth/login', async (req, res) => {
  const { username, password } = req.body
  
  // בדיקת משתמש במסד נתונים
  const user = await getUserByCredentials(username, password)
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET)
  res.json({ token, user })
})

// Data sync endpoints
app.post('/api/sync/push', authenticateToken, async (req, res) => {
  const { changes } = req.body
  
  try {
    await saveChanges(changes, req.user.userId)
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/api/sync/pull', authenticateToken, async (req, res) => {
  const since = req.query.since || new Date(0).toISOString()
  
  try {
    const changes = await getChangesSince(since, req.user.userId)
    res.json(changes)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Sagach data endpoints
app.get('/api/sagachs', authenticateToken, async (req, res) => {
  try {
    const sagachs = await getAllSagachs(req.user.userId)
    res.json(sagachs)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/sagachs', authenticateToken, async (req, res) => {
  try {
    const sagach = await createSagach(req.body, req.user.userId)
    res.json(sagach)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
```

### 5.2 יצירת מסד נתונים SQLite

צור קובץ `server/init-db.sql`:

```sql
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT,
  clearance_level INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  resource TEXT NOT NULL,
  action TEXT NOT NULL,
  granted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Sagach tables
CREATE TABLE IF NOT EXISTS sagach_tables (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data TEXT NOT NULL, -- JSON
  versions TEXT NOT NULL, -- JSON
  current_version TEXT NOT NULL,
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_modified_by TEXT NOT NULL,
  last_modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users (id),
  FOREIGN KEY (last_modified_by) REFERENCES users (id)
);

-- Sagachim status items
CREATE TABLE IF NOT EXISTS sagachim_status (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  provider TEXT,
  last_updated DATETIME,
  arena TEXT,
  process_status INTEGER NOT NULL,
  process_start_date DATETIME,
  estimated_completion DATETIME,
  contact_person TEXT,
  notes TEXT,
  status_updates TEXT, -- JSON
  phase_data TEXT, -- JSON
  notifications BOOLEAN DEFAULT 0,
  notification_method TEXT,
  notification_frequency TEXT,
  completion_date DATETIME,
  notification_subscribers TEXT, -- JSON
  created_by TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_modified_by TEXT NOT NULL,
  last_modified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users (id),
  FOREIGN KEY (last_modified_by) REFERENCES users (id)
);

-- Data changes log
CREATE TABLE IF NOT EXISTS data_changes (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  old_data TEXT, -- JSON
  new_data TEXT, -- JSON
  user_id TEXT NOT NULL,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
CREATE INDEX IF NOT EXISTS idx_permissions_user_id ON permissions (user_id);
CREATE INDEX IF NOT EXISTS idx_sagach_created_by ON sagach_tables (created_by);
CREATE INDEX IF NOT EXISTS idx_status_created_by ON sagachim_status (created_by);
CREATE INDEX IF NOT EXISTS idx_changes_timestamp ON data_changes (timestamp);
CREATE INDEX IF NOT EXISTS idx_changes_user_id ON data_changes (user_id);
```

---

## 6. הגדרות סביבה / Environment Configuration

### 6.1 קובץ .env

צור קובץ `.env`:

```env
# Server Configuration
REACT_APP_SERVER_URL=http://localhost:3001
REACT_APP_NETWORK_MODE=offline
REACT_APP_SYNC_ENABLED=true
REACT_APP_SYNC_INTERVAL=30000

# Database
DATABASE_URL=./data/sagach_data.db
JWT_SECRET=your-super-secret-jwt-key

# Network Settings
NETWORK_NAME=GreenTree-Offline
NETWORK_DOMAIN=greentree.local
```

### 6.2 קובץ הגדרות רשת

צור קובץ `network-config.json`:

```json
{
  "network": {
    "name": "GreenTree-Offline",
    "domain": "greentree.local",
    "server": {
      "host": "192.168.1.100",
      "port": 3001,
      "protocol": "http"
    }
  },
  "permissions": {
    "defaultRole": "viewer",
    "roles": {
      "viewer": ["data:view"],
      "editor": ["data:view", "chat:message"],
      "admin": ["data:view", "data:edit", "data:create", "data:delete", "users:manage", "chat:message"]
    }
  },
  "sync": {
    "enabled": true,
    "interval": 30000,
    "conflictResolution": "manual",
    "batchSize": 100
  }
}
```

---

## 7. הוראות התקנה והפעלה / Installation and Setup Instructions

### 7.1 התקנה ראשונית

```bash
# 1. התקנת תלויות שרת
cd server
npm init -y
npm install express cors jsonwebtoken sqlite3 bcryptjs

# 2. יצירת מסד נתונים
sqlite3 data/sagach_data.db < init-db.sql

# 3. הוספת משתמש ראשון
node scripts/create-admin-user.js
```

### 7.2 הפעלת המערכת

```bash
# 1. הפעלת שרת נתונים
cd server
npm start

# 2. הפעלת האפליקציה
cd ..
npm run build
cd offline_package
python -m http.server 8080
```

### 7.3 בדיקת חיבור

1. פתח דפדפן וגש ל: `http://localhost:8080`
2. התחבר עם פרטי המשתמש הראשי
3. בדוק שהנתונים מסתנכרנים עם השרת

---

## 8. פתרון בעיות נפוצות / Troubleshooting

### 8.1 בעיות חיבור

**בעיה:** האפליקציה לא מתחברת לשרת
**פתרון:**
1. בדוק שהשרת פועל על פורט 3001
2. בדוק הגדרות firewall
3. ודא שה-URL נכון בקובץ .env

### 8.2 בעיות סנכרון

**בעיה:** נתונים לא מסתנכרנים
**פתרון:**
1. בדוק חיבור רשת
2. בדוק לוגים של השרת
3. אתחל את שירות הסנכרון

### 8.3 בעיות הרשאות

**בעיה:** משתמש לא יכול לבצע פעולות
**פתרון:**
1. בדוק תפקיד המשתמש במסד הנתונים
2. בדוק הרשאות ספציפיות
3. אתחל את המידע המקומי

---

## 9. אבטחה / Security Considerations

### 9.1 הצפנת נתונים

- כל סיסמאות מוצפנות עם bcrypt
- נתונים רגישים מוצפנים במסד הנתונים
- תקשורת מוצפנת עם HTTPS (בפרודקשן)

### 9.2 ניהול הרשאות

- הרשאות נבדקות בכל בקשה
- רישום כל פעולות משתמש
- הגבלת גישה לפי רמת הרשאה

### 9.3 גיבוי נתונים

```bash
# גיבוי יומי
sqlite3 data/sagach_data.db ".backup backup/$(date +%Y%m%d).db"

# שחזור מגיבוי
sqlite3 data/sagach_data.db ".restore backup/20240101.db"
```

---

## 10. תחזוקה ותמיכה / Maintenance and Support

### 10.1 לוגים

**מיקום לוגים:**
- שרת: `server/logs/`
- אפליקציה: `offline_package/logs/`

**רמות לוג:**
- ERROR: שגיאות קריטיות
- WARN: אזהרות
- INFO: מידע כללי
- DEBUG: מידע מפורט

### 10.2 ניטור ביצועים

```javascript
// הוספת מדדי ביצועים
const performanceMonitor = {
  trackSyncTime: (startTime) => {
    const duration = Date.now() - startTime
    console.log(`Sync completed in ${duration}ms`)
  },
  
  trackDataSize: (data) => {
    const size = JSON.stringify(data).length
    console.log(`Data size: ${size} bytes`)
  }
}
```

### 10.3 עדכונים

**עדכון נתונים:**
1. גבה את המסד הנוכחי
2. עדכן את הקוד
3. הרץ migration scripts
4. בדוק תקינות הנתונים

**עדכון אפליקציה:**
1. בנה גרסה חדשה
2. העתק לשרת
3. אתחל את השירותים
4. בדוק תקינות

---

## 11. סיכום / Summary

מדריך זה מספק את כל השלבים הנדרשים להעברת אתר העץ הירוק לרשת אופליין עם:

1. **מערכת הרשאות מרכזית** - ניהול משתמשים והרשאות
2. **אחסון נתונים מרכזי** - מסד נתונים SQLite עם סנכרון
3. **סנכרון אוטומטי** - שמירה על עקביות נתונים
4. **אבטחה** - הצפנה וניהול הרשאות
5. **תחזוקה** - כלים לניטור ותחזוקה

המערכת מוכנה לפעולה ברשת אופליין ומאפשרת עבודה משותפת של מספר משתמשים עם שמירה על אבטחה ועקביות נתונים.

---

**תאריך עדכון:** 2024-01-01  
**גרסה:** 1.0  
**מחבר:** AI Assistant
