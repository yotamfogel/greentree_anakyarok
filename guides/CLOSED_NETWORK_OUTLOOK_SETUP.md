# מדריך הגדרת Outlook API ברשת סגורה

## מבוא

מדריך זה מסביר כיצד להגדיר את מערכת ההתראות באמצעות Outlook API ברשת סגורה (closed network) ללא גישה לאינטרנט חיצוני.

## דרישות מקדימות

### 1. סביבת Azure AD
- חשבון מנהל Azure AD ברשת הארגונית
- הרשאות ליצירת יישומים (Applications) ב-Azure AD
- גישה לטבלת הרשומות (DNS) הפנימית

### 2. שרת Exchange/Outlook פנימי
- שרת Exchange Server או Exchange Online המוגדר ברשת הפנימית
- חשבון שירות עם הרשאות לשליחת מיילים

### 3. רשת סגורה
- רשת פנימית ללא גישה לאינטרנט חיצוני
- יכולת גישה לשרתי Microsoft Graph הפנימיים

## שלבי הגדרה

### שלב 1: יצירת יישום Azure AD

1. **התחברות ל-Azure Portal**
   ```
   https://portal.azure.com
   ```

2. **נווט ל-Azure Active Directory**
   - עבור ל-"Azure Active Directory"
   - בחר "App registrations"
   - לחץ על "New registration"

3. **הגדרות היישום**
   ```
   Name: SagachNotificationService
   Supported account types: Accounts in this organizational directory only
   Redirect URI: Web - http://localhost (למטרות בדיקה)
   ```

4. **שמור את פרטי היישום**
   - שמור את `Application (client) ID`
   - שמור את `Directory (tenant) ID`

### שלב 2: הגדרת הרשאות API

1. **הוספת הרשאות API**
   - בדף היישום, עבור ל-"API permissions"
   - לחץ על "Add a permission"
   - בחר "Microsoft Graph" → "Application permissions"

2. **הרשאות נדרשות**
   ```
   Mail.Send - Send mail as any user (ללא הגבלה)
   או
   Mail.Send.Shared - Send mail on behalf of others (מוגבל)
   ```

3. **אישור הרשאות המנהל**
   - לחץ על "Grant admin consent"
   - אשר את ההרשאות

### שלב 3: יצירת סוד לקוח

1. **יצירת סוד לקוח**
   - בדף היישום, עבור ל-"Certificates & secrets"
   - לחץ על "New client secret"
   - תאר את הסוד (למשל: "Notification Service Secret")
   - הגדר תפוגה (מומלץ: 24 חודשים)
   - לחץ על "Add"

2. **שמור את הסוד**
   ⚠️ **חשוב**: שמור את ערך הסוד במקום בטוח - לא תוכל לראות אותו שוב!

### שלב 4: הגדרת שרת Exchange פנימי

#### אפשרות א: Exchange Server מקומי

1. **ודא שרת Exchange זמין**
   - בדוק שהשרת פועל וזמין ברשת הפנימית
   - וודא שיש חשבון שירות עם הרשאות SMTP

2. **הגדרת חשבון שירות**
   ```powershell
   # יצירת חשבון שירות ב-Exchange
   New-Mailbox -Name "SagachNotificationService" -UserPrincipalName "notifications@yourdomain.local"
   ```

#### אפשרות ב: Exchange Online (Hybrid)

1. **הגדרת Hybrid Exchange**
   - הגדר Hybrid connection בין Exchange Online לשרת המקומי
   - וודא שמשתמשי הרשת הפנימית יכולים לשלוח מיילים דרך השרת

### שלב 5: עדכון קובץ ההגדרות

#### קובץ: `.env.local`

```env
# הגדרות מסד נתונים (כבר קיימות)
DB_HOST=your-db-server.local
DB_PORT=5432
DB_NAME=thegreentree
DB_USER=your-db-user
DB_PASSWORD=your-db-password

# הגדרות Outlook API חדשות
OUTLOOK_CLIENT_ID=your-application-client-id
OUTLOOK_CLIENT_SECRET=your-client-secret
OUTLOOK_TENANT_ID=your-tenant-id
OUTLOOK_USER_EMAIL=notifications@yourdomain.local

# הגדרות שרת Exchange פנימי
EXCHANGE_SERVER=smtp.yourdomain.local
EXCHANGE_PORT=587
EXCHANGE_USE_TLS=true
EXCHANGE_USER=notifications@yourdomain.local
EXCHANGE_PASSWORD=service-account-password
```

### שלב 6: עדכון קוד היישום

#### קובץ: `src/services/outlookService.ts`

עדכן את כתובת ה-API לשימוש בשרת הפנימי:

```typescript
// במקום כתובת Microsoft Graph הציבורית
const graphEndpoint = 'https://graph.microsoft.com/v1.0/me/sendMail'

// השתמש בכתובת השרת הפנימי
const graphEndpoint = 'https://your-exchange-server.local/api/v1.0/me/sendMail'
```

#### קובץ: `src/services/notificationService.ts`

הגדר את השירות להשתמש בשרת הפנימי:

```typescript
// הגדרות ברירת מחדל
const DEFAULT_CONFIG: NotificationConfig = {
  enabled: true,
  checkIntervalMinutes: 5,
  outlookEnabled: true,
  exchangeServer: 'smtp.yourdomain.local',
  exchangePort: 587,
  exchangeUseTls: true
}
```

### שלב 7: בדיקת החיבור

1. **הפעלת השירות**
   ```typescript
   import { getNotificationService } from './services/notificationService'

   const notificationService = getNotificationService()
   await notificationService.start()
   ```

2. **בדיקת שליחת מייל**
   ```typescript
   // בדיקה ידנית
   const testResult = await outlookService.testConnection()
   console.log('Connection test:', testResult)
   ```

## פתרון בעיות נפוצות

### בעיה: "AADSTS50011: The reply URL specified in the request does not match"

**פתרון**: עדכן את כתובת ה-Redirect URI ב-Azure AD להיות כתובת השרת הפנימית

### בעיה: "Authentication failed"

**פתרון**:
1. בדוק שסוד הלקוח תקין
2. וודא שהרשאות ה-API נכונות
3. בדוק שחשבון השירות פעיל

### בעיה: "Connection timeout"

**פתרון**:
1. בדוק חיבור לשרת Exchange
2. וודא שפורט ה-SMTP פתוח
3. בדוק הגדרות ה-TLS

## אבטחה ברשת סגורה

### המלצות אבטחה

1. **השתמש ב-TLS 1.2+**
   ```typescript
   exchangeUseTls: true,
   tlsOptions: {
     rejectUnauthorized: true,
     ca: [your-ca-cert]
   }
   ```

2. **הגבל הרשאות חשבון השירות**
   - רק הרשאת שליחת מיילים
   - ללא גישה לקריאת מיילים או אנשי קשר

3. **ניהול סודות**
   - שמור סודות בקובץ מוצפן
   - סובב סודות באופן קבוע
   - אל תתחייב סודות ל-Git

### ניטור וביקורת

1. **לוגים מפורטים**
   ```typescript
   // הוסף לוגים לכל פעולת שליחה
   console.log(`📧 Email sent to ${email.to} - Status: ${result.success ? 'Success' : 'Failed'}`)
   ```

2. **מערכת התראות**
   - התראה כאשר שירות ההתראות נכשל
   - דוח יומי על סטטוס השליחות

## תחזוקה שוטפת

### עדכון סודות
- החלף סודות כל 3-6 חודשים
- עדכן את קובץ ההגדרות בהתאם

### גיבוי הגדרות
```bash
# גיבוי הגדרות
cp .env.local .env.backup.$(date +%Y%m%d)
```

### ניטור ביצועים
- עקוב אחר זמן התגובה של ה-API
- בדוק שיעור כשלים בשליחה
- וודא שהתראות נשלחות בזמן

## סיכום

עם השלמת ההגדרה, המערכת תוכל:
- ✅ לשמור מנויים להתראות במסד הנתונים
- ✅ לשלוח התראות באמצעות Outlook API
- ✅ לפעול ברשת סגורה ללא גישה לאינטרנט
- ✅ לתמוך בתדירויות התראה שונות (מיידי, יומי, שבועי)

לשאלות או בעיות, פנה למנהל המערכת או לצוות התשתיות.






