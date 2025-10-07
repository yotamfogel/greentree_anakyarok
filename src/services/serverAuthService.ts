import React from 'react'
import { UserRole } from '../contexts/PermissionContext'
import { AUTH_SERVER_URL } from '../config/authConfig'

// Server authentication response interface
interface ServerAuthResponse {
  success: boolean
  user?: {
    id: string
    name: string
    email: string
    role: UserRole
    lastLogin?: string
  }
  token?: string
  error?: string
}

// Authentication state interface
interface AuthState {
  isAuthenticated: boolean
  user: {
    id: string
    name: string
    email: string
    role: UserRole
    lastLogin?: string
  } | null
  token: string | null
  isLoading: boolean
  error: string | null
}

// Custom hook for server authentication
export const useServerAuth = () => {
  const [authState, setAuthState] = React.useState<AuthState>({
    isAuthenticated: false,
    user: null,
    token: null,
    isLoading: false,
    error: null
  })

  // Initialize authentication state from localStorage
  React.useEffect(() => {
    const initializeAuth = async () => {
      const savedToken = localStorage.getItem('auth_token')
      const savedUser = localStorage.getItem('user')

      if (savedToken && savedUser) {
        try {
          const user = JSON.parse(savedUser)
          setAuthState({
            isAuthenticated: true,
            user,
            token: savedToken,
            isLoading: false,
            error: null
          })

          // Validate token with server
          await validateToken(savedToken)
        } catch (error) {
          console.error('Failed to initialize auth state:', error)
          localStorage.removeItem('auth_token')
          localStorage.removeItem('user')
          setAuthState({
            isAuthenticated: false,
            user: null,
            token: null,
            isLoading: false,
            error: null
          })
        }
      } else {
        setAuthState({
          isAuthenticated: false,
          user: null,
          token: null,
          isLoading: false,
          error: null
        })
      }
    }

    initializeAuth()
  }, [])

  // Validate token with server
  const validateToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch(`${AUTH_SERVER_URL}/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data: ServerAuthResponse = await response.json()
        if (data.success && data.user) {
          return true
        }
      }

      // Token is invalid, clear local storage
      localStorage.removeItem('auth_token')
      localStorage.removeItem('user')
      setAuthState({
        isAuthenticated: false,
        user: null,
        token: null,
        isLoading: false,
        error: null
      })

      return false
    } catch (error) {
      console.error('Token validation failed:', error)
      return false
    }
  }

  // Login with server or local fallback for demo accounts
  const login = async (username: string, password: string): Promise<boolean> => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

    // Handle demo accounts locally for development/testing
    if (username === 'admin' && password === 'admin') {
      const demoUser = {
        id: 'admin_user',
        name: 'מנהל מערכת',
        email: 'admin@system.local',
        role: 'admin' as UserRole,
        lastLogin: new Date().toISOString()
      }

      const demoToken = 'demo_admin_token_' + Date.now()

      localStorage.setItem('auth_token', demoToken)
      localStorage.setItem('user', JSON.stringify(demoUser))

      setAuthState({
        isAuthenticated: true,
        user: demoUser,
        token: demoToken,
        isLoading: false,
        error: null
      })

      return true
    }

    // Handle demo editor account
    if (username === 'editor' && password === 'editor') {
      const demoUser = {
        id: 'editor_user',
        name: 'עורך מערכת',
        email: 'editor@system.local',
        role: 'editor' as UserRole,
        lastLogin: new Date().toISOString()
      }

      const demoToken = 'demo_editor_token_' + Date.now()

      localStorage.setItem('auth_token', demoToken)
      localStorage.setItem('user', JSON.stringify(demoUser))

      setAuthState({
        isAuthenticated: true,
        user: demoUser,
        token: demoToken,
        isLoading: false,
        error: null
      })

      return true
    }

    // Handle demo viewer account
    if (username === 'viewer' && password === 'viewer') {
      const demoUser = {
        id: 'viewer_user',
        name: 'צופה מערכת',
        email: 'viewer@system.local',
        role: 'viewer' as UserRole,
        lastLogin: new Date().toISOString()
      }

      const demoToken = 'demo_viewer_token_' + Date.now()

      localStorage.setItem('auth_token', demoToken)
      localStorage.setItem('user', JSON.stringify(demoUser))

      setAuthState({
        isAuthenticated: true,
        user: demoUser,
        token: demoToken,
        isLoading: false,
        error: null
      })

      return true
    }

    try {
      const response = await fetch(`${AUTH_SERVER_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      })

      const data: ServerAuthResponse = await response.json()

      if (data.success && data.user && data.token) {
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user', JSON.stringify(data.user))

        setAuthState({
          isAuthenticated: true,
          user: data.user,
          token: data.token,
          isLoading: false,
          error: null
        })

        return true
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: data.error || 'Login failed'
        }))
        return false
      }
    } catch (error) {
      console.error('Login failed:', error)
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Network error during login'
      }))
      return false
    }
  }

  // Logout
  const logout = async (): Promise<void> => {
    const token = authState.token

    try {
      // Notify server about logout
      if (token) {
        await fetch(`${AUTH_SERVER_URL}/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        })
      }
    } catch (error) {
      console.error('Logout notification failed:', error)
    }

    // Clear local storage
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')

    setAuthState({
      isAuthenticated: false,
      user: null,
      token: null,
      isLoading: false,
      error: null
    })
  }

  // Refresh user data from server
  const refreshUser = async (): Promise<boolean> => {
    const token = authState.token

    if (!token) {
      return false
    }

    try {
      const response = await fetch(`${AUTH_SERVER_URL}/user`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      })

      const data: ServerAuthResponse = await response.json()

      if (data.success && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user))
        setAuthState(prev => ({
          ...prev,
          user: data.user || null
        }))
        return true
      }

      return false
    } catch (error) {
      console.error('Failed to refresh user data:', error)
      return false
    }
  }

  // Get current user (for compatibility with existing code)
  const getCurrentUser = async () => {
    if (authState.isAuthenticated && authState.user) {
      // Try to refresh user data from server
      await refreshUser()
      return authState.user
    }
    return null
  }

  return {
    ...authState,
    login,
    logout,
    refreshUser,
    getCurrentUser
  }
}

