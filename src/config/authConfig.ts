// Authentication configuration and switching logic

export type AuthMode = 'local' | 'adfs'

// Get current authentication mode from environment or localStorage
export const getAuthMode = (): AuthMode => {
  // Check if user has manually set auth mode in localStorage
  const savedMode = localStorage.getItem('auth_mode')
  if (savedMode && (savedMode === 'local' || savedMode === 'adfs')) {
    return savedMode as AuthMode
  }
  
  // Auto-detect based on environment variables
  if (import.meta.env.VITE_ADFS_CLIENT_ID && import.meta.env.VITE_ADFS_AUTHORITY) {
    return 'adfs'
  }
  
  return 'local'
}

// Set authentication mode
export const setAuthMode = (mode: AuthMode) => {
  localStorage.setItem('auth_mode', mode)
  
  // Show status message
  window.dispatchEvent(new CustomEvent('excel:status', { 
    detail: { 
      message: mode === 'adfs' 
        ? 'עבר למצב אימות ADFS - נא לרענן את הדף'
        : 'עבר למצב אימות מקומי - נא לרענן את הדף', 
      type: 'ok', 
      durationMs: 4000 
    } 
  }))
}

// Check if ADFS is available
export const isAdfsAvailable = (): boolean => {
  return !!(import.meta.env.VITE_ADFS_CLIENT_ID && import.meta.env.VITE_ADFS_AUTHORITY)
}

// Get authentication mode display name
export const getAuthModeDisplayName = (mode: AuthMode): string => {
  switch (mode) {
    case 'local':
      return 'אימות מקומי'
    case 'adfs':
      return 'אימות ADFS'
    default:
      return 'לא ידוע'
  }
}

// Check if switching between modes is allowed
export const canSwitchAuthMode = (): boolean => {
  // Allow switching only if ADFS is configured
  return isAdfsAvailable()
}
