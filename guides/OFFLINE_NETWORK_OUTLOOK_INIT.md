# איך לאתחל את שירות Outlook ברשת אופליין

## סקירה כללית

מדריך זה מסביר כיצד לאתחל את שירות Outlook (Microsoft Graph API) ברשת אופליין סגורה ללא גישה לאינטרנט חיצוני.

## דרישות מקדימות

1. **יישום Azure AD** רשום ברשת האופליין
2. **שרת Exchange** מקומי או Exchange Online Hybrid
3. **חשבון שירות** עם הרשאות לשליחת מיילים
4. **קובץ הגדרות** `.env` מוכן עם פרטי האימות

## ארכיטקטורת השירות

השירות משתמש ב-Microsoft Graph API עם אימות OAuth 2.0:

```typescript
// מבנה השירות ב-OutlookService.ts
class OutlookService {
  private config: OutlookConfig
  private accessToken: string | null = null
  private tokenExpiry: Date | null = null

  // אימות עם Microsoft Graph API
  async authenticate(): Promise<boolean>

  // שליחת מייל
  async sendEmail(email: NotificationEmail): Promise<OutlookApiResponse>

  // שליחת התראת סג"ח
  async sendSagachNotification(subscriber, sagachName, oldStatus, newStatus, changeDescription)
}
```

## שלבי האתחול

### שלב 1: הגדרת משתני סביבה

צור קובץ `.env` בתיקיית הפרויקט:

```bash
# הגדרות Outlook API ברשת אופליין
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

# מצב רשת אופליין
NETWORK_MODE=offline
OUTLOOK_AUTO_INIT=true
```

### שלב 2: אתחול אוטומטי של השירות

השירות מאתחל אוטומטית כאשר האפליקציה נטעלת:

```typescript
// קוד האתחול האוטומטי ב-notificationService.ts
useEffect(() => {
  const initializeOutlook = async () => {
    if (outlookEnabled && outlookService) {
      try {
        // בדיקת חיבור לשרת Exchange
        const isConnected = await outlookService.testConnection()

        if (isConnected) {
          console.log('✅ Outlook service initialized successfully')
        } else {
          console.warn('⚠️ Outlook service connection failed, but continuing...')
        }
      } catch (error) {
        console.error('❌ Outlook service initialization failed:', error)
      }
    }
  }

  initializeOutlook()
}, [outlookEnabled, outlookService])
```

### שלב 3: אתחול ידני (אם נדרש)

אם האתחול האוטומטי נכשל, ניתן לאתחל ידנית:

```typescript
import { getOutlookService } from '../services/outlookService'

const initializeOutlookManually = async () => {
  try {
    const outlookService = getOutlookService()

    // עדכון הגדרות (אם נדרש)
    outlookService.updateConfig({
      clientId: 'your-client-id',
      clientSecret: 'your-client-secret',
      tenantId: 'your-tenant-id',
      userPrincipalName: 'notifications@yourdomain.local'
    })

    // בדיקת חיבור
    const isConnected = await outlookService.testConnection()
    console.log('Outlook connected:', isConnected)

  } catch (error) {
    console.error('Manual initialization failed:', error)
  }
}
```

### שלב 4: בדיקת חיבור

בדוק את החיבור לשרת Exchange:

```typescript
import { getOutlookService } from '../services/outlookService'

const testOutlookConnection = async () => {
  try {
    const outlookService = getOutlookService()
    const result = await outlookService.testConnection()

    if (result) {
      console.log('✅ Outlook API connection successful')
    } else {
      console.error('❌ Outlook API connection failed')
    }
  } catch (error) {
    console.error('❌ Connection test error:', error)
  }
}
```

## הגדרת שרת Exchange פנימי

### אפשרות א: Exchange Server מקומי

1. **ודא שרת Exchange זמין ברשת האופליין**
2. **צור חשבון שירות עם הרשאות SMTP**
3. **הגדר את החשבון ב-Azure AD עם הרשאות Mail.Send**

### אפשרות ב: Exchange Online Hybrid

1. **הגדר Hybrid Exchange** בין Exchange Online לשרת המקומי
2. **ודא שמשתמשי הרשת הפנימית יכולים לשלוח מיילים דרך השרת**
3. **הגדר את החשבון ב-Azure AD עם הרשאות מתאימות**

## פורמט הודעות האימייל

השירות שולח הודעות בפורמט הבא:

```html
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: Arial, sans-serif; direction: rtl; text-align: right; }
      .header { background: #f0f8ff; padding: 15px; border-radius: 5px; }
      .content { margin: 20px 0; }
      .footer { color: #666; font-size: 12px; margin-top: 30px; }
    </style>
  </head>
  <body>
    <div class="header">
      <h2>עדכון סטטוס סג"ח</h2>
    </div>
    <div class="content">
      <p><strong>שם הסג"ח:</strong> {sagachName}</p>
      <p><strong>סטטוס קודם:</strong> {oldStatus}</p>
      <p><strong>סטטוס חדש:</strong> {newStatus}</p>
      <p><strong>תיאור השינוי:</strong> {changeDescription}</p>
    </div>
    <div class="footer">
      <p>הודעה זו נשלחה אוטומטית ממערכת ניהול הסג"חים</p>
    </div>
  </body>
</html>
```

## פתרון בעיות נפוצות

### בעיה: "Outlook API credentials not configured"
**פתרון**: וודא שכל משתני הסביבה מוגדרים נכון בקובץ `.env`

### בעיה: "Authentication failed"
**פתרון**:
1. בדוק שסוד הלקוח תקין
2. וודא שהרשאות ה-API נכונות ב-Azure AD
3. בדוק שחשבון השירות פעיל

### בעיה: "Connection timeout"
**פתרון**:
1. בדוק חיבור לשרת Exchange
2. וודא שפורט ה-SMTP פתוח ברשת האופליין
3. בדוק הגדרות ה-TLS

## אימות התחברות

לאחר האתחול, המערכת תציג הודעות ב-console:
- `✅ Outlook API authenticated successfully` - אימות הצליח
- `✅ Outlook service initialized successfully` - שירות אותחל

## גיבוי למקרה של כשל

אם שירות Outlook לא זמין, המערכת תמשיך לפעול ללא התראות אימייל. הנתונים יישמרו במסד הנתונים כרגיל.

## סיכום

האתחול של Outlook ברשת אופליין מתבצע אוטומטית כאשר האפליקציה נטעלת. השירות יאתחל את החיבור ל-Microsoft Graph API, יבדוק את החיבור לשרת Exchange, ויאפשר שליחת התראות אימייל. אם יש בעיות חיבור, המערכת תמשיך לפעול ללא התראות אימייל.

