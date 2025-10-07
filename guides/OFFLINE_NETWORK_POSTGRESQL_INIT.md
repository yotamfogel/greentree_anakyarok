# איך לאתחל את שירות PostgreSQL ברשת אופליין

## סקירה כללית

מדריך זה מסביר כיצד לאתחל את שירות PostgreSQL ברשת אופליין סגורה ללא גישה לאינטרנט חיצוני.

## דרישות מקדימות

1. **שרת PostgreSQL** מותקן ברשת האופליין
2. **גישה לשרת** עם הרשאות מנהל מסד נתונים
3. **קובץ הגדרות** `.env` מוכן עם פרטי החיבור

## שלבי האתחול

### שלב 1: הגדרת משתני סביבה

צור קובץ `.env` בתיקיית הפרויקט:

```bash
# הגדרות מסד נתונים ברשת אופליין
DB_HOST=your-postgresql-server.local
DB_PORT=5432
DB_NAME=thegreentree
DB_USER=thegreentree_user
DB_PASSWORD=your_secure_password
DB_SSL=false

# הגדרות רשת אופליין
NETWORK_MODE=offline
DB_AUTO_INIT=true
```

### שלב 2: אתחול אוטומטי של מסד הנתונים

המערכת תאתחל אוטומטית את מסד הנתונים כאשר האפליקציה תיטען לראשונה:

```typescript
// קוד האתחול האוטומטי ב-SagachDataContext.tsx
useEffect(() => {
  const initializeDatabase = async () => {
    if (useDatabase && dbService) {
      try {
        // בדיקת חיבור למסד נתונים
        if (!dbService.isDatabaseConnected()) {
          await dbService.initialize()
        }

        // יצירת טבלאות אם לא קיימות
        if (dbService.isDatabaseConnected()) {
          await dbService.createTables()
        }

        // טעינת נתונים ממסד הנתונים
        await loadDataFromDatabase()
      } catch (error) {
        console.error('❌ Database initialization failed:', error)
        // המשך עם localStorage כגיבוי
        loadFromLocalStorage()
      }
    }
  }

  initializeDatabase()
}, [useDatabase, dbService])
```

### שלב 3: אתחול ידני (אם נדרש)

אם האתחול האוטומטי נכשל, ניתן לאתחל ידנית:

```typescript
import { getDatabaseService } from '../services/postgreSQLService'

const initializeDatabaseManually = async () => {
  try {
    const dbService = getDatabaseService()

    // אתחול חיבור
    await dbService.initialize()

    // יצירת טבלאות
    await dbService.createTables()

    // בדיקת חיבור
    const isConnected = dbService.isDatabaseConnected()
    console.log('Database connected:', isConnected)

  } catch (error) {
    console.error('Manual initialization failed:', error)
  }
}
```

### שלב 4: בדיקת חיבור

בדוק את החיבור למסד הנתונים:

```typescript
import { testDatabaseConnection, getDatabaseConfig } from '../config/databaseConfig'

const testConnection = async () => {
  const config = getDatabaseConfig('offline')
  const result = await testDatabaseConnection(config)

  if (result.success) {
    console.log('✅ Database connected successfully')
  } else {
    console.error('❌ Connection failed:', result.message)
  }
}
```

## טבלאות שנוצרות אוטומטית

המערכת יוצרת את הטבלאות הבאות:

### `sagachim_status`
- **תיאור**: טבלת סטטוס סג"חים
- **שדות עיקריים**: id, name, description, provider, arena, process_status, created_by, last_modified_by
- **מטרה**: אחסון כל פריטי הסטטוס של הסג"חים

### `sagachs`
- **תיאור**: טבלת נתוני סג"חים
- **שדות עיקריים**: id, name, data, versions, current_version, created_by, last_modified_by
- **מטרה**: אחסון נתוני הסג"חים והגרסאות שלהם

### `data_changes`
- **תיאור**: טבלת יומן שינויים
- **שדות עיקריים**: event_type, event_data, timestamp, user_id, user_name
- **מטרה**: מעקב אחר כל השינויים במערכת לצורכי ביקורת

## פתרון בעיות נפוצות

### בעיה: "Database module not available"
**פתרון**: וודא ששרת PostgreSQL מותקן וזמין ברשת האופליין

### בעיה: "Connection refused"
**פתרון**:
1. בדוק ששרת PostgreSQL פועל
2. בדוק הגדרות firewall ברשת האופליין
3. וודא שפרטי החיבור נכונים בקובץ `.env`

### בעיה: "Permission denied for database"
**פתרון**: וודא שהמשתמש במסד הנתונים (`DB_USER`) בעל הרשאות מתאימות

## אימות התחברות

לאחר האתחול, המערכת תציג הודעות ב-console:
- `✅ PostgreSQL connected successfully` - חיבור הצליח
- `✅ Database tables created/verified` - טבלאות נוצרו
- `💾 Data saved to PostgreSQL database` - שמירה למסד נתונים

## גיבוי אוטומטי

המערכת שומרת תמיד ב-localStorage כגיבוי, כך שאם מסד הנתונים לא זמין, הנתונים לא יאבדו.

## סיכום

האתחול של PostgreSQL ברשת אופליין מתבצע אוטומטית כאשר האפליקציה נטענת. המערכת תאתחל את החיבור, תיצור את הטבלאות הדרושות ותטען את הנתונים הקיימים. אם יש בעיות חיבור, המערכת תמשיך לפעול עם localStorage כגיבוי.

