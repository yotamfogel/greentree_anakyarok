// Authentication configuration for server-based authentication
// This configuration is used for the closed network environment

// Server authentication endpoint
export const AUTH_SERVER_URL = import.meta.env.VITE_AUTH_SERVER_URL || 'https://your-auth-server.com/api'

// Authentication mode (now only server-based)
export type AuthMode = 'server'

// Get current authentication mode
export const getAuthMode = (): AuthMode => {
  return 'server'
}

// Set authentication mode (simplified for server-based auth)
export const setAuthMode = (mode: AuthMode) => {
  localStorage.setItem('auth_mode', mode)
}

// Get authentication mode display name
export const getAuthModeDisplayName = (mode: AuthMode): string => {
  switch (mode) {
    case 'server':
      return 'אימות שרת'
    default:
      return 'לא ידוע'
  }
}

// Check if switching between modes is allowed (always false for server-only)
export const canSwitchAuthMode = (): boolean => {
  return false
}
