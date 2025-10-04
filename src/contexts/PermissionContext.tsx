import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getAuthMode, AuthMode } from '../config/authConfig'
import { adfsLogin, adfsLogout, getCurrentAdfsUser, initializeAdfs } from '../services/adfsAuthService'

// User roles with different permission levels
export type UserRole = 'viewer' | 'editor' | 'admin'

// Permission types for different actions
export type Permission =
  | 'edit_status'      // Can edit sagach statuses
  | 'create_sagach'    // Can create new sagachs
  | 'delete_sagach'    // Can delete sagachs
  | 'chat_message'     // Can type in chat/status updates
  | 'manage_users'     // Can manage user permissions
  | 'view_all'         // Can view all sagachs (always true for all roles)
  | 'validate_json'    // Can access JSON schema validator

// Role-based permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  viewer: ['view_all', 'validate_json'],
  editor: ['view_all', 'chat_message', 'validate_json'],
  admin: ['view_all', 'edit_status', 'create_sagach', 'delete_sagach', 'chat_message', 'manage_users', 'validate_json']
}

// User interface
interface User {
  id: string
  name: string
  email: string
  role: UserRole
  lastLogin?: string
  authMode?: AuthMode
  adfsAccount?: any // MSAL AccountInfo when using ADFS
}

interface PermissionContextType {
  user: User | null
  login: (userData: Partial<User>) => Promise<void>
  loginWithAdfs: () => Promise<void>
  logout: () => void
  hasPermission: (permission: Permission) => boolean
  hasRole: (role: UserRole) => boolean
  canEditStatus: () => boolean
  canCreateSagach: () => boolean
  canDeleteSagach: () => boolean
  canChat: () => boolean
  canManageUsers: () => boolean
  canValidateJson: () => boolean
  isLoading: boolean
  authMode: AuthMode
  canSwitchAuthMode: boolean
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

interface PermissionProviderProps {
  children: ReactNode
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [authMode] = useState<AuthMode>(() => getAuthMode())

  // Load user from localStorage or ADFS on mount
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true)
      try {
        if (authMode === 'adfs') {
          // Try to restore ADFS user session
          const adfsUser = await initializeAdfs()
          if (adfsUser) {
            setUser(adfsUser)
            return
          }
        }
        
        // Fallback to local storage for local auth or when ADFS fails
        const savedUser = localStorage.getItem('user')
        if (savedUser) {
          const userData = JSON.parse(savedUser) as User
          // Ensure authMode is set correctly
          userData.authMode = authMode
          setUser(userData)
        }
      } catch (error) {
        console.error('Failed to initialize authentication:', error)
        localStorage.removeItem('user')
      } finally {
        setIsLoading(false)
      }
    }

    initializeAuth()
  }, [authMode])

  // Save user to localStorage whenever user changes
  useEffect(() => {
    if (user) {
      try {
        localStorage.setItem('user', JSON.stringify(user))
      } catch (error) {
        console.error('Failed to save user to localStorage:', error)
      }
    } else {
      localStorage.removeItem('user')
    }
  }, [user])

  const login = async (userData: Partial<User>) => {
    setIsLoading(true)
    try {
      // Simulate API call for local authentication
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // For local authentication, create a user with the provided data
      const newUser: User = {
        id: userData.id || `user_${Date.now()}`,
        name: userData.name || 'משתמש',
        email: userData.email || 'user@example.com',
        role: userData.role || 'viewer',
        lastLogin: new Date().toISOString(),
        authMode: 'local'
      }
      
      setUser(newUser)
      
      // If user is admin, add them to the admin users list
      if (newUser.role === 'admin') {
        try {
          const existingUsers = localStorage.getItem('admin_users')
          const users = existingUsers ? JSON.parse(existingUsers) : []
          const userExists = users.some((u: User) => u.id === newUser.id || u.email === newUser.email)
          
          if (!userExists) {
            users.push(newUser)
            localStorage.setItem('admin_users', JSON.stringify(users))
          }
        } catch (error) {
          console.error('Failed to add admin user to list:', error)
        }
      }
      
      // Show success message
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: `ברוך הבא, ${newUser.name}!`, 
          type: 'ok', 
          durationMs: 3000 
        } 
      }))
    } catch (error) {
      console.error('Local login failed:', error)
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'שגיאה בהתחברות מקומית', 
          type: 'error', 
          durationMs: 3000 
        } 
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const loginWithAdfs = async () => {
    setIsLoading(true)
    try {
      const result = await adfsLogin()
      const adfsUser = await getCurrentAdfsUser()
      
      if (adfsUser) {
        setUser(adfsUser)
        
        // Show success message
        window.dispatchEvent(new CustomEvent('excel:status', { 
          detail: { 
            message: `ברוך הבא, ${adfsUser.name}!`, 
            type: 'ok', 
            durationMs: 3000 
          } 
        }))
      } else {
        throw new Error('Failed to get user information from ADFS')
      }
    } catch (error) {
      console.error('ADFS login failed:', error)
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'שגיאה בהתחברות ADFS', 
          type: 'error', 
          durationMs: 3000 
        } 
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Handle ADFS logout if user is authenticated via ADFS
      if (user?.authMode === 'adfs') {
        await adfsLogout()
      }
      
      setUser(null)
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'התנתקת בהצלחה', 
          type: 'ok', 
          durationMs: 2000 
        } 
      }))
    } catch (error) {
      console.error('Logout failed:', error)
      // Still clear local user state even if ADFS logout fails
      setUser(null)
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'התנתקת (עם שגיאות)', 
          type: 'warn', 
          durationMs: 3000 
        } 
      }))
    }
  }

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false
    return ROLE_PERMISSIONS[user.role].includes(permission)
  }

  const hasRole = (role: UserRole): boolean => {
    return user?.role === role
  }

  const canEditStatus = (): boolean => {
    return hasPermission('edit_status')
  }

  const canCreateSagach = (): boolean => {
    return hasPermission('create_sagach')
  }

  const canDeleteSagach = (): boolean => {
    return hasPermission('delete_sagach')
  }

  const canChat = (): boolean => {
    return hasPermission('chat_message')
  }

  const canManageUsers = (): boolean => {
    return hasPermission('manage_users')
  }

  const canValidateJson = (): boolean => {
    const result = hasPermission('validate_json')
    console.log('canValidateJson called:', { user: user?.role, result })
    return result
  }

  const value: PermissionContextType = {
    user,
    login,
    loginWithAdfs,
    logout,
    hasPermission,
    hasRole,
    canEditStatus,
    canCreateSagach,
    canDeleteSagach,
    canChat,
    canManageUsers,
    canValidateJson,
    isLoading,
    authMode,
    canSwitchAuthMode: !!(import.meta.env.VITE_ADFS_CLIENT_ID && import.meta.env.VITE_ADFS_AUTHORITY)
  }

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  )
}

export const usePermissions = (): PermissionContextType => {
  const context = useContext(PermissionContext)
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider')
  }
  return context
}

// Higher-order component for protecting routes/components
interface ProtectedComponentProps {
  permission?: Permission
  role?: UserRole
  fallback?: ReactNode
  children: ReactNode
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({ 
  permission, 
  role, 
  fallback = null, 
  children 
}) => {
  const { hasPermission, hasRole, user } = usePermissions()

  // If no user is logged in, show fallback
  if (!user) {
    return <>{fallback}</>
  }

  // Check role permission
  if (role && !hasRole(role)) {
    return <>{fallback}</>
  }

  // Check specific permission
  if (permission && !hasPermission(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

// Hook for checking permissions with error handling
export const usePermissionCheck = (permission: Permission): boolean => {
  const { hasPermission, user } = usePermissions()
  
  if (!user) {
    return false
  }
  
  return hasPermission(permission)
}

// Utility function to get role display name in Hebrew
export const getRoleDisplayName = (role: UserRole): string => {
  switch (role) {
    case 'viewer':
      return 'צופה'
    case 'editor':
      return 'עורך'
    case 'admin':
      return 'מנהל'
    default:
      return 'לא ידוע'
  }
}
