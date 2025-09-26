# מערכת הרשאות - Permission System

## סקירה כללית

מערכת הרשאות מתקדמת לאפליקציית העץ הירוק המאפשרת שליטה על פעולות משתמשים בהתאם לתפקידם.

## תפקידים (User Roles)

### 1. צופה (Viewer)
- **הרשאות**: צפייה בלבד בסג"חים
- **הגבלות**: לא יכול לערוך סטטוסים, ליצור סג"חים או להוסיף הודעות

### 2. עורך (Editor)  
- **הרשאות**: צפייה + הוספת הודעות בצ'אט
- **הגבלות**: לא יכול לערוך סטטוסים או ליצור סג"חים

### 3. מנהל (Admin)
- **הרשאות מלאות**: צפייה, עריכת סטטוסים, יצירת סג"חים, הוספת הודעות
- **שליטה מלאה**: גישה לכל הפונקציונליות

## רכיבי המערכת

### 1. PermissionContext (`src/contexts/PermissionContext.tsx`)
- ניהול מצב המשתמש והרשאות
- פונקציות לבדיקת הרשאות
- שמירה ב-localStorage

### 2. LoginModal (`src/components/LoginModal.tsx`)
- מודל התחברות עם בחירת תפקיד
- תמיכה בעברית
- עיצוב מודרני

### 3. UserStatus (`src/components/UserStatus.tsx`)
- הצגת מידע המשתמש הנוכחי
- כפתור התנתקות
- תצוגת תפקיד

### 4. PermissionDemo (`src/components/PermissionDemo.tsx`)
- רכיב הדגמה להצגת הרשאות
- שימושי לפיתוח ובדיקות

## שימוש במערכת

### התחברות
```typescript
const { login, user } = usePermissions()

await login({
  name: 'יוסי כהן',
  email: 'yossi@example.com',
  role: 'admin'
})
```

### בדיקת הרשאות
```typescript
const { canEditStatus, canCreateSagach, canChat } = usePermissions()

if (canEditStatus()) {
  // המשתמש יכול לערוך סטטוסים
}
```

### הגנה על רכיבים
```tsx
<ProtectedComponent permission="edit_status">
  <StatusEditButton />
</ProtectedComponent>
```

## אינטגרציה עם רכיבים קיימים

### SagachimStatus
- הגנה על עריכת סטטוסים
- הגנה על יצירת סג"חים חדשים
- הגנה על הוספת הודעות בצ'אט
- הסתרת/הצגת כפתורים בהתאם להרשאות

### App
- מודל התחברות בכותרת
- תצוגת סטטוס משתמש
- עטיפת האפליקציה ב-PermissionProvider

## הודעות שגיאה

המערכת מציגה הודעות שגיאה ברורות בעברית:
- "אין לך הרשאה לערוך סטטוסים"
- "אין לך הרשאה ליצור סג"חים חדשים"
- "אין לך הרשאה להוסיף הודעות"

## אבטחה

- בדיקות הרשאות בצד הלקוח (Client-side)
- שמירת מצב ב-localStorage
- הודעות שגיאה ברורות
- מניעת פעולות לא מורשות

## הרחבה עתידית

- אינטגרציה עם שרת (Server-side authentication)
- הרשאות דינמיות
- ניהול משתמשים מתקדם
- רישום פעולות (Audit Log)
- הרשאות ברמה דקה יותר (Field-level permissions)

## דוגמאות שימוש

### בדיקת הרשאה ספציפית
```typescript
const { hasPermission } = usePermissions()

if (hasPermission('edit_status')) {
  // ביצוע פעולה
}
```

### בדיקת תפקיד
```typescript
const { hasRole } = usePermissions()

if (hasRole('admin')) {
  // פעולות מנהל
}
```

### רכיב מוגן
```tsx
import { ProtectedComponent } from '../contexts/PermissionContext'

<ProtectedComponent permission="create_sagach">
  <CreateSagachButton />
</ProtectedComponent>
```

## קבצים שנוספו/עודכנו

### קבצים חדשים:
- `src/contexts/PermissionContext.tsx`
- `src/components/LoginModal.tsx`
- `src/components/UserStatus.tsx`
- `src/components/PermissionDemo.tsx`

### קבצים שעודכנו:
- `src/App.tsx` - אינטגרציה עם מערכת הרשאות
- `src/components/SagachimStatus.tsx` - הגנה על פעולות
- `src/index.css` - עיצוב למערכת הרשאות

המערכת מוכנה לשימוש וניתנת להרחבה בקלות!



