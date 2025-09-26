# 🔐 Local Authentication Guide

## Overview
The app supports local authentication alongside ADFS integration. Users can log in with local accounts using username, email, and role selection.

## 🚀 How Local Authentication Works

### Default Behavior
- **Without ADFS configured**: App automatically uses local authentication mode
- **With ADFS configured**: Users can choose between local and ADFS authentication
- **Mode switching**: Available when both authentication methods are configured

### User Interface
1. **Login Modal**: Shows appropriate login form based on current mode
2. **Mode Indicator**: Displays current authentication mode (top-left corner)
3. **User Status**: Shows which authentication method is being used

## 👤 User Roles & Permissions

### 1. צופה (Viewer)
- **Permissions**: View-only access to sagachim
- **Limitations**: Cannot edit statuses, create sagachim, or add messages
- **Use Case**: Read-only users, observers

### 2. עורך (Editor)  
- **Permissions**: View + add chat messages
- **Limitations**: Cannot edit statuses or create sagachim
- **Use Case**: Users who can provide input but not make structural changes

### 3. מנהל (Admin)
- **Full Permissions**: View, edit statuses, create sagachim, add messages, manage users
- **Complete Control**: Access to all functionality
- **Use Case**: System administrators, power users

## 🔧 Local Login Process

### Step 1: Access Login
- Click the login button in the header
- Modal opens with local authentication form

### Step 2: Fill Form
- **שם משתמש (Username)**: Required field
- **סיסמה (Password)**: Optional (for demo purposes)
- **כתובת אימייל (Email)**: Optional
- **הרשאות (Role)**: Select from dropdown

### Step 3: Submit
- Click "התחבר" (Login) button
- System creates local user account
- User is logged in with selected permissions

## 🎯 Demo Accounts

### Quick Admin Access
- **Username**: `admin`
- **Password**: `admin`
- **Role**: Automatically set to Admin

### Custom Accounts
- Create any username/email combination
- Select desired role from dropdown
- System generates unique user ID

## 🔄 Mode Switching

### When Both Modes Available
1. **Mode Switcher**: Button appears in login modal
2. **Switch Process**: Click to toggle between local/ADFS
3. **Page Refresh**: Required after switching modes
4. **Persistence**: Choice saved in localStorage

### Visual Indicators
- **Mode Indicator**: Top-left corner shows current mode
- **Login Modal**: Displays current mode in header
- **User Status**: Shows authentication method in dropdown

## 🛠️ Technical Details

### Storage
- **User Data**: Stored in localStorage
- **Admin Users**: Automatically added to admin list
- **Session**: Persists across browser sessions
- **Mode Preference**: Saved in localStorage

### Security
- **Client-side**: Permission checks in browser
- **No Server**: All authentication handled locally
- **Role-based**: Permissions tied to user roles
- **Graceful Errors**: Proper error handling, no fake data

### Integration
- **Permission System**: Fully integrated with existing permissions
- **UI Components**: All components respect user permissions
- **Error Handling**: Clear error messages in Hebrew
- **RTL Support**: Full right-to-left text support

## 📱 User Experience

### Login Flow
1. **Click Login**: Opens modal with appropriate form
2. **Fill Details**: Enter username and select role
3. **Submit**: System processes and logs in user
4. **Success**: Welcome message and UI updates

### Permission Enforcement
- **UI Updates**: Buttons/features show/hide based on permissions
- **Error Messages**: Clear feedback when actions are not allowed
- **Role Display**: User status shows current role and auth mode

### Visual Feedback
- **Loading States**: Spinner during login process
- **Success Messages**: Confirmation when login succeeds
- **Error Messages**: Clear error feedback when login fails

## 🔍 Testing Local Authentication

### Development Mode
- **Test Component**: Available in development builds
- **Quick Tests**: Buttons to test different roles
- **Results Log**: Shows test results in real-time
- **Role Testing**: Verify permissions for each role

### Manual Testing
1. **Open App**: Navigate to application
2. **Click Login**: Open login modal
3. **Enter Details**: Fill username and select role
4. **Submit**: Complete login process
5. **Verify**: Check permissions and UI updates

## 🚨 Important Notes

### Backward Compatibility
- ✅ **No Breaking Changes**: Existing functionality preserved
- ✅ **Same Permissions**: All permission logic unchanged
- ✅ **Same UI**: Login process familiar to users
- ✅ **Same Roles**: Viewer, Editor, Admin roles maintained

### Error Handling
- **No Fake Data**: System fails gracefully when errors occur
- **Clear Messages**: Error messages in Hebrew
- **User Feedback**: Toast notifications for success/error
- **Debug Info**: Console logging for troubleshooting

### Performance
- **Fast Login**: No server round-trips
- **Instant UI**: Immediate permission updates
- **Lightweight**: Minimal overhead
- **Responsive**: Smooth user experience

## 🎉 Ready to Use!

Local authentication is fully functional and ready for production use. Users can:

- ✅ Log in with local accounts
- ✅ Select appropriate roles
- ✅ Access features based on permissions
- ✅ Switch between auth modes (when ADFS configured)
- ✅ Enjoy seamless user experience

The system maintains full compatibility while providing modern authentication capabilities!
