import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { getAuthMode, AuthMode } from '../config/authConfig'
import { useServerAuth } from '../services/serverAuthService'

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
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
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
  error: string | null
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

interface PermissionProviderProps {
  children: ReactNode
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const [authMode] = useState<AuthMode>(() => getAuthMode())
  const serverAuth = useServerAuth()

  // Save user to localStorage whenever user changes (for compatibility)
  useEffect(() => {
    if (serverAuth.user) {
      try {
        localStorage.setItem('user', JSON.stringify(serverAuth.user))
      } catch (error) {
        console.error('Failed to save user to localStorage:', error)
      }
    } else {
      localStorage.removeItem('user')
    }
  }, [serverAuth.user])

  const login = async (username: string, password: string): Promise<boolean> => {
    return await serverAuth.login(username, password)
  }

  const logout = async (): Promise<void> => {
    await serverAuth.logout()
  }

  const hasPermission = (permission: Permission): boolean => {
    if (!serverAuth.user) return false
    return ROLE_PERMISSIONS[serverAuth.user.role].includes(permission)
  }

  const hasRole = (role: UserRole): boolean => {
    return serverAuth.user?.role === role
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
    console.log('canValidateJson called:', { user: serverAuth.user?.role, result })
    return result
  }

  const value: PermissionContextType = {
    user: serverAuth.user,
    login,
    logout,
    hasPermission,
    hasRole,
    canEditStatus,
    canCreateSagach,
    canDeleteSagach,
    canChat,
    canManageUsers,
    canValidateJson,
    isLoading: serverAuth.isLoading,
    authMode,
    canSwitchAuthMode: false, // Always false for server-only auth
    error: serverAuth.error
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
