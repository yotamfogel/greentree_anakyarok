import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react'
import { usePermissions } from './PermissionContext'
import { getDatabaseService } from '../services/postgreSQLService'
import { getDatabaseConfig } from '../config/databaseConfig'

// Sagach data interfaces
export interface SagachItem {
  id: string
  [key: string]: string // Dynamic columns
}

export interface SagachVersion {
  version: string
  date: string
  time: string
  data: SagachItem[]
  changes?: string[]
}

export interface SagachTable {
  id: string
  name: string
  data: SagachItem[]
  versions: SagachVersion[]
  currentVersion: string
  createdBy: string
  createdAt: string
  lastModifiedBy: string
  lastModifiedAt: string
}

// Arena options available for selection
export const ARENA_OPTIONS = [
  '110',
  '130',
  '150',
  '160',
  '170',
  '180',
  '190',
  '210',
  'מוד"ש',
  'פקמ"ז',
  'פצ"ן',
  'פד"ם',
  'על-זירתי'
] as const

export type ArenaOption = typeof ARENA_OPTIONS[number]

export interface PhaseEntry {
  startDate: string
  completionDate?: string
  timeSpentDays: number
}

export interface PhaseData {
  entries?: PhaseEntry[]
  currentEntry?: PhaseEntry
  totalTimeSpentDays?: number
}

export interface FileAttachment {
  id: string
  name: string
  type: string
  size: number
  uploadDate: string
  url?: string // For downloaded files or file references
  data?: string // Base64 data for small files or file content
}

export interface SagachimStatusItem {
  id: string
  name: string
  description: string
  provider: string
  lastUpdated: string
  arena: ArenaOption[]
  priority: 'נמוך' | 'בינוני' | 'גבוה' | 'TOP'
  sagachType?: string // סוג הסג"ח - optional free text field
  processStatus: 1 | 2 | 3 | 4 | 5 | 6 | 7
  processStartDate?: string
  estimatedCompletion?: string
  contactPerson?: string
  notes?: string
  statusUpdates?: StatusUpdate[]
  phaseData?: {
    [key: number]: PhaseData
  }
  notifications?: boolean
  notificationMethod?: 'email'
  notificationFrequency?: 'daily' | 'weekly' | 'status_change'
  completionDate?: string
  notificationSubscribers?: NotificationSubscriber[]
  attachments?: FileAttachment[] // Relevant files attached to this sagach
  createdBy: string
  createdAt: string
  lastModifiedBy: string
  lastModifiedAt: string
}

interface StatusUpdate {
  id: string
  message: string
  timestamp: string
  type: 'user' | 'system' | 'status_change'
  oldStatus?: number
  newStatus?: number
  processStatus?: number
  author?: string
}


export interface NotificationSubscriber {
  userId: string
  userName: string
  notificationMethod: 'email'
  notificationFrequency: 'daily' | 'weekly' | 'status_change'
  subscribedAt: string
}

// Data change events for real-time updates
export interface DataChangeEvent {
  type: 'sagach_created' | 'sagach_updated' | 'sagach_deleted' | 'status_created' | 'status_updated' | 'status_deleted'
  data: any
  timestamp: string
  userId: string
  userName: string
}

interface SagachDataContextType {
  // Sagach Manager Data
  sagachs: SagachTable[]
  addSagach: (sagach: Omit<SagachTable, 'createdBy' | 'createdAt' | 'lastModifiedBy' | 'lastModifiedAt'>) => void
  updateSagach: (id: string, updates: Partial<SagachTable>) => void
  deleteSagach: (id: string) => void

  // Sagachim Status Data
  sagachimStatus: SagachimStatusItem[]
  addSagachimStatus: (item: Omit<SagachimStatusItem, 'createdBy' | 'createdAt' | 'lastModifiedBy' | 'lastModifiedAt'>) => void
  updateSagachimStatus: (id: string, updates: Partial<SagachimStatusItem>) => void
  deleteSagachimStatus: (id: string) => void

  // Data management
  clearAllData: () => void

  // Database status
  useDatabase: boolean
  isDatabaseConnected: boolean
  refreshDatabaseConnection: () => void

  // Real-time updates
  subscribeToChanges: (callback: (event: DataChangeEvent) => void) => () => void
  isLoading: boolean
  error: string | null
}

const SagachDataContext = createContext<SagachDataContextType | undefined>(undefined)

// Storage keys
const SAGACH_DATA_KEY = 'shared_sagach_data'
const SAGACHIM_STATUS_KEY = 'shared_sagachim_status_data'
const DATA_CHANGES_KEY = 'shared_data_changes'

// Old storage keys for migration
const OLD_SAGACH_DATA_KEY = 'sagach_manager_data'
const OLD_SAGACHIM_STATUS_KEY = 'sagachim_data'

interface SagachDataProviderProps {
  children: ReactNode
}

export const SagachDataProvider: React.FC<SagachDataProviderProps> = ({ children }) => {
  const { user } = usePermissions()
  const [sagachs, setSagachs] = useState<SagachTable[]>([])
  const [sagachimStatus, setSagachimStatus] = useState<SagachimStatusItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [changeListeners, setChangeListeners] = useState<Set<(event: DataChangeEvent) => void>>(new Set())
  const [dbService, setDbService] = useState<any>(null)
  const [useDatabase, setUseDatabase] = useState(false)
  const [isDatabaseConnected, setIsDatabaseConnected] = useState(false)

  // Migration function to add missing fields to old data
  const migrateSagachData = (data: any[]): SagachTable[] => {
    return data.map(item => ({
      ...item,
      createdBy: item.createdBy || 'migrated',
      createdAt: item.createdAt || new Date().toISOString(),
      lastModifiedBy: item.lastModifiedBy || 'migrated',
      lastModifiedAt: item.lastModifiedAt || new Date().toISOString()
    }))
  }

  const migrateStatusData = (data: any[]): SagachimStatusItem[] => {
    return data.map(item => ({
      ...item,
      priority: item.priority || 'בינוני',
      arena: item.arena || [], // Add this line to ensure arena is always an array
      createdBy: item.createdBy || 'migrated',
      createdAt: item.createdAt || new Date().toISOString(),
      lastModifiedBy: item.lastModifiedBy || 'migrated',
      lastModifiedAt: item.lastModifiedAt || new Date().toISOString()
    }))
  }


  // Save data to database (if available) and localStorage
  const saveData = useCallback(async (type: 'sagachs' | 'sagachimStatus', data: any) => {
    try {
      // Always save to localStorage as primary storage
      const key = type === 'sagachs' ? SAGACH_DATA_KEY : SAGACHIM_STATUS_KEY
      localStorage.setItem(key, JSON.stringify(data))

      // If database is available, also save there (don't fail if it doesn't work)
      if (useDatabase && dbService && dbService.isDatabaseConnected()) {
        try {
          if (type === 'sagachs') {
            // Save each sagach individually to database
            await Promise.all(data.map((sagach: SagachTable) => dbService.saveSagach(sagach)))
          } else {
            // Save each status item individually to database
            await Promise.all(data.map((item: SagachimStatusItem) => dbService.saveSagachimStatus(item)))
          }
          console.log('💾 Data saved to PostgreSQL database')
        } catch (dbError) {
          console.error('❌ Failed to save to database, but localStorage saved successfully:', dbError)
          // Don't set error state - localStorage save was successful
        }
      }
    } catch (err) {
      console.error('Failed to save shared data:', err)
      setError('Failed to save data')
    }
  }, [useDatabase, dbService])

  // Emit change event
  const emitChange = useCallback(async (event: DataChangeEvent) => {
    // Store the change event in localStorage
    try {
      const existingChanges = localStorage.getItem(DATA_CHANGES_KEY)
      const changes = existingChanges ? JSON.parse(existingChanges) : []
      changes.push(event)

      // Keep only last 100 changes to prevent storage bloat
      if (changes.length > 100) {
        changes.splice(0, changes.length - 100)
      }

      localStorage.setItem(DATA_CHANGES_KEY, JSON.stringify(changes))
    } catch (err) {
      console.error('Failed to store change event:', err)
    }

    // Log to database if available (don't fail if it doesn't work)
    if (useDatabase && dbService && dbService.isDatabaseConnected() && user) {
      try {
        await dbService.logDataChange(event.type, event.data, event.userId, event.userName)
      } catch (err) {
        console.error('Failed to log change to database:', err)
        // Don't set error state - this is just audit logging
      }
    }

    // Notify all listeners
    changeListeners.forEach(callback => {
      try {
        callback(event)
      } catch (err) {
        console.error('Error in change listener:', err)
      }
    })
  }, [changeListeners, useDatabase, dbService, user])

  // Initialize database connection and load data
  useEffect(() => {
    const initializeAndLoadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Initialize database service
        const databaseService = getDatabaseService()
        setDbService(databaseService)

        // Try to connect to database and use it if available
        let databaseAvailable = false
        try {
          await databaseService.initialize()
          await databaseService.createTables()
          databaseAvailable = true
          setUseDatabase(true)
          setIsDatabaseConnected(databaseService.isDatabaseConnected())
          console.log('💾 Using PostgreSQL database for data storage')
        } catch (dbError) {
          console.warn('⚠️ PostgreSQL not available, falling back to localStorage:', dbError)
          setUseDatabase(false)
          setIsDatabaseConnected(false)
          databaseAvailable = false
        }

        // Load data based on availability
        if (databaseAvailable && databaseService) {
          try {
            const [sagachData, statusData] = await Promise.all([
              databaseService.loadSagachs(),
              databaseService.loadSagachimStatus()
            ])

            setSagachs(sagachData)
            setSagachimStatus(statusData)
            console.log('✅ Data loaded from PostgreSQL database')
          } catch (dbLoadError) {
            console.error('❌ Failed to load from database, falling back to localStorage:', dbLoadError)
            setUseDatabase(false)
            // Fall through to localStorage loading
          }
        }

        // Always load from localStorage as fallback or primary source
        if (!databaseAvailable || !useDatabase) {
          // Load from localStorage with migration
          let sagachData = localStorage.getItem(SAGACH_DATA_KEY)
          if (sagachData) {
            const parsed = JSON.parse(sagachData)
            setSagachs(parsed)
          } else {
            // Check for old localStorage keys and migrate data
            const oldSagachData = localStorage.getItem(OLD_SAGACH_DATA_KEY)
            if (oldSagachData) {
              console.log('🔄 Migrating sagach data from old key...')
              const parsed = JSON.parse(oldSagachData)
              const migratedData = migrateSagachData(parsed)
              setSagachs(migratedData)
              // Save to new key
              localStorage.setItem(SAGACH_DATA_KEY, JSON.stringify(migratedData))
              // Remove old key
              localStorage.removeItem(OLD_SAGACH_DATA_KEY)
              console.log('✅ Sagach data migration completed')
            }
          }

          // Load sagachim status data with migration
          let statusData = localStorage.getItem(SAGACHIM_STATUS_KEY)
          if (statusData) {
            const parsed = JSON.parse(statusData)
            setSagachimStatus(parsed)
          } else {
            // Check for old localStorage keys and migrate data
            const oldStatusData = localStorage.getItem(OLD_SAGACHIM_STATUS_KEY)
            if (oldStatusData) {
              console.log('🔄 Migrating status data from old key...')
              const parsed = JSON.parse(oldStatusData)
              const migratedData = migrateStatusData(parsed)
              setSagachimStatus(migratedData)
              // Save to new key
              localStorage.setItem(SAGACHIM_STATUS_KEY, JSON.stringify(migratedData))
              // Remove old key
              localStorage.removeItem(OLD_SAGACHIM_STATUS_KEY)
              console.log('✅ Status data migration completed')
            }
          }

          if (databaseAvailable) {
            console.log('💾 Using localStorage as primary storage (database available but loading failed)')
          } else {
            console.log('💾 Using localStorage as primary storage (database not available)')
          }
        }
      } catch (err) {
        console.error('Failed to initialize and load data:', err)
        setError('Failed to load data')
        // Still try to load from localStorage as ultimate fallback
        try {
          const sagachData = localStorage.getItem(SAGACH_DATA_KEY)
          const statusData = localStorage.getItem(SAGACHIM_STATUS_KEY)

          if (sagachData) setSagachs(JSON.parse(sagachData))
          if (statusData) setSagachimStatus(JSON.parse(statusData))
        } catch (fallbackError) {
          console.error('Even localStorage fallback failed:', fallbackError)
        }
      } finally {
        setIsLoading(false)
      }
    }

    initializeAndLoadData()
  }, [])

  // Track database connection state changes
  useEffect(() => {
    if (dbService) {
      const checkConnection = async () => {
        try {
          const connected = await dbService.refreshConnectionState()
          setIsDatabaseConnected(connected)
        } catch (error) {
          console.error('❌ Periodic connection check failed:', error)
          setIsDatabaseConnected(false)
        }
      }

      // Check connection immediately
      checkConnection()

      // Set up periodic connection check (every 5 seconds)
      const intervalId = setInterval(checkConnection, 5000)

      return () => clearInterval(intervalId)
    } else {
      setIsDatabaseConnected(false)
    }
  }, [dbService])


  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SAGACH_DATA_KEY && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue)
          setSagachs(newData)
        } catch (err) {
          console.error('Failed to parse sagach data from storage event:', err)
        }
      } else if (e.key === SAGACHIM_STATUS_KEY && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue)
          setSagachimStatus(newData)
        } catch (err) {
          console.error('Failed to parse status data from storage event:', err)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [])

  // Sagach Manager functions
  const addSagach = useCallback((sagachData: Omit<SagachTable, 'createdBy' | 'createdAt' | 'lastModifiedBy' | 'lastModifiedAt'>) => {
    // If user is not loaded yet, skip the creation silently (don't throw error)
    // This prevents timing issues when components initialize before auth completes
    if (!user) {
      console.warn('⚠️ Attempted to create sagach before user authentication completed')
      return
    }

    const now = new Date().toISOString()
    const newSagach: SagachTable = {
      ...sagachData,
      createdBy: user.id,
      createdAt: now,
      lastModifiedBy: user.id,
      lastModifiedAt: now
    }

    setSagachs(prev => {
      const updated = [...prev, newSagach]
      saveData('sagachs', updated)
      return updated
    })

    emitChange({
      type: 'sagach_created',
      data: newSagach,
      timestamp: now,
      userId: user.id,
      userName: user.name
    })
  }, [user, saveData, emitChange])

  const updateSagach = useCallback((id: string, updates: Partial<SagachTable>) => {
    // If user is not loaded yet, skip the update silently (don't throw error)
    // This prevents timing issues when components initialize before auth completes
    if (!user) {
      console.warn('⚠️ Attempted to update sagach before user authentication completed')
      return
    }

    const now = new Date().toISOString()
    setSagachs(prev => {
      const updated = prev.map(sagach =>
        sagach.id === id
          ? {
              ...sagach,
              ...updates,
              lastModifiedBy: user.id,
              lastModifiedAt: now
            }
          : sagach
      )
      saveData('sagachs', updated)
      return updated
    })

    emitChange({
      type: 'sagach_updated',
      data: { id, updates },
      timestamp: now,
      userId: user.id,
      userName: user.name
    })
  }, [user, saveData, emitChange])

  const deleteSagach = useCallback(async (id: string) => {
    // If user is not loaded yet, skip the deletion silently (don't throw error)
    // This prevents timing issues when components initialize before auth completes
    if (!user) {
      console.warn('⚠️ Attempted to delete sagach before user authentication completed')
      return
    }

    const now = new Date().toISOString()
    setSagachs(prev => {
      const updated = prev.filter(sagach => sagach.id !== id)
      saveData('sagachs', updated)
      return updated
    })

    // Delete from database if available (don't fail if it doesn't work)
    if (useDatabase && dbService && dbService.isDatabaseConnected()) {
      try {
        await dbService.deleteSagach(id)
      } catch (err) {
        console.error('Failed to delete sagach from database:', err)
        // Don't set error state - localStorage deletion was successful
      }
    }

    emitChange({
      type: 'sagach_deleted',
      data: { id },
      timestamp: now,
      userId: user.id,
      userName: user.name
    })
  }, [user, saveData, emitChange, useDatabase, dbService])

  // Sagachim Status functions
  const addSagachimStatus = useCallback((itemData: Omit<SagachimStatusItem, 'createdBy' | 'createdAt' | 'lastModifiedBy' | 'lastModifiedAt'>) => {
    // If user is not loaded yet, skip the creation silently (don't throw error)
    // This prevents timing issues when components initialize before auth completes
    if (!user) {
      console.warn('⚠️ Attempted to create status item before user authentication completed')
      return
    }

    const now = new Date().toISOString()
    const newItem: SagachimStatusItem = {
      ...itemData,
      createdBy: user.id,
      createdAt: now,
      lastModifiedBy: user.id,
      lastModifiedAt: now
    }

    setSagachimStatus(prev => {
      const updated = [...prev, newItem]
      saveData('sagachimStatus', updated)
      return updated
    })

    emitChange({
      type: 'status_created',
      data: newItem,
      timestamp: now,
      userId: user.id,
      userName: user.name
    })
  }, [user, saveData, emitChange])

  const updateSagachimStatus = useCallback((id: string, updates: Partial<SagachimStatusItem>) => {
    // If user is not loaded yet, skip the update silently (don't throw error)
    // This prevents timing issues when components initialize before auth completes
    if (!user) {
      console.warn('⚠️ Attempted to update status item before user authentication completed')
      return
    }

    const now = new Date().toISOString()
    setSagachimStatus(prev => {
      const updated = prev.map(item =>
        item.id === id
          ? {
              ...item,
              ...updates,
              lastModifiedBy: user.id,
              lastModifiedAt: now
            }
          : item
      )
      saveData('sagachimStatus', updated)
      return updated
    })

    emitChange({
      type: 'status_updated',
      data: { id, updates },
      timestamp: now,
      userId: user.id,
      userName: user.name
    })
  }, [user, saveData, emitChange])

  const deleteSagachimStatus = useCallback(async (id: string) => {
    // If user is not loaded yet, skip the deletion silently (don't throw error)
    // This prevents timing issues when components initialize before auth completes
    if (!user) {
      console.warn('⚠️ Attempted to delete status item before user authentication completed')
      return
    }

    const now = new Date().toISOString()
    setSagachimStatus(prev => {
      const updated = prev.filter(item => item.id !== id)
      saveData('sagachimStatus', updated)
      return updated
    })

    // Delete from database if available (don't fail if it doesn't work)
    if (useDatabase && dbService && dbService.isDatabaseConnected()) {
      try {
        await dbService.deleteSagachimStatus(id)
      } catch (err) {
        console.error('Failed to delete status item from database:', err)
        // Don't set error state - localStorage deletion was successful
      }
    }

    emitChange({
      type: 'status_deleted',
      data: { id },
      timestamp: now,
      userId: user.id,
      userName: user.name
    })
  }, [user, saveData, emitChange, useDatabase, dbService])

  // Clear all data
  const clearAllData = useCallback(() => {
    try {
      // Clear all localStorage keys
      localStorage.removeItem(SAGACH_DATA_KEY)
      localStorage.removeItem(SAGACHIM_STATUS_KEY)
      localStorage.removeItem(DATA_CHANGES_KEY)

      // Also clear old keys if they exist
      localStorage.removeItem(OLD_SAGACH_DATA_KEY)
      localStorage.removeItem(OLD_SAGACHIM_STATUS_KEY)

      // Reset state
      setSagachs([])
      setSagachimStatus([])
      setError(null)

      console.log('🗑️ All data cleared successfully')
    } catch (err) {
      console.error('Failed to clear data:', err)
      setError('Failed to clear data')
    }
  }, [setSagachs, setSagachimStatus, setError])

  // Subscribe to changes
  const subscribeToChanges = useCallback((callback: (event: DataChangeEvent) => void) => {
    setChangeListeners(prev => new Set([...prev, callback]))

    return () => {
      setChangeListeners(prev => {
        const newSet = new Set(prev)
        newSet.delete(callback)
        return newSet
      })
    }
  }, [setChangeListeners])

  // Manual refresh of database connection state
  const refreshDatabaseConnection = useCallback(async () => {
    if (dbService) {
      try {
        const connected = await dbService.refreshConnectionState()
        setIsDatabaseConnected(connected)
        console.log('🔄 Database connection state refreshed:', connected)
      } catch (error) {
        console.error('❌ Failed to refresh database connection state:', error)
        setIsDatabaseConnected(false)
      }
    }
  }, [dbService])

  const value: SagachDataContextType = useMemo(() => ({
    sagachs,
    addSagach,
    updateSagach,
    deleteSagach,
    sagachimStatus,
    addSagachimStatus,
    updateSagachimStatus,
    deleteSagachimStatus,
    clearAllData,
    useDatabase,
    isDatabaseConnected,
    refreshDatabaseConnection,
    subscribeToChanges,
    isLoading,
    error
  }), [
    sagachs,
    addSagach,
    updateSagach,
    deleteSagach,
    sagachimStatus,
    addSagachimStatus,
    updateSagachimStatus,
    deleteSagachimStatus,
    clearAllData,
    useDatabase,
    isDatabaseConnected,
    subscribeToChanges,
    isLoading,
    error
  ])

  // Expose clearAllData globally for easy access
  useEffect(() => {
    (window as any).clearAllSagachData = clearAllData
    return () => {
      delete (window as any).clearAllSagachData
    }
  }, [clearAllData])

  return (
    <SagachDataContext.Provider value={value}>
      {children}
    </SagachDataContext.Provider>
  )
}

export const useSagachData = (): SagachDataContextType => {
  const context = useContext(SagachDataContext)
  if (context === undefined) {
    throw new Error('useSagachData must be used within a SagachDataProvider')
  }
  return context
}

// Hook for real-time updates
export const useRealtimeUpdates = (callback: (event: DataChangeEvent) => void) => {
  const { subscribeToChanges } = useSagachData()

  useEffect(() => {
    const unsubscribe = subscribeToChanges(callback)
    return unsubscribe
  }, [subscribeToChanges, callback])
}