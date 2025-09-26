# 🔧 Force Local Authentication Only

If you want to use **only local authentication** and disable ADFS completely, follow these steps:

## Method 1: Remove ADFS Environment Variables

1. **Check for `.env.local` file** in your project root
2. **If it exists**, either:
   - Delete the file completely, OR
   - Comment out or remove these lines:
     ```bash
     # VITE_ADFS_AUTHORITY=https://your-adfs-host/adfs
     # VITE_ADFS_CLIENT_ID=00000000-0000-0000-0000-000000000000
     ```
3. **Restart the development server** (`npm run dev`)

## Method 2: Create Local-Only Environment File

Create a `.env.local` file with:
```bash
# Force local authentication only
# VITE_ADFS_AUTHORITY=
# VITE_ADFS_CLIENT_ID=
```

## Method 3: Clear Browser Storage

1. **Open browser developer tools** (F12)
2. **Go to Application/Storage tab**
3. **Clear localStorage** for your domain
4. **Refresh the page**

## Result

After any of these methods:
- ✅ App will default to **local authentication mode**
- ✅ Login modal will show **local login form**
- ✅ No ADFS options will be available
- ✅ Users can log in with username + role selection

## Quick Test

1. **Open the app**
2. **Click login button**
3. **You should see**:
   - Username field
   - Password field (optional)
   - Email field (optional)
   - Role dropdown (Viewer/Editor/Admin)
   - "התחבר" (Login) button

## Demo Account

For quick testing:
- **Username**: `admin`
- **Password**: `admin`
- **Role**: Will be automatically set to Admin

---

**Note**: This will completely disable ADFS authentication. If you want to re-enable ADFS later, just add the environment variables back and restart the server.
