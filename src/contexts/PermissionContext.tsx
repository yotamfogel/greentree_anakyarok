import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'

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

// Role-based permissions mapping
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  viewer: ['view_all'],
  editor: ['view_all', 'chat_message'],
  admin: ['view_all', 'edit_status', 'create_sagach', 'delete_sagach', 'chat_message', 'manage_users']
}

// User interface
interface User {
  id: string
  name: string
  email: string
  role: UserRole
  lastLogin?: string
}

interface PermissionContextType {
  user: User | null
  login: (userData: Partial<User>) => Promise<void>
  logout: () => void
  hasPermission: (permission: Permission) => boolean
  hasRole: (role: UserRole) => boolean
  canEditStatus: () => boolean
  canCreateSagach: () => boolean
  canDeleteSagach: () => boolean
  canChat: () => boolean
  canManageUsers: () => boolean
  isLoading: boolean
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined)

interface PermissionProviderProps {
  children: ReactNode
}

export const PermissionProvider: React.FC<PermissionProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = () => {
      try {
        const savedUser = localStorage.getItem('user')
        if (savedUser) {
          const userData = JSON.parse(savedUser) as User
          setUser(userData)
        }
      } catch (error) {
        console.error('Failed to load user from localStorage:', error)
        localStorage.removeItem('user')
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [])

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
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // For demo purposes, create a user with the provided data
      const newUser: User = {
        id: userData.id || `user_${Date.now()}`,
        name: userData.name || 'משתמש',
        email: userData.email || 'user@example.com',
        role: userData.role || 'viewer',
        lastLogin: new Date().toISOString()
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
      console.error('Login failed:', error)
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'שגיאה בהתחברות', 
          type: 'error', 
          durationMs: 3000 
        } 
      }))
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    setUser(null)
    window.dispatchEvent(new CustomEvent('excel:status', { 
      detail: { 
        message: 'התנתקת בהצלחה', 
        type: 'ok', 
        durationMs: 2000 
      } 
    }))
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

  const value: PermissionContextType = {
    user,
    login,
    logout,
    hasPermission,
    hasRole,
    canEditStatus,
    canCreateSagach,
    canDeleteSagach,
    canChat,
    canManageUsers,
    isLoading
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
