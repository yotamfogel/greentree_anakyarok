import { PublicClientApplication, Configuration, AccountInfo, AuthenticationResult, InteractionRequiredAuthError } from '@azure/msal-browser'
import { UserRole } from '../contexts/PermissionContext'

// ADFS configuration
const msalConfig: Configuration = {
  auth: {
    clientId: import.meta.env.VITE_ADFS_CLIENT_ID || '',
    authority: import.meta.env.VITE_ADFS_AUTHORITY || '',
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: false
  }
}

// MSAL instance
let msalInstance: PublicClientApplication | null = null

// Initialize MSAL instance
const initializeMsal = () => {
  if (!msalInstance && msalConfig.auth.clientId && msalConfig.auth.authority) {
    msalInstance = new PublicClientApplication(msalConfig)
  }
  return msalInstance
}

// Check if ADFS is configured
export const isAdfsConfigured = (): boolean => {
  return !!(import.meta.env.VITE_ADFS_CLIENT_ID && import.meta.env.VITE_ADFS_AUTHORITY)
}

// Login scopes
const loginRequest = {
  scopes: ['openid', 'profile'],
}

// Helper function to determine user role from ADFS claims
const getUserRoleFromClaims = (account: AccountInfo): UserRole => {
  // Check for admin group membership or role claim
  const claims = account.idTokenClaims as any
  
  // Check for group membership (common patterns)
  const groups = claims?.groups || []
  const adminGroups = ['admin', 'admins', 'Administrators', 'Administrators@thegreentree']
  
  if (adminGroups.some(adminGroup => 
    groups.some((group: string) => group.toLowerCase().includes(adminGroup.toLowerCase()))
  )) {
    return 'admin'
  }
  
  // Check for role claim
  if (claims?.role === 'admin' || claims?.roles?.includes('admin')) {
    return 'admin'
  }
  
  // Check for editor groups or roles
  const editorGroups = ['editor', 'editors', 'Editor', 'Writers']
  if (editorGroups.some(editorGroup => 
    groups.some((group: string) => group.toLowerCase().includes(editorGroup.toLowerCase()))
  )) {
    return 'editor'
  }
  
  if (claims?.role === 'editor' || claims?.roles?.includes('editor')) {
    return 'editor'
  }
  
  // Default to viewer
  return 'viewer'
}

// ADFS login
export const adfsLogin = async () => {
  const msal = initializeMsal()
  if (!msal) {
    throw new Error('ADFS is not configured. Please set VITE_ADFS_CLIENT_ID and VITE_ADFS_AUTHORITY in .env.local')
  }

  try {
    const response = await msal.loginPopup(loginRequest)
    return response
  } catch (error) {
    console.error('ADFS login failed:', error)
    throw error
  }
}

// Silent token acquisition
export const acquireTokenSilently = async () => {
  const msal = initializeMsal()
  if (!msal) return null

  const accounts = msal.getAllAccounts()
  if (accounts.length === 0) return null

  try {
    const request = {
      ...loginRequest,
      account: accounts[0]
    }
    return await msal.acquireTokenSilent(request)
  } catch (error) {
    if (error instanceof InteractionRequiredAuthError) {
      // Fallback to interactive method
      return await msal.acquireTokenPopup(request)
    }
    throw error
  }
}

// Get current ADFS user
export const getCurrentAdfsUser = async () => {
  const msal = initializeMsal()
  if (!msal) return null

  const accounts = msal.getAllAccounts()
  if (accounts.length === 0) return null

  const account = accounts[0]
  
  // Try to get fresh token to ensure user is still valid
  try {
    await acquireTokenSilently()
  } catch (error) {
    console.warn('Unable to acquire token silently:', error)
    return null
  }

  // Convert ADFS account to our User format
  return {
    id: account.localAccountId || account.homeAccountId,
    name: account.name || account.username,
    email: account.username,
    role: getUserRoleFromClaims(account),
    lastLogin: new Date().toISOString(),
    adfsAccount: account
  }
}

// ADFS logout
export const adfsLogout = async () => {
  const msal = initializeMsal()
  if (!msal) return

  const accounts = msal.getAllAccounts()
  if (accounts.length === 0) return

  try {
    await msal.logoutPopup({
      account: accounts[0],
      postLogoutRedirectUri: window.location.origin
    })
  } catch (error) {
    console.error('ADFS logout failed:', error)
    // Clear cache even if logout fails
    msal.clearCache()
  }
}

// Initialize ADFS on app startup
export const initializeAdfs = async () => {
  const msal = initializeMsal()
  if (!msal) return null

  try {
    await msal.initialize()
    return await getCurrentAdfsUser()
  } catch (error) {
    console.error('ADFS initialization failed:', error)
    return null
  }
}

// Get MSAL instance (for advanced usage)
export const getMsalInstance = () => {
  return initializeMsal()
}
