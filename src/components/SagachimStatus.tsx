import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { usePermissions } from '../contexts/PermissionContext'
import { useSagachData } from '../contexts/SagachDataContext'

// Custom date formatting function to use '/' instead of '.'
const formatDateWithSlashes = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

interface PhaseEntry {
  startDate: string
  completionDate?: string
  timeSpentDays: number
}

interface PhaseData {
  entries?: PhaseEntry[] // History of all entries to this phase
  currentEntry?: PhaseEntry // Current active entry (for ongoing phases)
  totalTimeSpentDays?: number // Total time spent in this phase across all entries
}

interface StatusUpdate {
  id: string
  message: string
  timestamp: string
  type: 'user' | 'system' | 'status_change'
  oldStatus?: number
  newStatus?: number
  processStatus?: number // The process state when this message was written
  author?: string // Name of the person who wrote the message
}

const PRIORITY_OPTIONS = ['נמוך', 'בינוני', 'גבוה', 'TOP'] as const
type PriorityOption = typeof PRIORITY_OPTIONS[number]

const PRIORITY_LABELS: Record<PriorityOption, string> = {
  'נמוך': 'נמוך',
  'בינוני': 'בינוני',
  'גבוה': 'גבוה',
  'TOP': 'TOP'
}

interface SagachimStatusItem {
  id: string
  name: string
  description: string
  provider: string
  lastUpdated: string
  arena: string // זירה
  priority: PriorityOption
  processStatus: 1 | 2 | 3 | 4 | 5 | 6 | 7 // Current step in process chain (1-7)
  processStartDate?: string
  estimatedCompletion?: string
  contactPerson?: string
  notes?: string
  statusUpdates?: StatusUpdate[] // Chat-like updates with timestamps
  phaseData?: {
    [key: number]: PhaseData // Phase number (1-7) -> timing data
  }
  notifications?: boolean // Whether current user is subscribed to updates (for backward compatibility)
  notificationMethod?: 'email' | 'whatsapp' // How to receive notifications
  notificationFrequency?: 'daily' | 'weekly' | 'status_change' // Notification frequency
  completionDate?: string // Date when status was set to "מובצע" (7)
  notificationSubscribers?: NotificationSubscriber[] // List of users subscribed to notifications for this sagach
}

interface NotificationSubscriber {
  userId: string
  userName: string
  notificationMethod: 'email' | 'whatsapp'
  notificationFrequency: 'daily' | 'weekly' | 'status_change'
  subscribedAt: string
}

const PROCESS_STEPS = [
  'ממתין לבשלות בצד ספק',
  'ממתין לקבלת דג"ח והתנעה', 
  'בתהליכי אפיון',
  'ממתין לאינטגרציות',
  'אינטגרציות',
  'מבצוע'
] as const

const PROCESS_STEPS_WITH_COMPLETED = [
  'ממתין לבשלות בצד ספק',
  'ממתין לקבלת דג"ח והתנעה', 
  'בתהליכי אפיון',
  'ממתין לאינטגרציות',
  'אינטגרציות',
  'מבצוע',
  'מובצע'
] as const

// Add CSS animation for spinner
const spinnerAnimation = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;

// Inject CSS animation into document head
if (typeof document !== 'undefined' && !document.head.querySelector('#spinner-animation')) {
  const style = document.createElement('style');
  style.id = 'spinner-animation';
  style.textContent = spinnerAnimation;
  document.head.appendChild(style);
}

export const SagachimStatus = () => {
  const { canEditStatus, canCreateSagach, canDeleteSagach, canChat, user } = usePermissions()
  const { sagachimStatus, addSagachimStatus, updateSagachimStatus, deleteSagachimStatus, clearAllData, isLoading, error } = useSagachData()
  
  // Helper functions for notification subscribers
  const isUserSubscribed = (sagach: SagachimStatusItem, userId: string): boolean => {
    return sagach.notificationSubscribers?.some(sub => sub.userId === userId) || false
  }
  
  const getUserSubscription = (sagach: SagachimStatusItem, userId: string): NotificationSubscriber | undefined => {
    return sagach.notificationSubscribers?.find(sub => sub.userId === userId)
  }
  
  const addNotificationSubscriber = (sagach: SagachimStatusItem, userId: string, userName: string, method: 'email' | 'whatsapp', frequency: 'daily' | 'weekly' | 'status_change'): SagachimStatusItem => {
    const newSubscriber: NotificationSubscriber = {
      userId,
      userName,
      notificationMethod: method,
      notificationFrequency: frequency,
      subscribedAt: new Date().toISOString()
    }
    
    const existingSubscribers = sagach.notificationSubscribers || []
    const updatedSubscribers = [...existingSubscribers.filter(sub => sub.userId !== userId), newSubscriber]
    
    return {
      ...sagach,
      notificationSubscribers: updatedSubscribers,
      // Keep backward compatibility
      notifications: isUserSubscribed(sagach, userId),
      notificationMethod: method,
      notificationFrequency: frequency
    }
  }
  
  const removeNotificationSubscriber = (sagach: SagachimStatusItem, userId: string): SagachimStatusItem => {
    const updatedSubscribers = (sagach.notificationSubscribers || []).filter(sub => sub.userId !== userId)
    
    return {
      ...sagach,
      notificationSubscribers: updatedSubscribers,
      // Keep backward compatibility
      notifications: false
    }
  }
  
  
  // Standardized button styles
  const buttonStyles = {
    // Primary action buttons (create, delete, etc.)
    primary: {
      appearance: 'none' as const,
      border: 'none',
      borderRadius: '12px',
      padding: '12px 20px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontSize: '14px',
      fontWeight: '600',
      fontFamily: 'Segoe UI, sans-serif',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      direction: 'rtl' as const,
      outline: 'none'
    },
    // Filter dropdown buttons
    filter: {
      appearance: 'none' as const,
      border: '1px solid rgba(255,255,255,0.14)',
      background: 'transparent',
      color: 'var(--text)',
      borderRadius: '12px',
      padding: '8px 14px',
      cursor: 'pointer',
      transition: 'transform 120ms ease',
      fontSize: '14px',
      direction: 'rtl' as const,
      outline: 'none',
      fontFamily: 'Segoe UI, sans-serif',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      textAlign: 'right' as const,
      boxShadow: 'none'
    },
    // Close/remove buttons (small circular buttons)
    close: {
      background: 'none',
      border: 'none',
      color: 'var(--muted)',
      cursor: 'pointer',
      fontSize: '14px',
      padding: '0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      transition: 'all 0.2s ease'
    }
  }
  
  // Default sample data
const getDefaultSagachim = (): SagachimStatusItem[] => [
    {
      id: 'sagach1',
      name: 'סג"ח ראשי',
      description: 'סג"ח ראשי לניהול נתוני משתמשים',
      provider: 'מחלקת IT',
      lastUpdated: '2024-01-15',
      arena: 'ניהול נתונים',
      priority: 'גבוה',
      processStatus: 3, // חזר לשלב 3 (בתהליכי אפיון)
      processStartDate: '2024-01-01',
      estimatedCompletion: '2024-02-15',
      contactPerson: 'יוסי כהן',
      notes: 'חזר לשלב אפיון - צפוי להסתיים בזמן',
      notifications: false,
      statusUpdates: [],
      notificationSubscribers: [],
      phaseData: {
        1: {
          entries: [{ startDate: '2024-01-01', completionDate: '2024-01-07', timeSpentDays: 6 }],
          totalTimeSpentDays: 6
        },
        2: {
          entries: [{ startDate: '2024-01-08', completionDate: '2024-01-15', timeSpentDays: 7 }],
          totalTimeSpentDays: 7
        },
        3: {
          entries: [
            { startDate: '2024-01-16', completionDate: '2024-01-25', timeSpentDays: 9 }, // שהייה ראשונה
            { startDate: '2024-01-31', timeSpentDays: 0 } // שהייה שנייה - נוכחית
          ],
          currentEntry: { startDate: '2024-01-31', timeSpentDays: 0 },
          totalTimeSpentDays: 9 // סה"כ מהשהייה הראשונה
        },
        4: {
          entries: [{ startDate: '2024-01-26', completionDate: '2024-01-30', timeSpentDays: 4 }],
          totalTimeSpentDays: 4
        },
        5: {
          totalTimeSpentDays: 0
        },
        6: {}, 7: {} // Not started yet
      }
    },
    {
      id: 'sagach2',
      name: 'סג"ח משני',
      description: 'סג"ח משני לניהול כתובות',
      provider: 'מחלקת IT',
      lastUpdated: '2024-01-10',
      arena: 'ביטחון ואבטחה',
      priority: 'בינוני',
      processStatus: 2,
      processStartDate: '2024-01-05',
      estimatedCompletion: '2024-03-01',
      contactPerson: 'שרה לוי',
      notes: 'ממתינים לאישור נוסף מהספק',
      notifications: false,
      statusUpdates: [],
      notificationSubscribers: [],
      phaseData: {
        1: {
          entries: [{ startDate: '2024-01-05', completionDate: '2024-01-12', timeSpentDays: 7 }],
          totalTimeSpentDays: 7
        },
        2: {
          currentEntry: { startDate: '2024-01-13', timeSpentDays: 0 },
          totalTimeSpentDays: 0
        },
        3: {}, 4: {}, 5: {}, 6: {}, 7: {}
      }
    },
    {
      id: 'sagach3',
      name: 'סג"ח תשלומים',
      description: 'סג"ח לניהול תשלומים וחשבוניות',
      provider: 'מחלקת כספים',
      lastUpdated: '2024-01-08',
      arena: 'פיתוח עסקי',
      priority: 'נמוך',
      processStatus: 1,
      processStartDate: '2024-01-08',
      estimatedCompletion: '2024-04-01',
      contactPerson: 'דני אברהם',
      notes: 'ממתינים לבשלות מצד הספק',
      notifications: true,
      statusUpdates: [],
      phaseData: {
        1: {
          currentEntry: { startDate: '2024-01-08', timeSpentDays: 0 },
          totalTimeSpentDays: 0
        },
        2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {}
      }
    },
    {
      id: 'sagach4',
      name: 'פפסי',
      description: 'הנגישות ממודרת',
      provider: 'שב"כ',
      lastUpdated: '2024-01-12',
      arena: '190',
      priority: 'גבוה',
      processStatus: 6,
      processStartDate: '2023-11-01',
      estimatedCompletion: '2024-01-15',
      contactPerson: 'מיכל דוד',
      notes: 'הושלם בהצלחה!',
      notifications: false,
      statusUpdates: [],
      notificationSubscribers: [],
      phaseData: {
        1: {
          entries: [{ startDate: '2023-11-01', completionDate: '2023-11-10', timeSpentDays: 9 }],
          totalTimeSpentDays: 9
        },
        2: {
          entries: [{ startDate: '2023-11-11', completionDate: '2023-11-20', timeSpentDays: 9 }],
          totalTimeSpentDays: 9
        },
        3: {
          entries: [{ startDate: '2023-11-21', completionDate: '2023-12-05', timeSpentDays: 14 }],
          totalTimeSpentDays: 14
        },
        4: {
          entries: [{ startDate: '2023-12-06', completionDate: '2023-12-15', timeSpentDays: 9 }],
          totalTimeSpentDays: 9
        },
        5: {
          entries: [{ startDate: '2023-12-16', completionDate: '2023-12-20', timeSpentDays: 4 }],
          totalTimeSpentDays: 4
        },
        6: {
          entries: [{ startDate: '2023-12-21', completionDate: '2024-01-15', timeSpentDays: 25 }],
          totalTimeSpentDays: 25
        },
        7: {}
      }
    },
    {
      id: 'sagach5',
      name: 'סג"ח מלאי',
      description: 'סג"ח לניהול מלאי ומוצרים',
      provider: 'מחלקת לוגיסטיקה',
      lastUpdated: '2023-12-20',
      arena: 'ניהול משאבים',
      priority: 'TOP',
      processStatus: 6,
      processStartDate: '2023-10-01',
      estimatedCompletion: '2023-12-31',
      contactPerson: 'אלי רוזן',
      notes: 'הושלם וארכיבי',
      notifications: false,
      statusUpdates: [],
      notificationSubscribers: [],
      phaseData: {
        1: {
          entries: [{ startDate: '2023-10-01', completionDate: '2023-10-08', timeSpentDays: 7 }],
          totalTimeSpentDays: 7
        },
        2: {
          entries: [{ startDate: '2023-10-09', completionDate: '2023-10-18', timeSpentDays: 9 }],
          totalTimeSpentDays: 9
        },
        3: {
          entries: [{ startDate: '2023-10-19', completionDate: '2023-11-15', timeSpentDays: 27 }],
          totalTimeSpentDays: 27
        },
        4: {
          entries: [{ startDate: '2023-11-16', completionDate: '2023-11-25', timeSpentDays: 9 }],
          totalTimeSpentDays: 9
        },
        5: {
          entries: [{ startDate: '2023-11-26', completionDate: '2023-12-05', timeSpentDays: 9 }],
          totalTimeSpentDays: 9
        },
        6: {
          entries: [{ startDate: '2023-12-06', completionDate: '2023-12-20', timeSpentDays: 14 }],
          totalTimeSpentDays: 14
        },
        7: {}
      }
    },
    {
      id: 'sagach6',
      name: 'סג"ח משאבי אנוש',
      description: 'סג"ח לניהול עובדים ומשכורות',
      provider: 'מחלקת משאבי אנוש',
      lastUpdated: '2024-01-14',
      arena: 'כספים ותקציב',
      priority: 'גבוה',
      processStatus: 3,
      processStartDate: '2023-12-15',
      estimatedCompletion: '2024-02-28',
      contactPerson: 'רונית גולן',
      notes: 'בתהליך אפיון מתקדם',
      notifications: true,
      statusUpdates: [],
      phaseData: {
        1: {
          entries: [{ startDate: '2023-12-15', completionDate: '2023-12-22', timeSpentDays: 7 }],
          totalTimeSpentDays: 7
        },
        2: {
          entries: [{ startDate: '2023-12-23', completionDate: '2024-01-05', timeSpentDays: 13 }],
          totalTimeSpentDays: 13
        },
        3: {
          currentEntry: { startDate: '2024-01-06', timeSpentDays: 0 },
          totalTimeSpentDays: 0
        },
        4: {}, 5: {}, 6: {}, 7: {}
      }
    }
  ]
  
  // Data is now managed by the centralized context

  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedProvider, setSelectedProvider] = useState<string>('')
  const [selectedArena, setSelectedArena] = useState<string>('')
  const [selectedProcessStatus, setSelectedProcessStatus] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'none'>('none')
  const [selectedSagach, setSelectedSagach] = useState<SagachimStatusItem | null>(null)
  const [newUpdate, setNewUpdate] = useState<string>('')
  const [editingStatus, setEditingStatus] = useState<boolean>(false)
  const [newStatusValue, setNewStatusValue] = useState<number>(1)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  // Dropdown states
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState<boolean>(false)
  const [isArenaDropdownOpen, setIsArenaDropdownOpen] = useState<boolean>(false)
  const [isProcessStatusDropdownOpen, setIsProcessStatusDropdownOpen] = useState<boolean>(false)
  const [isStatusEditDropdownOpen, setIsStatusEditDropdownOpen] = useState<boolean>(false)
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState<boolean>(false)
  const [isPriorityDropdownOpen, setIsPriorityDropdownOpen] = useState<boolean>(false)
  
  // Notification settings popup
  const [isNotificationSettingsOpen, setIsNotificationSettingsOpen] = useState<boolean>(false)
  const [notificationMethod, setNotificationMethod] = useState<'email' | 'whatsapp'>('email')
  const [notificationFrequency, setNotificationFrequency] = useState<'daily' | 'weekly' | 'status_change'>('status_change')
  
  // Loading states for actions
  const [isNotificationToggleLoading, setIsNotificationToggleLoading] = useState<boolean>(false)
  const [isStatusChangeLoading, setIsStatusChangeLoading] = useState<boolean>(false)
  
  // New sagach creation popup
  const [isNewSagachPopupOpen, setIsNewSagachPopupOpen] = useState<boolean>(false)
  const [isCreateSagachLoading, setIsCreateSagachLoading] = useState<boolean>(false)
  const [newSagachForm, setNewSagachForm] = useState({
    name: '',
    description: '',
    provider: '',
    arena: '',
    priority: 'בינוני' as PriorityOption
  })

  // Bottom popup indicators
  const [popupIndicator, setPopupIndicator] = useState<{
    message: string
    type: 'success' | 'info' | 'warning'
    isVisible: boolean
  }>({
    message: '',
    type: 'success',
    isVisible: false
  })

  // Debug: Mock date for testing time-based features
  const [mockDate, setMockDate] = useState<Date | null>(null)
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState<boolean>(false)

  // Date editing states
  const [isEditingDate, setIsEditingDate] = useState<boolean>(false)
  const [editDateValue, setEditDateValue] = useState<string>('')

  // Force re-render when date changes
  const [currentDate, setCurrentDate] = useState<Date>(new Date())

  // Get current date (mock or real)
  const getCurrentDate = () => mockDate || currentDate

  // Update current date when mock date changes
  useEffect(() => {
    if (mockDate) {
      setCurrentDate(mockDate)
    } else {
      setCurrentDate(new Date())
    }
  }, [mockDate])

  // Update current date every minute to trigger re-renders for time calculations
  useEffect(() => {
    const interval = setInterval(() => {
      if (!mockDate) {
        setCurrentDate(new Date())
      }
    }, 60000) // Update every minute

    return () => clearInterval(interval)
  }, [mockDate])

  // State to force re-render when times change
  const [, forceUpdate] = useState(0)

  // Force re-render when any data that affects time calculations changes
  useEffect(() => {
    forceUpdate(prev => prev + 1)
  }, [selectedSagach?.id, selectedSagach?.processStatus, selectedSagach?.lastUpdated, mockDate, currentDate, sagachimStatus.length])

  // Additional state for immediate time updates
  const [, immediateUpdate] = useState(0)
  useEffect(() => {
    if (selectedSagach) {
      immediateUpdate(prev => prev + 1)
    }
  }, [mockDate, currentDate])

  // Update all sagach time calculations on mount and when date changes
  useEffect(() => {
    const updateAllSagachTimes = () => {
      if (sagachimStatus.length > 0) {
        const updatedSagachs = sagachimStatus.map(sagach => {
          const currentDate = getCurrentDate()
          const currentPhaseData = { ...(sagach.phaseData || {}) }

          // Update time calculations for all phases
          Object.keys(currentPhaseData).forEach(phaseKey => {
            const phaseNumber = parseInt(phaseKey)
            const phaseData = currentPhaseData[phaseNumber]

            if (phaseData) {
              let completedDays = 0
              if (phaseData.entries) {
                phaseData.entries.forEach((entry: PhaseEntry) => {
                  if (entry.timeSpentDays) {
                    completedDays += entry.timeSpentDays
                  }
                })
              }

              let currentEntryDays = phaseData.currentEntry?.timeSpentDays || 0

              if (phaseData.currentEntry && phaseNumber === sagach.processStatus) {
                const startDate = new Date(phaseData.currentEntry.startDate + 'T00:00:00')
                const endDate = new Date(currentDate.toISOString().split('T')[0] + 'T23:59:59')
                const diffTime = Math.max(0, endDate.getTime() - startDate.getTime())
                currentEntryDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))
              }

              const totalDays = completedDays + currentEntryDays

              currentPhaseData[phaseNumber] = {
                ...phaseData,
                currentEntry: phaseData.currentEntry
                  ? { ...phaseData.currentEntry, timeSpentDays: currentEntryDays }
                  : undefined,
                totalTimeSpentDays: Math.max(phaseData.totalTimeSpentDays || 0, totalDays)
              }
            }
          })

          return {
            ...sagach,
            phaseData: currentPhaseData,
            lastUpdated: formatDateWithSlashes(currentDate)
          }
        })

        // Update all sagachs in one operation
        updatedSagachs.forEach(sagach => {
          updateSagachimStatus(sagach.id, sagach)
        })
      }
    }

    // Update times on mount and when date changes
    updateAllSagachTimes()

    // Force re-render after updating times
    forceUpdate(prev => prev + 1)
    immediateUpdate(prev => prev + 1)
  }, [mockDate, currentDate, sagachimStatus.length, forceUpdate, immediateUpdate])

  // Calculate days spent in a specific phase
  const calculatePhaseDays = useCallback((phaseData: PhaseData, isCurrentPhase: boolean = false): number => {
    if (!phaseData) return 0

    const completedEntriesTotal = (phaseData.entries || []).reduce((sum, entry) => {
      if (typeof entry.timeSpentDays === 'number' && !Number.isNaN(entry.timeSpentDays)) {
        return sum + entry.timeSpentDays
      }
      return sum
    }, 0)

    const recordedTotal = typeof phaseData.totalTimeSpentDays === 'number' && !Number.isNaN(phaseData.totalTimeSpentDays)
      ? phaseData.totalTimeSpentDays
      : 0

    // Base total excludes the currently active entry so we can recalculate it live when needed
    const currentEntryRecorded = typeof phaseData.currentEntry?.timeSpentDays === 'number' && !Number.isNaN(phaseData.currentEntry?.timeSpentDays)
      ? phaseData.currentEntry!.timeSpentDays
      : 0

    const baseTotal = Math.max(completedEntriesTotal, recordedTotal)
    const baseWithoutCurrent = Math.max(completedEntriesTotal, Math.max(0, recordedTotal - currentEntryRecorded))

    if (isCurrentPhase && phaseData.currentEntry?.startDate) {
      const startDate = new Date(phaseData.currentEntry.startDate + 'T00:00:00')
      const currentDateValue = getCurrentDate()
      const currentDate = new Date(currentDateValue.toISOString().split('T')[0] + 'T23:59:59')
      const diffTime = Math.max(0, currentDate.getTime() - startDate.getTime())
      const ongoingDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

      return baseWithoutCurrent + ongoingDays
    }

    return baseTotal
  }, [mockDate, currentDate]) // This callback will be recreated when mockDate or currentDate changes

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setIsProviderDropdownOpen(false)
      setIsArenaDropdownOpen(false)
      setIsProcessStatusDropdownOpen(false)
      setIsStatusEditDropdownOpen(false)
      setIsSortDropdownOpen(false)
    setIsPriorityDropdownOpen(false)
    }

    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])

  // Close sagach popup when pressing ESC
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedSagach) {
        setSelectedSagach(null)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedSagach])

  // Auto-scroll to bottom of chat when sagach is selected
  useEffect(() => {
    if (selectedSagach && chatContainerRef.current) {
      // Use setTimeout to ensure the DOM has updated
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
      }, 100)
    }
  }, [selectedSagach])

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (selectedSagach && chatContainerRef.current && selectedSagach.statusUpdates) {
      // Use setTimeout to ensure the DOM has updated
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
      }, 50)
    }
  }, [selectedSagach?.statusUpdates])

  // Show popup indicator
  const showPopupIndicator = (message: string, type: 'success' | 'info' | 'warning' = 'success') => {
    setPopupIndicator({
      message,
      type,
      isVisible: true
    })

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setPopupIndicator(prev => ({ ...prev, isVisible: false }))
    }, 3000)
  }

  // Get unique providers, arenas and statuses for filter dropdowns
  const providers = useMemo(() => {
    const uniqueProviders = [...new Set(sagachimStatus.map(s => s.provider))]
    return uniqueProviders.sort()
  }, [sagachimStatus])

  const arenas = useMemo(() => {
    const uniqueArenas = [...new Set(sagachimStatus.map(s => s.arena))]
    return uniqueArenas.sort()
  }, [sagachimStatus])


  // Filter and sort sagachim based on search, filters, and sort order
  const filteredSagachim = useMemo(() => {
    let filtered = sagachimStatus.filter(sagach => {
      // Hide completed sagachs after 1 week
      if (sagach.processStatus === 7 && sagach.completionDate) {
        const completionDate = new Date(sagach.completionDate)
        const oneWeekAgo = new Date(getCurrentDate())
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
        
        // If completed more than a week ago, hide it
        if (completionDate < oneWeekAgo) {
          return false
        }
      }
      
      const matchesSearch = !searchQuery || 
        sagach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sagach.description.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesProvider = !selectedProvider || sagach.provider === selectedProvider
      const matchesArena = !selectedArena || sagach.arena === selectedArena
      const matchesProcessStatus = !selectedProcessStatus || sagach.processStatus.toString() === selectedProcessStatus
      
      return matchesSearch && matchesProvider && matchesArena && matchesProcessStatus
    })

    // Sort by process status if sort order is specified
    if (sortOrder !== 'none') {
      filtered.sort((a, b) => {
        if (sortOrder === 'asc') {
          return a.processStatus - b.processStatus
        } else if (sortOrder === 'desc') {
          return b.processStatus - a.processStatus
        }
        return 0
      })
    }

    return filtered
  }, [sagachimStatus, searchQuery, selectedProvider, selectedArena, selectedProcessStatus, sortOrder])

  const getProcessStatusColor = (processStatus: number) => {
    switch (processStatus) {
      case 1: return 'rgba(128, 128, 128, 0.8)' // Gray - ממתין לבשלות צד ספק
      case 2: return 'rgba(33, 150, 243, 0.8)' // Blue - ממתין לקבלת דג"ח והתנעה  
      case 3: return 'rgba(255, 152, 0, 0.8)' // Orange - בתהליכי אפיון
      case 4: return 'rgba(233, 30, 99, 0.8)' // Pink - ממתין לאינטגרציות
      case 5: return 'rgba(156, 39, 176, 0.8)' // Purple - באינטגרציות
      case 6: return 'rgba(46, 125, 50, 0.8)' // Dark Green - מבצוע
      case 7: return 'rgba(27, 94, 32, 0.8)' // Darker Green - מובצע (completed)
      default: return 'rgba(158, 158, 158, 0.8)'
    }
  }

  const handleSagachClick = (sagach: SagachimStatusItem) => {
    setSelectedSagach(sagach)
    setNewUpdate('')
    setEditingStatus(false)
    setNewStatusValue(sagach.processStatus)
  }

  const handleDeleteSagach = (sagachId: string, event: React.MouseEvent) => {
    event.stopPropagation() // Prevent triggering the card click
    
    // Check permission for delete
    if (!canDeleteSagach()) {
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'אין לך הרשאה למחוק סג"חים', 
          type: 'error', 
          durationMs: 3000 
        } 
      }))
      return
    }

    // Find the sagach to get its name for confirmation
    const sagachToDelete = sagachimStatus.find(s => s.id === sagachId)
    if (!sagachToDelete) return

    // Show confirmation dialog
    const confirmed = window.confirm(`האם אתה בטוח שברצונך למחוק את הסג"ח "${sagachToDelete.name}"?\nפעולה זו לא ניתנת לביטול.`)
    
    if (confirmed) {
      // Remove the sagach from the array
      deleteSagachimStatus(sagachId)
      console.log(`Deleted sagach "${sagachToDelete.name}" (ID: ${sagachId}). Remaining sagachs: ${sagachimStatus.length - 1}`)
      
      // Close the popup if the deleted sagach was selected
      if (selectedSagach?.id === sagachId) {
        setSelectedSagach(null)
      }
      
      // Show success message
      showPopupIndicator(`הסג"ח "${sagachToDelete.name}" נמחק בהצלחה`, 'success')
    }
  }

   const handleAddUpdate = () => {
     if (!selectedSagach || !newUpdate.trim()) return
     
     // Check permission for chat/messaging
     if (!canChat()) {
       window.dispatchEvent(new CustomEvent('excel:status', { 
         detail: { 
           message: 'אין לך הרשאה להוסיף הודעות', 
           type: 'error', 
           durationMs: 3000 
         } 
       }))
       return
     }
     
     const update: StatusUpdate = {
       id: Date.now().toString(),
       message: newUpdate.trim(),
       timestamp: formatDate(getCurrentDate().toISOString()),
       type: 'user',
       processStatus: selectedSagach.processStatus,
       author: user?.name || 'משתמש'
     }
    
    const updatedSagach = {
      ...selectedSagach,
      statusUpdates: [...(selectedSagach.statusUpdates || []), update],
      lastUpdated: formatDateWithSlashes(getCurrentDate())
    }
    
    console.log('💬 Adding update to sagach:', selectedSagach.name)
    updateSagachimStatus(selectedSagach.id, updatedSagach)
    
    setSelectedSagach(updatedSagach)
    setNewUpdate('')
    showPopupIndicator('הודעה נוספה בהצלחה', 'success')
  }

  const handleStatusChange = async () => {
    if (!selectedSagach || newStatusValue === selectedSagach.processStatus) return

    // Check permission for status editing
    if (!canEditStatus()) {
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'אין לך הרשאה לערוך סטטוסים', 
          type: 'error', 
          durationMs: 3000 
        } 
      }))
      return
    }

    setIsStatusChangeLoading(true)

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800))

      // Calculate days spent in previous phase for the message
      let daysInPreviousPhase = 0
      if (selectedSagach.phaseData?.[selectedSagach.processStatus]?.currentEntry?.startDate) {
        const phaseData = selectedSagach.phaseData[selectedSagach.processStatus]
        daysInPreviousPhase = calculatePhaseDays(phaseData, true)
      }

      const statusUpdate: StatusUpdate = {
        id: Date.now().toString(),
        message: `שונה סטטוס מ-"${selectedSagach.processStatus === 7 ? 'מובצע' : PROCESS_STEPS[selectedSagach.processStatus - 1]}" ל-"${newStatusValue === 7 ? 'מובצע' : PROCESS_STEPS[newStatusValue - 1]}"${daysInPreviousPhase > 0 ? ` •בשלב הקודם ${daysInPreviousPhase} ימים` : ''}`,
        timestamp: formatDate(getCurrentDate().toISOString()),
        type: 'status_change',
        oldStatus: selectedSagach.processStatus,
        newStatus: newStatusValue,
        processStatus: selectedSagach.processStatus,
        author: user?.name || 'משתמש'
      }
    
      // Update phase data when changing status
      const currentDate = getCurrentDate()
      const currentPhaseData = { ...(selectedSagach.phaseData || {}) }

      // Complete the current phase
      if (selectedSagach.phaseData?.[selectedSagach.processStatus]?.currentEntry?.startDate) {
        const currentPhase = currentPhaseData[selectedSagach.processStatus] || {}

        // Calculate time spent in current entry
        const startDate = new Date(currentPhase.currentEntry!.startDate + 'T00:00:00')
        const endDate = new Date(currentDate.toISOString().split('T')[0] + 'T23:59:59')
        const diffTime = Math.abs(endDate.getTime() - startDate.getTime())
        const timeSpentDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

        // Create completed entry
        const completedEntry: PhaseEntry = {
          startDate: currentPhase.currentEntry!.startDate,
          completionDate: currentDate.toISOString().split('T')[0],
          timeSpentDays: timeSpentDays
        }

        // Update phase data with new entry
        currentPhaseData[selectedSagach.processStatus] = {
          entries: [...(currentPhase.entries || []), completedEntry],
          currentEntry: undefined,
          totalTimeSpentDays: timeSpentDays
        }
      }

      // Start the new phase (unless it's completion status 7)
      if (newStatusValue < 7) {
        const newPhaseData = currentPhaseData[newStatusValue] || {}

        // Check if this phase already has a currentEntry (when returning to a previous phase)
        const hasCurrentEntry = newPhaseData.currentEntry

        // If returning to a phase that already has currentEntry, create a new entry
        if (hasCurrentEntry) {
          // Complete the existing current entry
          const completedEntry: PhaseEntry = {
            startDate: newPhaseData.currentEntry!.startDate,
            completionDate: currentDate.toISOString().split('T')[0],
            timeSpentDays: Math.ceil(Math.abs(new Date(currentDate.toISOString().split('T')[0] + 'T23:59:59').getTime() - new Date(newPhaseData.currentEntry!.startDate + 'T00:00:00').getTime()) / (1000 * 60 * 60 * 24))
          }

          currentPhaseData[newStatusValue] = {
            ...newPhaseData,
            entries: [...(newPhaseData.entries || []), completedEntry],
            currentEntry: {
              startDate: currentDate.toISOString().split('T')[0],
              timeSpentDays: 0
            },
            totalTimeSpentDays: Math.max(
              calculatePhaseDays(newPhaseData, false) + completedEntry.timeSpentDays,
              (newPhaseData.totalTimeSpentDays || 0)
            )
          }
        } else {
          // First time entering this phase
          const newEntry: PhaseEntry = {
            startDate: currentDate.toISOString().split('T')[0],
            timeSpentDays: 0
          }

          currentPhaseData[newStatusValue] = {
            ...newPhaseData,
            currentEntry: newEntry,
            totalTimeSpentDays: Math.max(calculatePhaseDays(newPhaseData, false), newPhaseData.totalTimeSpentDays || 0)
          }
        }
      }

      const updatedSagach = {
        ...selectedSagach,
        processStatus: newStatusValue as 1 | 2 | 3 | 4 | 5 | 6 | 7,
        statusUpdates: [...(selectedSagach.statusUpdates || []), statusUpdate],
        lastUpdated: formatDateWithSlashes(currentDate),
        phaseData: currentPhaseData,
        // Set completion date if status is changed to "מובצע" (7)
        completionDate: newStatusValue === 7 ? currentDate.toISOString() : selectedSagach.completionDate
      }
      
      console.log('🔄 Changing status of sagach:', selectedSagach.name, 'to status', newStatusValue)
      updateSagachimStatus(selectedSagach.id, updatedSagach)
      
      setSelectedSagach(updatedSagach)
      setEditingStatus(false)
      
      // Show success indicator
      showPopupIndicator(
        `סטטוס עודכן בהצלחה ל-"${newStatusValue === 7 ? 'מובצע' : PROCESS_STEPS[newStatusValue - 1]}"`,
        'success'
      )
    } catch (error) {
      console.error('Error updating status:', error)
      showPopupIndicator('שגיאה בעדכון הסטטוס', 'warning')
    } finally {
      setIsStatusChangeLoading(false)
    }
  }


  // Handle date editing functions
  const handleEditDateClick = () => {
    if (!selectedSagach) return
    
    // Check permission for editing estimated completion date
    if (!canEditStatus()) {
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'אין לך הרשאה לערוך תג"ב למעבר לשלב הבא', 
          type: 'error', 
          durationMs: 3000 
        } 
      }))
      return
    }
    
    const currentDate = selectedSagach.estimatedCompletion || ''
    setEditDateValue(currentDate)
    setIsEditingDate(true)
  }

  const handleSaveDate = () => {
    if (!selectedSagach || !editDateValue.trim()) return
    
    const updatedSagach = {
      ...selectedSagach,
      estimatedCompletion: editDateValue
    }
    
    updateSagachimStatus(selectedSagach.id, updatedSagach)
    
    setSelectedSagach(updatedSagach)
    setIsEditingDate(false)
    
    showPopupIndicator('תאריך התג"ב עודכן בהצלחה', 'success')
  }

  const handleCancelDateEdit = () => {
    setIsEditingDate(false)
    setEditDateValue('')
  }

  // Filter removal functions
  const removeProviderFilter = () => {
    setSelectedProvider('')
  }

  const removeArenaFilter = () => {
    setSelectedArena('')
  }

  const removeProcessStatusFilter = () => {
    setSelectedProcessStatus('')
  }

  const removeSearchFilter = () => {
    setSearchQuery('')
  }

  // Handle new sagach creation
  const handleCreateSagach = async () => {
    // Check permission for creating sagachs
    if (!canCreateSagach()) {
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'אין לך הרשאה ליצור סג"חים חדשים', 
          type: 'error', 
          durationMs: 3000 
        } 
      }))
      return
    }

    // Validation
    if (!newSagachForm.name.trim() || !newSagachForm.description.trim() || 
        !newSagachForm.provider.trim() || !newSagachForm.arena.trim() || !newSagachForm.priority) {
      alert('יש למלא את כל השדות הדרושים')
      return
    }

    setIsCreateSagachLoading(true)

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 800))

      // Generate new sagach ID
      const newId = 'sagach' + (sagachimStatus.length + 1);
      
      // Create new sagach with form values
      const newSagach: Omit<SagachimStatusItem, 'createdBy' | 'createdAt' | 'lastModifiedBy' | 'lastModifiedAt'> = {
        id: newId,
        name: newSagachForm.name.trim(),
        description: newSagachForm.description.trim(),
        provider: newSagachForm.provider.trim(),
        lastUpdated: formatDateWithSlashes(getCurrentDate()),
        arena: newSagachForm.arena.trim(),
        priority: newSagachForm.priority,
        processStatus: 1,
        processStartDate: getCurrentDate().toISOString().split('T')[0],
        estimatedCompletion: '-', // Default value
        contactPerson: '',
        notes: '',
        notifications: false,
        statusUpdates: [{
          id: Date.now().toString(),
          message: `נוצר סג"ח חדש: "${newSagachForm.name.trim()}" • ספק: ${newSagachForm.provider.trim()} • זירה: ${newSagachForm.arena.trim()}`,
          timestamp: formatDate(getCurrentDate().toISOString()),
          type: 'system' as const,
          processStatus: 1,
          author: user?.name || 'משתמש'
        }],
        phaseData: {
          1: {
            currentEntry: { startDate: getCurrentDate().toISOString().split('T')[0], timeSpentDays: 0 },
            totalTimeSpentDays: 0
          },
          2: {}, 3: {}, 4: {}, 5: {}, 6: {}, 7: {}
        }
      };
      
      // Add to sagachim array
      console.log('🆕 Creating new sagach:', newSagach.name)
      addSagachimStatus(newSagach);
      
      // Reset form and close popup
      setNewSagachForm({ name: '', description: '', provider: '', arena: '', priority: 'בינוני' as PriorityOption })
      setIsNewSagachPopupOpen(false)
      
      // Open the new sagach for editing
      setSelectedSagach(newSagach);
      
      // Show success indicator
      showPopupIndicator('סג"ח חדש נוצר בהצלחה', 'success')
    } catch (error) {
      console.error('Error creating sagach:', error)
      showPopupIndicator('שגיאה ביצירת הסג"ח', 'warning')
    } finally {
      setIsCreateSagachLoading(false)
    }
  }

  // Date formatting function
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'לא צוין'
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) return dateString // Return original if invalid
      
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const seconds = date.getSeconds().toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear()
      
      return `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
    } catch {
      return dateString // Return original if error
    }
  }

  const handleNotificationToggle = () => {
    if (!selectedSagach || !user) return

    const userId = user.id || 'current_user'
    const userName = user.name || 'משתמש'
    const isCurrentlySubscribed = isUserSubscribed(selectedSagach, userId)
    
    let updatedSagach: SagachimStatusItem
    
    if (isCurrentlySubscribed) {
      // Remove user from subscribers
      updatedSagach = removeNotificationSubscriber(selectedSagach, userId)
    } else {
      // Add user to subscribers with default settings
      updatedSagach = addNotificationSubscriber(
        selectedSagach, 
        userId, 
        userName, 
        'email', // Default method
        'status_change' // Default frequency
      )
    }

    updateSagachimStatus(selectedSagach.id, updatedSagach)
    
    setSelectedSagach(updatedSagach)
    showPopupIndicator(
      !isCurrentlySubscribed 
        ? 'התראות הופעלו בהצלחה' 
        : 'התראות בוטלו בהצלחה', 
      'success'
    )
  }

  return (
    <>
      {/* Debug Panel */}
      <div
        style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1000,
          background: 'rgba(0,0,0,0.8)',
          borderRadius: '12px',
          padding: isDebugPanelOpen ? '16px' : '8px',
          border: '1px solid rgba(255,255,255,0.2)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onClick={() => setIsDebugPanelOpen(!isDebugPanelOpen)}
        title="לחץ לפתיחת פאנל בדיקת תאריכים"
      >
        
        {isDebugPanelOpen && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minWidth: '200px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: 'var(--text)',
              fontSize: '11px',
              fontWeight: '600'
            }}>
              <span>בדיקת תאריכים</span>
              <button
                onClick={() => setIsDebugPanelOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '0',
                  width: '16px',
                  height: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="סגור פאנל"
              >
                ×
              </button>
            </div>

            <input
              type="date"
              value={mockDate?.toISOString().split('T')[0] || ''}
              onChange={(e) => {
                if (e.target.value) {
                  setMockDate(new Date(e.target.value + 'T12:00:00'))
                } else {
                  setMockDate(null)
                }
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: '6px',
                padding: '6px 8px',
                color: 'var(--text)',
                fontSize: '12px',
                fontFamily: 'Segoe UI, sans-serif'
              }}
            />

            <div style={{
              fontSize: '10px',
              color: 'var(--muted)',
              textAlign: 'center'
            }}>
              {mockDate
                ? `תאריך מדומה: ${formatDateWithSlashes(mockDate)}`
                : `תאריך אמיתי: ${formatDateWithSlashes(new Date())}`
              }
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation()
                setMockDate(null)
              }}
              disabled={!mockDate}
              style={{
                background: mockDate
                  ? 'linear-gradient(135deg, rgba(244,67,54,0.8), rgba(244,67,54,0.6))'
                  : 'rgba(255,255,255,0.1)',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                color: mockDate ? 'white' : 'var(--muted)',
                fontSize: '10px',
                fontWeight: '600',
                cursor: mockDate ? 'pointer' : 'not-allowed'
              }}
            >
              איפוס לתאריך אמיתי
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                clearAllData()
                window.location.reload()
              }}
              style={{
                background: 'linear-gradient(135deg, rgba(255,152,0,0.8), rgba(255,152,0,0.6))',
                border: 'none',
                borderRadius: '6px',
                padding: '4px 8px',
                color: 'white',
                fontSize: '10px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              איפוס נתונים
            </button>
          </div>
        )}
      </div>

      {/* CSS Animations */}
      <style>
        {`
          @keyframes pulse-glow {
            0%, 100% {
              box-shadow: 0 0 12px rgba(124,192,255,0.6), 0 0 20px rgba(167,90,255,0.4);
              transform: scale(1);
            }
            50% {
              box-shadow: 0 0 20px rgba(124,192,255,0.8), 0 0 32px rgba(167,90,255,0.6), 0 0 44px rgba(124,192,255,0.4);
              transform: scale(1.05);
            }
          }
          
          /* Custom scrollbar styling for left-side positioning */
          .sagachim-grid-scroll::-webkit-scrollbar {
            width: 8px;
          }
          
          .sagachim-grid-scroll::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }
          
          .sagachim-grid-scroll::-webkit-scrollbar-thumb {
            background: rgba(124, 192, 255, 0.6);
            border-radius: 4px;
            transition: background 0.3s ease;
          }
          
          .sagachim-grid-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(124, 192, 255, 0.8);
          }
          
          /* For Firefox */
          .sagachim-grid-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(124, 192, 255, 0.6) rgba(255, 255, 255, 0.1);
          }
        `}
      </style>
      
      {/* Fixed Background */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'radial-gradient(1200px 800px at 80% 20%, rgba(124,192,255,0.15), transparent 50%), radial-gradient(1000px 700px at 10% 90%, rgba(167, 90, 255, 0.12), transparent 50%), var(--bg)',
        zIndex: -1
      }} />
      
      {/* Content */}
      <div className="sagachim-status" style={{
        minHeight: '100vh',
        color: 'var(--text)',
        fontFamily: '"Segoe UI", system-ui, sans-serif',
        width: '100%',
        boxSizing: 'border-box',
        padding: '20px',
        position: 'relative'
      }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        maxWidth: '1400px',
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '40px',
          width: '100%'
        }}>
          {/* Title Section */}
          <div style={{
            textAlign: 'center',
            flex: 1
          }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: 'var(--accent)',
              margin: '0 0 16px 0',
              letterSpacing: '0.5px',
              direction: 'rtl'
            }}>
              סטטוס סג"חים
            </h1>
            <p style={{
              fontSize: '16px',
              color: 'var(--muted)',
              margin: 0,
              direction: 'rtl'
            }}>
              מעקב אחר מצב הסג"חים בתהליך הכניסה
            </p>
          </div>

          {/* Create Button */}
          {canCreateSagach() && (
            <button
              onClick={() => setIsNewSagachPopupOpen(true)}
              style={{
                ...buttonStyles.primary,
                background: 'linear-gradient(135deg, rgba(76,175,80,0.8), rgba(76,175,80,0.6))',
                color: 'white',
                marginLeft: '20px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(76,175,80,0.4)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              + צור סג"ח חדש
            </button>
          )}
        </div>

        {/* Search and Filters */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          marginBottom: '32px',
          alignItems: 'center',
          width: '100%'
        }}>
          {/* Filter Controls Row */}
          <div style={{
            display: 'flex',
            gap: '16px',
            justifyContent: 'center',
            flexWrap: 'wrap',
            alignItems: 'center',
            width: '100%'
          }}>
        {/* Search Bar */}
        <div style={{ position: 'relative', minWidth: '280px', maxWidth: '400px', flex: '1 1 300px' }}>
          <input
            type="text"
            placeholder="חיפוש לפי שם או תיאור..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px 12px 40px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              color: 'var(--text)',
              fontSize: '14px',
              direction: 'rtl',
              outline: 'none',
              fontFamily: 'Segoe UI, sans-serif',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = 'rgba(124,192,255,0.6)'
              e.target.style.boxShadow = '0 0 20px rgba(124,192,255,0.3)'
            }}
            onBlur={(e) => {
              e.target.style.borderColor = 'rgba(255,255,255,0.2)'
              e.target.style.boxShadow = 'none'
            }}
          />
          <div style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--muted)',
            fontSize: '16px'
          }}>
            🔍
          </div>
        </div>

        {/* Provider Filter */}
        <div style={{ position: 'relative', minWidth: '160px', maxWidth: '220px', flex: '0 1 180px' }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsProviderDropdownOpen(!isProviderDropdownOpen)}
            style={buttonStyles.filter}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0px)'
            }}
          >
            <span>{selectedProvider || 'כל הספקים'}</span>
            <span style={{ marginLeft: '8px' }}>▼</span>
          </button>
          {isProviderDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--panel)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              marginTop: '4px',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(8px)'
            }}>
              <div
                onClick={() => {
                  setSelectedProvider('')
                  setIsProviderDropdownOpen(false)
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  transition: 'background 0.2s ease',
                  fontSize: '14px',
                  color: '#ffffff',
                  textAlign: 'center',
                  direction: 'rtl'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLDivElement).style.background = 'transparent'
                }}
              >
                כל הספקים
              </div>
          {providers.map(provider => (
                <div
                  key={provider}
                  onClick={() => {
                    setSelectedProvider(provider)
                    setIsProviderDropdownOpen(false)
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    transition: 'background 0.2s ease',
                    fontSize: '14px',
                    color: '#ffffff',
                    textAlign: 'center',
                    direction: 'rtl'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLDivElement).style.background = 'transparent'
                  }}
                >
                  {provider}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Arena Filter */}
        <div style={{ position: 'relative', minWidth: '160px', maxWidth: '220px', flex: '0 1 180px' }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsArenaDropdownOpen(!isArenaDropdownOpen)}
            style={buttonStyles.filter}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0px)'
            }}
            onFocus={(e) => {
              const target = e.target as HTMLButtonElement
              target.style.boxShadow = 'none'
              target.style.outline = 'none'
            }}
            onBlur={(e) => {
              const target = e.target as HTMLButtonElement
              target.style.boxShadow = 'none'
            }}
          >
            <span>{selectedArena || 'כל הזירות'}</span>
            <span style={{ marginLeft: '8px' }}>▼</span>
          </button>
          {isArenaDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--panel)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              marginTop: '4px',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(8px)'
            }}>
              <div
                onClick={() => {
                  setSelectedArena('')
                  setIsArenaDropdownOpen(false)
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  transition: 'background 0.2s ease',
                  fontSize: '14px',
                  color: '#ffffff',
                  textAlign: 'center',
                  direction: 'rtl'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLDivElement).style.background = 'transparent'
                }}
              >
                כל הזירות
              </div>
          {arenas.map(arena => (
                <div
                  key={arena}
                  onClick={() => {
                    setSelectedArena(arena)
                    setIsArenaDropdownOpen(false)
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    transition: 'background 0.2s ease',
                    fontSize: '14px',
                    color: '#ffffff',
                    textAlign: 'center',
                    direction: 'rtl'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLDivElement).style.background = 'transparent'
                  }}
                >
                  {arena}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Process Status Filter */}
        <div style={{ position: 'relative', minWidth: '180px', maxWidth: '240px', flex: '0 1 200px' }} onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setIsProcessStatusDropdownOpen(!isProcessStatusDropdownOpen)}
            style={buttonStyles.filter}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'translateY(0px)'
            }}
          >
            <span>
              {selectedProcessStatus 
                ? (parseInt(selectedProcessStatus) === 7 
                    ? 'מובצע'
                    : PROCESS_STEPS[parseInt(selectedProcessStatus) - 1]
                  )
                : 'כל שלבי התהליך'}
            </span>
            <span style={{ marginLeft: '8px' }}>▼</span>
          </button>
          {isProcessStatusDropdownOpen && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              background: 'var(--panel)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '12px',
              marginTop: '4px',
              zIndex: 1000,
              maxHeight: '200px',
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(8px)'
            }}>
              <div
                onClick={() => {
                  setSelectedProcessStatus('')
                  setIsProcessStatusDropdownOpen(false)
                }}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  transition: 'background 0.2s ease',
                  fontSize: '14px',
                  color: '#ffffff',
                  textAlign: 'center',
                  direction: 'rtl'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLDivElement).style.background = 'transparent'
                }}
              >
                כל שלבי התהליך
              </div>
              {PROCESS_STEPS_WITH_COMPLETED.map((step, index) => (
                <div
                  key={index + 1}
                  onClick={() => {
                    setSelectedProcessStatus((index + 1).toString())
                    setIsProcessStatusDropdownOpen(false)
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    transition: 'background 0.2s ease',
                    fontSize: '14px',
                    color: '#ffffff',
                    textAlign: 'center',
                    direction: 'rtl'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLDivElement).style.background = 'transparent'
                  }}
                >
                  {index + 1 === 7 ? 'מובצע' : step}
                </div>
              ))}
            </div>
          )}
          </div>

          {/* Sort Dropdown */}
          <div style={{ position: 'relative', minWidth: '160px', maxWidth: '220px', flex: '0 1 180px' }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
              style={buttonStyles.filter}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(0px)'
              }}
              onFocus={(e) => {
                const target = e.target as HTMLButtonElement
                target.style.boxShadow = 'none'
                target.style.outline = 'none'
              }}
              onBlur={(e) => {
                const target = e.target as HTMLButtonElement
                target.style.boxShadow = 'none'
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>☰</span>
                <span>
                  {sortOrder === 'asc' ? 'מההתחלה לסוף' : 
                   sortOrder === 'desc' ? 'מהסוף להתחלה' : 
                   'סדר לפי'}
                </span>
              </span>
              <span style={{ marginLeft: '8px' }}>▼</span>
            </button>
            {isSortDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: 'var(--panel)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                marginTop: '4px',
                zIndex: 1000,
                maxHeight: '200px',
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(8px)'
              }}>
                <div
                  onClick={() => {
                    setSortOrder('none')
                    setIsSortDropdownOpen(false)
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    transition: 'background 0.2s ease',
                    fontSize: '14px',
                    color: sortOrder === 'none' ? 'var(--accent)' : '#ffffff',
                    textAlign: 'center',
                    direction: 'rtl',
                    background: sortOrder === 'none' ? 'rgba(124,192,255,0.1)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (sortOrder !== 'none') {
                      (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sortOrder !== 'none') {
                      (e.target as HTMLDivElement).style.background = 'transparent'
                    } else {
                      (e.target as HTMLDivElement).style.background = 'rgba(124,192,255,0.1)'
                    }
                  }}
                >
                  {sortOrder === 'none' && <span style={{ fontSize: '12px' }}>✓</span>}
                  <span>ללא מיון</span>
                </div>
                <div
                  onClick={() => {
                    setSortOrder('asc')
                    setIsSortDropdownOpen(false)
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    transition: 'background 0.2s ease',
                    fontSize: '14px',
                    color: sortOrder === 'asc' ? 'var(--accent)' : '#ffffff',
                    textAlign: 'center',
                    direction: 'rtl',
                    background: sortOrder === 'asc' ? 'rgba(124,192,255,0.1)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (sortOrder !== 'asc') {
                      (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sortOrder !== 'asc') {
                      (e.target as HTMLDivElement).style.background = 'transparent'
                    } else {
                      (e.target as HTMLDivElement).style.background = 'rgba(124,192,255,0.1)'
                    }
                  }}
                >
                  <span style={{ fontSize: '12px', opacity: 0.7 }}></span>
                  {sortOrder === 'asc' && <span style={{ fontSize: '12px' }}>✓</span>}
                  <span> מההתחלה לסוף</span>
                </div>
                <div
                  onClick={() => {
                    setSortOrder('desc')
                    setIsSortDropdownOpen(false)
                  }}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    transition: 'background 0.2s ease',
                    fontSize: '14px',
                    color: sortOrder === 'desc' ? 'var(--accent)' : '#ffffff',
                    textAlign: 'center',
                    direction: 'rtl',
                    background: sortOrder === 'desc' ? 'rgba(124,192,255,0.1)' : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (sortOrder !== 'desc') {
                      (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (sortOrder !== 'desc') {
                      (e.target as HTMLDivElement).style.background = 'transparent'
                    } else {
                      (e.target as HTMLDivElement).style.background = 'rgba(124,192,255,0.1)'
                    }
                  }}
                >
                  <span style={{ fontSize: '12px', opacity: 0.7 }}></span>
                  {sortOrder === 'desc' && <span style={{ fontSize: '12px' }}>✓</span>}
                  <span>מהסוף להתחלה</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {(selectedProvider || selectedArena || selectedProcessStatus || searchQuery) && (
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            
            {searchQuery && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(124,192,255,0.2)',
                border: '1px solid rgba(124,192,255,0.4)',
                borderRadius: '20px',
                padding: '6px 12px',
                gap: '8px',
                direction: 'rtl'
              }}>
                <span style={{
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  חיפוש: "{searchQuery}"
                </span>
                <button
                  onClick={removeSearchFilter}
                  style={buttonStyles.close}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                    e.currentTarget.style.color = 'var(--text)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = 'var(--muted)'
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {selectedProvider && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(124,192,255,0.2)',
                border: '1px solid rgba(124,192,255,0.4)',
                borderRadius: '20px',
                padding: '6px 12px',
                gap: '8px',
                direction: 'rtl'
              }}>
                <span style={{
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  ספק: {selectedProvider}
                </span>
                <button
                  onClick={removeProviderFilter}
                  style={buttonStyles.close}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                    e.currentTarget.style.color = 'var(--text)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = 'var(--muted)'
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {selectedArena && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(124,192,255,0.2)',
                border: '1px solid rgba(124,192,255,0.4)',
                borderRadius: '20px',
                padding: '6px 12px',
                gap: '8px',
                direction: 'rtl'
              }}>
                <span style={{
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  זירה: {selectedArena}
                </span>
                <button
                  onClick={removeArenaFilter}
                  style={buttonStyles.close}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                    e.currentTarget.style.color = 'var(--text)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = 'var(--muted)'
                  }}
                >
                  ×
                </button>
              </div>
            )}

            {selectedProcessStatus && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(124,192,255,0.2)',
                border: '1px solid rgba(124,192,255,0.4)',
                borderRadius: '20px',
                padding: '6px 12px',
                gap: '8px',
                direction: 'rtl'
              }}>
                <span style={{
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontWeight: '500'
                }}>
                  שלב: {parseInt(selectedProcessStatus) === 7 
                    ? 'מובצע' 
                    : PROCESS_STEPS[parseInt(selectedProcessStatus) - 1]
                  }
                </span>
                <button
                  onClick={removeProcessStatusFilter}
                  style={buttonStyles.close}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                    e.currentTarget.style.color = 'var(--text)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none'
                    e.currentTarget.style.color = 'var(--muted)'
                  }}
                >
                  ×
                </button>
              </div>
            )}

          </div>
        )}

        {/* Results Count */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: '24px',
          width: '100%',
          maxWidth: '1200px'
        }}>
        <span style={{
          color: 'var(--muted)',
          fontSize: '14px',
          direction: 'rtl'
        }}>
        </span>
        </div>

        {/* Sagachim Cubes Grid */}
        <div className="sagachim-grid-scroll" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '32px',
          width: '100%',
          padding: '0 20px 0 20px',
          maxHeight: 'calc(100vh - 400px)',
          overflowY: 'auto',
          overflowX: 'hidden',
          direction: 'rtl'
        }}>
        {/* Check if any filters are active */}
        {(() => {
          const hasActiveFilters = selectedProvider || selectedArena || selectedProcessStatus || searchQuery || sortOrder !== 'none'
          
          if (hasActiveFilters) {
            // Show phase-organized view when filters are active
            // Determine phase order based on sort order
            const phaseOrder = sortOrder === 'desc' ? [7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7]
            return phaseOrder.map(phase => {
              const phaseSagachim = filteredSagachim.filter(sagach => sagach.processStatus === phase)
              if (phaseSagachim.length === 0) return null

              return (
                <div key={phase} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  {/* Phase Header */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    marginBottom: '8px',
                    padding: '0 8px'
                  }}>
                    <div style={{
                      background: getProcessStatusColor(phase),
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '600',
                      letterSpacing: '0.5px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {phase === 7 && '✅'}
                      {phase === 7 ? 'מובצע' : PROCESS_STEPS[phase - 1]}
                    </div>
                    <span style={{
                      color: 'var(--muted)',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}>
                      
                    </span>
                  </div>

                  {/* Phase Cards Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                    gap: '24px',
                    justifyItems: 'center'
                  }}>
                    {phaseSagachim.map(sagach => (
          <div
            key={sagach.id}
            onClick={() => handleSagachClick(sagach)}
            style={{
              background: sagach.processStatus === 7 
                ? 'linear-gradient(180deg, rgba(76,175,80,0.15), rgba(46,125,50,0.10))'
                : 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))',
              border: sagach.processStatus === 7
                ? '1px solid rgba(76,175,80,0.3)'
                : '1px solid rgba(255,255,255,0.12)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: sagach.processStatus === 7
                ? '0 8px 32px rgba(76,175,80,0.2), inset 0 1px 0 rgba(76,175,80,0.1)'
                : '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              width: '100%',
              maxWidth: '320px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = sagach.processStatus === 7
                ? '0 12px 40px rgba(76,175,80,0.3), inset 0 1px 0 rgba(76,175,80,0.15)'
                : '0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = sagach.processStatus === 7
                ? '0 8px 32px rgba(76,175,80,0.2), inset 0 1px 0 rgba(76,175,80,0.1)'
                : '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
            }}
          >
            {/* Process Status Badge */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: getProcessStatusColor(sagach.processStatus),
              color: 'white',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '0.5px',
              direction: 'rtl',
              textAlign: 'center',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              {sagach.processStatus === 7 && '✅'}
              {sagach.processStatus === 7 
                ? 'מובצע'
                : PROCESS_STEPS[sagach.processStatus - 1]
              }
            </div>



            {/* Content */}
            <div style={{ marginTop: '40px', direction: 'rtl' }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: 'var(--text)',
                margin: '0 0 12px 0',
                lineHeight: '1.3'
              }}>
                {sagach.name}
              </h3>

              <p style={{
                fontSize: '14px',
                color: 'var(--muted)',
                margin: '0 0 16px 0',
                lineHeight: '1.5',
                minHeight: '42px'
              }}>
                {sagach.description}
              </p>


              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                marginTop: '16px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    fontWeight: '600'
                  }}>
                    ספק:
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--text)'
                  }}>
                    {sagach.provider}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    fontWeight: '600'
                  }}>
                   זירה:
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: 'var(--text)'
                  }}>
                    {sagach.arena}
                  </span>
                </div>
              </div>
            </div>

            {/* Hover Effect Overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: sagach.processStatus === 7
                ? 'linear-gradient(135deg, rgba(76,175,80,0.15), rgba(46,125,50,0.1))'
                : 'linear-gradient(135deg, rgba(124,192,255,0.1), rgba(167,90,255,0.1))',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              pointerEvents: 'none'
            }} />
          </div>
                    ))}
                  </div>
                  
                  {/* Separator Line */}
                  <div style={{
                    width: '100%',
                    height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                    margin: '24px 0 8px 0'
                  }} />
                </div>
              )
            })
            
            // Add bottom spacer to ensure last cards are visible above taskbar
            return (
              <>
                {phaseOrder.map(phase => {
                  const phaseSagachim = filteredSagachim.filter(sagach => sagach.processStatus === phase)
                  if (phaseSagachim.length === 0) return null

                  return (
                    <div key={phase} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '16px'
                    }}>
                      {/* Phase Header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px',
                        padding: '0 8px'
                      }}>
                        <div style={{
                          background: getProcessStatusColor(phase),
                          color: 'white',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontSize: '14px',
                          fontWeight: '600',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {phase === 7 && '✅'}
                          {phase === 7 ? 'מובצע' : PROCESS_STEPS[phase - 1]}
                        </div>
                        <span style={{
                          color: 'var(--muted)',
                          fontSize: '12px',
                          fontWeight: '500'
                        }}>
                          ({phaseSagachim.length} סג"חים)
                        </span>
                      </div>

                      {/* Phase Cards Grid */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '24px',
                        justifyItems: 'center'
                      }}>
                        {phaseSagachim.map(sagach => (
                          <div
                            key={sagach.id}
                            onClick={() => handleSagachClick(sagach)}
                            style={{
                              background: sagach.processStatus === 7 
                                ? 'linear-gradient(180deg, rgba(76,175,80,0.15), rgba(46,125,50,0.10))'
                                : 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))',
                              border: sagach.processStatus === 7
                                ? '1px solid rgba(76,175,80,0.3)'
                                : '1px solid rgba(255,255,255,0.12)',
                              borderRadius: '16px',
                              padding: '24px',
                              boxShadow: sagach.processStatus === 7
                                ? '0 8px 32px rgba(76,175,80,0.2), inset 0 1px 0 rgba(76,175,80,0.1)'
                                : '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                              backdropFilter: 'blur(8px)',
                              transition: 'all 0.3s ease',
                              cursor: 'pointer',
                              position: 'relative',
                              overflow: 'hidden',
                              width: '100%',
                              maxWidth: '320px'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-4px)'
                              e.currentTarget.style.boxShadow = sagach.processStatus === 7
                                ? '0 12px 40px rgba(76,175,80,0.3), inset 0 1px 0 rgba(76,175,80,0.15)'
                                : '0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0px)'
                              e.currentTarget.style.boxShadow = sagach.processStatus === 7
                                ? '0 8px 32px rgba(76,175,80,0.2), inset 0 1px 0 rgba(76,175,80,0.1)'
                                : '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                            }}
                          >
                            {/* Process Status Badge */}
                            <div style={{
                              position: 'absolute',
                              top: '16px',
                              left: '16px',
                              background: getProcessStatusColor(sagach.processStatus),
                              color: 'white',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: '600',
                              letterSpacing: '0.5px',
                              direction: 'rtl',
                              textAlign: 'center',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {sagach.processStatus === 7 && '✅'}
                              {sagach.processStatus === 7 
                                ? 'מובצע'
                                : PROCESS_STEPS[sagach.processStatus - 1]
                              }
                            </div>

                            {sagach.priority === 'TOP' && (
                              <div style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: 'linear-gradient(135deg, rgba(150, 16, 16, 0.9), rgba(174, 20, 20, 0.7))',
                                color: '#1f1f1f',
                                padding: '6px 12px',
                                borderRadius: '999px',
                                fontSize: '11px',
                                fontWeight: '700',
                                letterSpacing: '0.5px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                boxShadow: '0 6px 18px rgba(155, 22, 22, 0.35)'
                              }}>
                                 TOP
                              </div>
                            )}

                            {/* Content */}
                            <div style={{ marginTop: '40px', direction: 'rtl' }}>
                              <h3 style={{
                                fontSize: '24px',
                                fontWeight: '700',
                                color: 'var(--text)',
                                margin: '0 0 12px 0',
                                lineHeight: '1.3'
                              }}>
                                {sagach.name}
                              </h3>

                              <p style={{
                                fontSize: '14px',
                                color: 'var(--muted)',
                                margin: '0 0 16px 0',
                                lineHeight: '1.5',
                                minHeight: '42px'
                              }}>
                                {sagach.description}
                              </p>

                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '8px',
                                marginTop: '16px'
                              }}>
                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span style={{
                                    fontSize: '12px',
                                    color: 'var(--muted)',
                                    fontWeight: '600'
                                  }}>
                                    ספק:
                                  </span>
                                  <span style={{
                                    fontSize: '12px',
                                    color: 'var(--text)'
                                  }}>
                                    {sagach.provider}
                                  </span>
                                </div>

                                <div style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  <span style={{
                                    fontSize: '12px',
                                    color: 'var(--muted)',
                                    fontWeight: '600'
                                  }}>
                                    זירה:
                                  </span>
                                  <span style={{
                                    fontSize: '12px',
                                    color: 'var(--text)'
                                  }}>
                                    {sagach.arena}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Hover Effect Overlay */}
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              background: sagach.processStatus === 7
                                ? 'linear-gradient(135deg, rgba(76,175,80,0.15), rgba(46,125,50,0.1))'
                                : 'linear-gradient(135deg, rgba(124,192,255,0.1), rgba(167,90,255,0.1))',
                              opacity: 0,
                              transition: 'opacity 0.3s ease',
                              pointerEvents: 'none'
                            }} />
                          </div>
                        ))}
                      </div>
                      
                      {/* Separator Line */}
                      <div style={{
                        width: '100%',
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                        margin: '24px 0 8px 0'
                      }} />
                    </div>
                  )
                })}
                
                {/* Bottom Spacer to ensure last cards are visible above taskbar */}
                <div style={{
                  height: '150px',
                  width: '100%'
                }} />
              </>
            )
          } else {
            // Show normal grid view when no filters are active
            return (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '24px',
                justifyItems: 'center',
                width: '100%'
              }}>
                {filteredSagachim.map(sagach => (
                  <div
                    key={sagach.id}
                    onClick={() => handleSagachClick(sagach)}
                    style={{
                      background: sagach.processStatus === 7 
                        ? 'linear-gradient(180deg, rgba(76,175,80,0.15), rgba(46,125,50,0.10))'
                        : 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))',
                      border: sagach.processStatus === 7
                        ? '1px solid rgba(76,175,80,0.3)'
                        : '1px solid rgba(255,255,255,0.12)',
                      borderRadius: '16px',
                      padding: '24px',
                      boxShadow: sagach.processStatus === 7
                        ? '0 8px 32px rgba(76,175,80,0.2), inset 0 1px 0 rgba(76,175,80,0.1)'
                        : '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)',
                      backdropFilter: 'blur(8px)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                      width: '100%',
                      maxWidth: '320px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = sagach.processStatus === 7
                        ? '0 12px 40px rgba(76,175,80,0.3), inset 0 1px 0 rgba(76,175,80,0.15)'
                        : '0 12px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.15)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0px)'
                      e.currentTarget.style.boxShadow = sagach.processStatus === 7
                        ? '0 8px 32px rgba(76,175,80,0.2), inset 0 1px 0 rgba(76,175,80,0.1)'
                        : '0 8px 32px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1)'
                    }}
                  >
                    {/* Process Status Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '16px',
                      left: '16px',
                      background: getProcessStatusColor(sagach.processStatus),
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '600',
                      letterSpacing: '0.5px',
                      direction: 'rtl',
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {sagach.processStatus === 7 && '✅'}
                      {sagach.processStatus === 7 
                        ? 'מובצע'
                        : PROCESS_STEPS[sagach.processStatus - 1]
                      }
                    </div>

                    {sagach.priority === 'TOP' && (
                      <div style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'linear-gradient(135deg, rgba(146, 23, 23, 0.9), rgba(236, 35, 35, 0.7))',
                        color: '#FFFFFF',
                        padding: '6px 12px',
                        borderRadius: '999px',
                        fontSize: '11px',
                        fontWeight: '700',
                        letterSpacing: '0.5px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 6px 18px rgba(255, 0, 0, 0.35)'
                      }}>
                        TOP
                      </div>
                    )}

                    {/* Content */}
                    <div style={{ marginTop: '40px', direction: 'rtl' }}>
                      <h3 style={{
                        fontSize: '24px',
                        fontWeight: '700',
                        color: 'var(--text)',
                        margin: '0 0 12px 0',
                        lineHeight: '1.3'
                      }}>
                        {sagach.name}
                      </h3>

                      <p style={{
                        fontSize: '14px',
                        color: 'var(--muted)',
                        margin: '0 0 16px 0',
                        lineHeight: '1.5',
                        minHeight: '42px'
                      }}>
                        {sagach.description}
                      </p>

                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        marginTop: '16px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--muted)',
                            fontWeight: '600'
                          }}>
                            ספק:
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--text)'
                          }}>
                            {sagach.provider}
                          </span>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--muted)',
                            fontWeight: '600'
                          }}>
                            זירה:
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--text)'
                          }}>
                            {sagach.arena}
                          </span>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--muted)',
                            fontWeight: '600'
                          }}>
                            תעדוף:
                          </span>
                          <span style={{
                            fontSize: '12px',
                            
                            fontWeight: sagach.priority === 'TOP' ? 700 : 400
                          }}>
                            {PRIORITY_LABELS[sagach.priority]}
                          </span>
                        </div>

                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--muted)',
                            fontWeight: '600'
                          }}>
                            עודכן לאחרונה:
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: 'var(--text)'
                          }}>
                            {sagach.lastUpdated}
                          </span>
                        </div>

                      </div>
                    </div>

                    {/* Hover Effect Overlay */}
                    <div style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: sagach.processStatus === 7
                        ? 'linear-gradient(135deg, rgba(76,175,80,0.15), rgba(46,125,50,0.1))'
                        : 'linear-gradient(135deg, rgba(124,192,255,0.1), rgba(167,90,255,0.1))',
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                      pointerEvents: 'none'
                    }} />
                  </div>
                ))}
              </div>
            )
          }
        })()}
        </div>

        {/* Empty State */}
        {filteredSagachim.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%'
          }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px',
            opacity: 0.5
          }}>
            📋
          </div>
          <h3 style={{
            fontSize: '20px',
            color: 'var(--muted)',
            margin: '0 0 8px 0',
            direction: 'rtl'
          }}>
            לא נמצאו סג"חים
          </h3>
          <p style={{
            fontSize: '14px',
            color: 'var(--muted)',
            margin: 0,
            direction: 'rtl'
          }}>
            נסה לשנות את החיפוש או הסינון
          </p>
          </div>
        )}
      </div>
    </div>
    </div>

    {/* Sagach Details Popup Modal */}
    {selectedSagach && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000
      }} onClick={() => setSelectedSagach(null)}>
        <div style={{
          background: 'radial-gradient(1200px 800px at 50% 50%, rgba(124,192,255,0.15), transparent 50%), radial-gradient(1000px 700px at 50% 50%, rgba(167, 90, 255, 0.12), transparent 50%), var(--bg)',
          border: 'none',
          borderRadius: '0px',
          padding: '40px',
          width: '100vw',
          height: '100vh',
          overflow: 'auto',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
          direction: 'rtl',
          position: 'fixed',
          top: 0,
          left: 0,
          boxSizing: 'border-box'
        }} onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div style={{
            marginBottom: '32px',
            borderBottom: '1px solid rgba(255,255,255,0.2)',
            paddingBottom: '16px'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              {/* Left side - Delete Button for Admins */}
              <div style={{ width: '200px', display: 'flex', justifyContent: 'flex-start' }}>
                {canDeleteSagach() && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteSagach(selectedSagach.id, e)
                    }}
                    style={{
                      ...buttonStyles.primary,
                      background: 'rgba(137, 37, 30, 0.9)',
                      color: 'white',
                      fontSize: '16px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(244, 67, 54, 1)'
                      e.currentTarget.style.transform = 'scale(1.05)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(244, 67, 54, 0.9)'
                      e.currentTarget.style.transform = 'scale(1)'
                    }}
                    title='מחק סג"ח'
                  >
                    🗑️
                  </button>
                )}
              </div>

              {/* Center - Sagach Name */}
              <h2 style={{
                color: 'var(--accent)',
                fontSize: '40px',
                fontWeight: '700',
                margin: '0',
                textAlign: 'center',
                flex: 1
              }}>
                {selectedSagach.name}
              </h2>

              {/* Right side buttons */}
              <div style={{
                display: 'flex', 
                alignItems: 'center', 
                gap: '16px',
                width: '200px',
                justifyContent: 'flex-end'
              }}>
                {/* Notification Toggle */}
                <button
                  onClick={async () => {
                    const userId = user?.id || 'current_user'
                    const isSubscribed = isUserSubscribed(selectedSagach, userId)
                    
                    if (isSubscribed) {
                      setIsNotificationToggleLoading(true)
                      // Simulate API call delay
                      await new Promise(resolve => setTimeout(resolve, 500))
                      handleNotificationToggle()
                      setIsNotificationToggleLoading(false)
                    } else {
                      setIsNotificationSettingsOpen(true)
                    }
                  }}
                  disabled={isNotificationToggleLoading}
                  style={{
                    ...buttonStyles.primary,
                    background: isUserSubscribed(selectedSagach, user?.id || 'current_user')
                      ? 'linear-gradient(135deg, rgba(76,175,80,0.8), rgba(76,175,80,0.6))'
                      : 'rgba(255,255,255,0.1)',
                    border: '1px solid ' + (isUserSubscribed(selectedSagach, user?.id || 'current_user')
                      ? 'rgba(76,175,80,0.8)' 
                      : 'rgba(255,255,255,0.2)'),
                    borderRadius: '25px',
                    color: isUserSubscribed(selectedSagach, user?.id || 'current_user') ? 'white' : 'var(--text)',
                    fontSize: '16px',
                    cursor: isNotificationToggleLoading ? 'not-allowed' : 'pointer',
                    opacity: isNotificationToggleLoading ? 0.7 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!selectedSagach.notifications && !isNotificationToggleLoading) {
                      e.currentTarget.style.background = 'rgba(124,192,255,0.2)'
                      e.currentTarget.style.borderColor = 'rgba(124,192,255,0.5)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!selectedSagach.notifications && !isNotificationToggleLoading) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                      e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                    }
                  }}
                >
                  {isNotificationToggleLoading ? (
                    <div style={{
                      width: '18px',
                      height: '18px',
                      border: '2px solid transparent',
                      borderTop: '2px solid currentColor',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                  ) : (
                    isUserSubscribed(selectedSagach, user?.id || 'current_user') ? '🔔' : '🔕'
                  )}
                  {isNotificationToggleLoading 
                    ? 'מעדכן...' 
                    : (isUserSubscribed(selectedSagach, user?.id || 'current_user') 
                        ? 'מקבל התראות' 
                        : 'הירשם לעדכונים')
                  }
                </button>


                {/* Close Button */}
                <button 
                  onClick={() => setSelectedSagach(null)}
                  style={{
                    ...buttonStyles.close,
                    fontSize: '28px',
                    padding: '12px',
                    borderRadius: '12px',
                    width: 'auto',
                    height: 'auto'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  ←
                </button>
              </div>
            </div>
          </div>


           {/* Main Content - New Layout */}
           <div style={{ 
             display: 'grid', 
             gridTemplateColumns: 'minmax(300px, 35%) minmax(400px, 65%)', 
             gap: '24px',
             height: 'calc(100vh - 120px)', // Full height minus header
             minHeight: '600px',
             alignItems: 'stretch',
             overflow: 'hidden', // Prevent main container from scrolling
             maxWidth: '100%',
             boxSizing: 'border-box'
           }}>
            {/* Left Column - Details Section (Matching Right Column Height) */}
            <div style={{
              background: 'rgba(124,192,255,0.08)',
              border: '2px solid rgba(124,192,255,0.2)',
              borderRadius: '20px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              height: '100%', // Full height
              overflowY: 'auto'
            }}>
                <h4 style={{ 
                  color: 'white', 
                  fontSize: '24px', 
                  fontWeight: '600', 
                  margin: '0 0 12px 0',
                  textAlign: 'center',
                  paddingBottom: '8px',
                  borderBottom: '2px solid rgba(255,255,255,0.3)' 
                }}>
                פרטי הסג"ח
              </h4>

               {/* Sagach Details */}
               <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '16px' }}>
                {/* 1. תיאור */}
                <div>
                  <h4 style={{ 
                    color: 'rgba(124,192,255,0.9)', 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    margin: '0 0 8px 0' 
                  }}>
                    תיאור
                  </h4>
                  <p style={{ 
                    color: 'var(--text)', 
                    fontSize: '16px', 
                    margin: 0, 
                    lineHeight: '1.6' 
                  }}>
                    {selectedSagach.description}
                  </p>
                </div>

                {/* 2. ספק */}
                <div>
                  <h4 style={{ 
                    color: 'rgba(124,192,255,0.9)', 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    margin: '0 0 8px 0' 
                  }}>
                    ספק
                  </h4>
                  <p style={{ 
                    color: 'var(--text)', 
                    fontSize: '18px', 
                    margin: 0,
                    lineHeight: '1.8' 
                  }}>
                    {selectedSagach.provider}
                  </p>
                </div>

                {/* 3. זירה */}
                <div>
                  <h4 style={{ 
                    color: 'rgba(124,192,255,0.9)', 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    margin: '0 0 8px 0' 
                  }}>
                    זירה
                  </h4>
                  <p style={{ 
                    color: 'var(--text)', 
                    fontSize: '18px', 
                    margin: 0,
                    lineHeight: '1.8' 
                  }}>
                    {selectedSagach.arena}
                  </p>
                </div>

                {/* 3b. תעדוף */}
                <div>
                  <h4 style={{ 
                    color: 'rgba(124,192,255,0.9)', 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    margin: '0 0 8px 0' 
                  }}>
                    תעדוף
                  </h4>
                  {canEditStatus() ? (
                    <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => setIsPriorityDropdownOpen(prev => !prev)}
                        style={{
                          appearance: 'none',
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(255,255,255,0.06)',
                          borderRadius: '12px',
                          color: '#ffffff',
                          padding: '10px 16px',
                          cursor: 'pointer',
                          fontSize: '16px',
                          direction: 'rtl',
                          outline: 'none',
                          fontFamily: 'Segoe UI, sans-serif',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          width: '100%'
                        }}
                      >
                        <span>{PRIORITY_LABELS[selectedSagach.priority]}</span>
                        <span style={{ marginLeft: '8px', fontSize: '12px' }}>▼</span>
                      </button>

                      {isPriorityDropdownOpen && (
                        <div style={{
                          position: 'absolute',
                          top: 'calc(100% + 4px)',
                          right: 0,
                          left: 0,
                          background: 'var(--panel)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                          zIndex: 1000,
                          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                          backdropFilter: 'blur(8px)',
                          overflow: 'hidden'
                        }}>
                          {PRIORITY_OPTIONS.map(option => (
                            <div
                              key={`detail-priority-${option}`}
                              onClick={() => {
                                setIsPriorityDropdownOpen(false)
                                if (!selectedSagach || option === selectedSagach.priority) return
                                const updatedSagach = { ...selectedSagach, priority: option }
                                updateSagachimStatus(selectedSagach.id, { priority: option })
                                setSelectedSagach(updatedSagach)
                                showPopupIndicator('התעדוף עודכן בהצלחה', 'success')
                              }}
                              style={{
                                padding: '10px 16px',
                                cursor: 'pointer',
                                transition: 'background 0.2s ease',
                                direction: 'rtl',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                background: selectedSagach.priority === option ? 'rgba(124,192,255,0.15)' : 'transparent',
                                fontWeight: option === 'TOP' ? 700 : 500
                              }}
                              onMouseEnter={(e) => {
                                (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,192,255,0.15)'
                              }}
                              onMouseLeave={(e) => {
                                if (selectedSagach.priority !== option) {
                                  (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                                }
                              }}
                            >
                              <span>{option === 'TOP' ? 'TOP' : option}</span>
                              {option === selectedSagach.priority && <span>✓</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ 
                      color: selectedSagach.priority === 'TOP' ? '#ffd700' : 'var(--text)', 
                      fontSize: '18px', 
                      margin: 0,
                      lineHeight: '1.8',
                      fontWeight: selectedSagach.priority === 'TOP' ? '700' : '500'
                    }}>
                      {PRIORITY_LABELS[selectedSagach.priority]}
                    </p>
                  )}
                </div>

                {/* 4. סטטוס נוכחי (העתקת ההודעה האחרונה מהצ'אט) */}
                <div>
                  <h4 style={{ 
                    color: 'rgba(124,192,255,0.9)', 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    margin: '0 0 8px 0' 
                  }}>
                    סטטוס נוכחי
                  </h4>
                  <div 
                    key={selectedSagach.statusUpdates?.length || 0} // Force re-render when statusUpdates change
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '20px',
                      fontSize: '18px',
                      color: 'var(--text)',
                      lineHeight: '1.8',
                      direction: 'rtl'
                    }}>
                    {(() => {
                      // Check if statusUpdates exists and has content
                      if (!selectedSagach?.statusUpdates || selectedSagach.statusUpdates.length === 0) {
                        return <span style={{ fontStyle: 'italic', color: 'var(--muted)' }}>אין עדכוני סטטוס</span>;
                      }

                      // Create a copy and sort by timestamp (newest first)
                      const sortedUpdates = [...selectedSagach.statusUpdates].sort((a, b) => {
                        // Parse timestamps - they might be in different formats
                        const parseTimestamp = (timestamp: string) => {
                          // Try different parsing approaches
                          if (timestamp.includes('/')) {
                            // dd/MM/YYYY HH:mm:ss format
                            const [datePart, timePart] = timestamp.split(' ');
                            const [day, month, year] = datePart.split('/');
                            return new Date(`${year}-${month}-${day} ${timePart}`);
                          } else {
                            // YYYY-MM-DD HH:mm:ss format or other
                            return new Date(timestamp);
                          }
                        };
                        
                        const dateA = parseTimestamp(a.timestamp);
                        const dateB = parseTimestamp(b.timestamp);
                        
                        // Handle invalid dates - if both are invalid, sort by ID (newer messages have higher IDs)
                        if (isNaN(dateA.getTime()) && isNaN(dateB.getTime())) {
                          return parseInt(b.id) - parseInt(a.id);
                        }
                        if (isNaN(dateA.getTime())) return 1;
                        if (isNaN(dateB.getTime())) return -1;
                        
                        // Primary sort by timestamp (newest first)
                        const timeDiff = dateB.getTime() - dateA.getTime();
                        if (timeDiff !== 0) {
                          return timeDiff;
                        }
                        
                        // Secondary sort by ID if timestamps are identical (newer messages have higher IDs)
                        return parseInt(b.id) - parseInt(a.id);
                      });
                      
                      const latestUpdate = sortedUpdates[0];
                      
                      if (!latestUpdate?.message) {
                        return <span style={{ fontStyle: 'italic', color: 'var(--muted)' }}>אין עדכוני סטטוס</span>;
                      }

                      return (
                        <div>
                          <div style={{ 
                            fontSize: '16px', 
                            color: 'var(--muted)', 
                            marginBottom: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            {latestUpdate.type === 'status_change' && '🔄'}
                            {latestUpdate.type === 'system' && '⚙️'}
                            {latestUpdate.type === 'user' && '👤'}
                            <span>{formatDate(latestUpdate.timestamp)}</span>
                          </div>
                          <div>{latestUpdate.message}</div>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* 5. תאריך התחלה */}
                <div>
                  <h4 style={{ 
                    color: 'rgba(124,192,255,0.9)', 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    margin: '0 0 8px 0' 
                  }}>
                    תאריך התחלה
                  </h4>
                  <p style={{ 
                    color: 'var(--text)', 
                    fontSize: '18px', 
                    margin: 0,
                    lineHeight: '1.8' 
                  }}>
                    {selectedSagach.processStartDate ? formatDateWithSlashes(new Date(selectedSagach.processStartDate)) : 'לא צוין'}
                  </p>
                </div>

                {/* 6. תג"ב למעבר לשלב הבא */}
                <div>
                  <h4 style={{ 
                    color: 'rgba(124,192,255,0.9)', 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    margin: '0 0 8px 0' 
                  }}>
                    תג"ב למעבר לשלב הבא
                  </h4>
                  
                  {!isEditingDate ? (
                    canEditStatus() ? (
                      <p 
                        style={{ 
                          color: 'var(--text)', 
                          fontSize: '18px', 
                          margin: 0,
                          lineHeight: '1.8',
                          cursor: 'pointer',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: 'rgba(124,192,255,0.1)',
                          border: '1px solid rgba(124,192,255,0.3)',
                          transition: 'all 0.2s ease',
                          direction: 'rtl'
                        }}
                        onClick={handleEditDateClick}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(124,192,255,0.2)'
                          e.currentTarget.style.borderColor = 'rgba(124,192,255,0.5)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(124,192,255,0.1)'
                          e.currentTarget.style.borderColor = 'rgba(124,192,255,0.3)'
                        }}
                        title="לחץ לעריכת התאריך"
                      >
                        {selectedSagach.estimatedCompletion || '-'}
                      </p>
                    ) : (
                      <p style={{ 
                        color: 'var(--text)', 
                        fontSize: '18px', 
                        margin: 0,
                        lineHeight: '1.8',
                        direction: 'rtl'
                      }}>
                        {selectedSagach.estimatedCompletion || '-'}
                      </p>
                    )
                  ) : (
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <input
                          type="text"
                          value={editDateValue}
                          onChange={(e) => {
                            setEditDateValue(e.target.value)
                          }}
                          placeholder="dd/MM/yyyy"
                          style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(124,192,255,0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            color: 'var(--text)',
                            fontSize: '16px',
                            direction: 'ltr',
                            textAlign: 'right'
                          }}
                          autoFocus
                        />
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'flex-end'
                      }}>
                        <button
                          onClick={handleSaveDate}
                          style={{
                            background: 'linear-gradient(135deg, rgba(76,175,80,0.8), rgba(76,175,80,0.6))',
                            border: '1px solid rgba(76,175,80,0.5)',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(76,175,80,0.3)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0px)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          ✓ שמור
                        </button>
                        
                        <button
                          onClick={handleCancelDateEdit}
                          style={{
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.2)',
                            borderRadius: '6px',
                            padding: '8px 16px',
                            color: 'var(--text)',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                          }}
                        >
                          ❌ ביטול
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Edit Status Button */}
              <div style={{
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '2px solid rgba(255,255,255,0.2)',
                display: 'flex',
                justifyContent: 'center'
              }}>
                {!editingStatus ? (
                  canEditStatus() && (
                    <button
                      onClick={() => setEditingStatus(true)}
                    style={{
                      background: 'linear-gradient(135deg, rgba(124,192,255,0.8), rgba(124,192,255,0.6))',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '12px 24px',
                      color: 'white',
                      fontSize: '16px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      direction: 'rtl',
                      fontFamily: 'Segoe UI, sans-serif'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,192,255,0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0px)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    🔄 עדכן סטטוס בתהליך
                  </button>
                  )
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    alignItems: 'center',
                    width: '100%'
                  }}>
                    <div style={{ position: 'relative', minWidth: '200px' }} onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setIsStatusEditDropdownOpen(!isStatusEditDropdownOpen)}
                        style={{
                          appearance: 'none' as const,
                          border: '1px solid rgba(255,255,255,0.14)',
                          background: 'rgba(255,255,255,0.06)',
                          color: 'var(--text)',
                          borderRadius: '12px',
                          padding: '8px 14px',
                          cursor: 'pointer',
                          transition: 'transform 120ms ease, box-shadow 200ms ease, background 200ms ease',
                          backdropFilter: 'blur(6px)',
                          fontSize: '14px',
                          direction: 'rtl',
                          outline: 'none',
                          fontFamily: 'Segoe UI, sans-serif',
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          textAlign: 'right'
                        }}
                        onMouseEnter={(e) => {
                          (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'
                          ;(e.target as HTMLButtonElement).style.boxShadow = '0 6px 22px rgba(124,192,255,0.24)'
                        }}
                        onMouseLeave={(e) => {
                          (e.target as HTMLButtonElement).style.transform = 'translateY(0px)'
                          ;(e.target as HTMLButtonElement).style.boxShadow = 'none'
                        }}
                      >
                        <span>{PROCESS_STEPS_WITH_COMPLETED[newStatusValue - 1]}</span>
                        <span style={{ marginLeft: '8px' }}>▼</span>
                      </button>
                      {isStatusEditDropdownOpen && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          background: 'var(--panel)',
                          border: '1px solid rgba(255,255,255,0.08)',
                          borderRadius: '12px',
                          marginTop: '4px',
                          zIndex: 1000,
                          maxHeight: '200px',
                          overflowY: 'auto',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                          backdropFilter: 'blur(8px)'
                        }}>
                          {PROCESS_STEPS_WITH_COMPLETED.map((step, index) => (
                            <div
                              key={index + 1}
                              onClick={() => {
                                setNewStatusValue(index + 1)
                                setIsStatusEditDropdownOpen(false)
                              }}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid rgba(255,255,255,0.06)',
                                transition: 'background 0.2s ease',
                                fontSize: '14px',
                                color: '#ffffff',
                                textAlign: 'center',
                                direction: 'rtl'
                              }}
                              onMouseEnter={(e) => {
                                (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                              }}
                              onMouseLeave={(e) => {
                                (e.target as HTMLDivElement).style.background = 'transparent'
                              }}
                            >
                              {step}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '12px'
                    }}>
                      {canEditStatus() && (
                        <button
                          onClick={handleStatusChange}
                          disabled={isStatusChangeLoading}
                        style={{
                          background: isStatusChangeLoading 
                            ? 'linear-gradient(135deg, rgba(76,175,80,0.4), rgba(76,175,80,0.3))'
                            : 'linear-gradient(135deg, rgba(76,175,80,0.8), rgba(76,175,80,0.6))',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: isStatusChangeLoading ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          direction: 'rtl',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          opacity: isStatusChangeLoading ? 0.7 : 1
                        }}
                        onMouseEnter={(e) => {
                          if (!isStatusChangeLoading) {
                            e.currentTarget.style.transform = 'translateY(-1px)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(76,175,80,0.4)'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isStatusChangeLoading) {
                            e.currentTarget.style.transform = 'translateY(0px)'
                            e.currentTarget.style.boxShadow = 'none'
                          }
                        }}
                      >
                        {isStatusChangeLoading ? (
                          <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid transparent',
                            borderTop: '2px solid currentColor',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                        ) : (
                          '✅'
                        )}
                        {isStatusChangeLoading ? 'משמור...' : 'שמור'}
                      </button>
                      )}
                      <button
                        onClick={() => {
                          setEditingStatus(false)
                          setNewStatusValue(selectedSagach.processStatus)
                        }}
                        style={{
                          background: 'rgba(255,255,255,0.1)',
                          border: '1px solid rgba(255,255,255,0.2)',
                          borderRadius: '8px',
                          padding: '8px 16px',
                          color: 'var(--text)',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          direction: 'rtl'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.2)'
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                        }}
                      >
                        ❌ ביטול
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Process Timeline + Chat */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              height: '100%', // Full height
              overflow: 'hidden', // Prevent column from scrolling
              minWidth: 0, // Allow flex shrinking
              boxSizing: 'border-box'
            }}>
              {/* Process Timeline Section */}
              <div style={{
                background: 'rgba(124,192,255,0.08)',
                border: '2px solid rgba(124,192,255,0.2)',
                borderRadius: '20px',
                padding: '20px',
                height: '300px', // Reduced height
                flexShrink: 0, // Don't shrink
                overflowY: 'hidden', // Remove scroll bar
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}>
                <h3 style={{
                  color: 'white',
                  fontSize: '24px',
                  fontWeight: '600',
                  marginBottom: '4px',
                  marginTop: '0px',
                  textAlign: 'center',
                  direction: 'rtl'
                }}>
                 תהליך הכנסת הסג"ח
                </h3>
                <div style={{
                  display: 'flex',
                  flexDirection: 'row',
                  gap: '20px',
                  overflowX: 'auto',
                  direction: 'rtl',
                  padding: '12px',
                  justifyContent: 'center',
                  marginTop: '0px'
                }}>
                  {PROCESS_STEPS.map((step, index) => {
                    const stepNumber = index + 1
                    // If sagach is completed (status 7), show step 6 as completed
                    const isCurrentStep = selectedSagach.processStatus === 7
                      ? false // No current step when completed
                      : selectedSagach.processStatus === stepNumber
                    const isCompleted = selectedSagach.processStatus === 7
                      ? stepNumber <= 6 // All 6 steps are completed when status is 7
                      : selectedSagach.processStatus > stepNumber
                    const isPending = selectedSagach.processStatus === 7
                      ? false // No pending steps when completed
                      : selectedSagach.processStatus < stepNumber
                    const phaseData = selectedSagach.phaseData?.[stepNumber]

                    return (
                      <div key={`${stepNumber}-${selectedSagach.id}-${selectedSagach.processStatus}-${selectedSagach.lastUpdated}-${currentDate.getTime()}-${forceUpdate}-${immediateUpdate}`} style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        minWidth: '130px',
                        maxWidth: '150px',
                        padding: '8px 8px',
                      position: 'relative'
                      }}>
                        {/* Step Circle */}
                        <div style={{
                          width: '50px',
                          height: '50px',
                          borderRadius: '50%',
                          background: isCurrentStep
                            ? (() => {
                                const phaseColor = getProcessStatusColor(stepNumber);
                                const lighterPhase = phaseColor.replace('0.8)', '0.6)');
                                return `linear-gradient(135deg, ${phaseColor}, ${lighterPhase})`;
                              })()
                            : isCompleted
                              ? 'linear-gradient(135deg, rgba(76,175,80,0.8), rgba(76,175,80,0.6))'
                              : 'rgba(255,255,255,0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '18px',
                          flexShrink: 0,
                          animation: isCurrentStep ? 'pulse-glow 2s ease-in-out infinite' : 'none',
                          marginBottom: '12px'
                        }}>
                          {isCompleted ? '✓' : stepNumber}
                        </div>

                        {/* Step Title */}
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: isCurrentStep ? 'var(--accent)' : 'var(--text)',
                          marginBottom: '8px',
                          textAlign: 'center',
                          lineHeight: '1.2',
                          direction: 'rtl'
                        }}>
                          {step}
                        </div>
                        
                        {/* Timing Information */}
                        <div style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px',
                          fontSize: '12px',
                          color: 'var(--muted)',
                          textAlign: 'center',
                          direction: 'rtl'
                        }}>
                          {(isCurrentStep || isCompleted) && phaseData && (
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: '2px'
                            }}>
                              <div>
                                <strong>{calculatePhaseDays(phaseData, isCurrentStep)} ימים</strong>
                                {phaseData.entries && phaseData.entries.length > 1 && (
                                  <span style={{
                                    fontSize: '10px',
                                    color: 'var(--accent)',
                                    marginRight: '4px'
                                  }}>
                                    (כולל חזרה)
                                  </span>
                                )}
                              </div>
                              {phaseData.entries && phaseData.entries.length > 0 && (
                                <div style={{
                                  fontSize: '8px',
                                  color: 'var(--muted)',
                                  opacity: 0.7
                                }}>
                                  {phaseData.entries.length} כניסות לשלב
                                </div>
                              )}
                              {phaseData.currentEntry?.startDate && (
                                <div style={{
                                  fontSize: '9px',
                                  color: 'var(--muted)',
                                  opacity: 0.8
                                }}>
                                  החל: {formatDateWithSlashes(new Date(phaseData.currentEntry.startDate))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Status Indicators */}
                        {isCurrentStep && (
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--accent)',
                            fontWeight: '600',
                            marginTop: '8px',
                            textAlign: 'center',
                            background: 'rgba(124,192,255,0.2)',
                            padding: '6px 12px',
                            borderRadius: '12px',
                            direction: 'rtl'
                          }}>
                            נוכחי
                          </div>
                        )}
                        {isCompleted && (
                          <div style={{
                            fontSize: '12px',
                            color: 'rgba(76,175,80,0.9)',
                            fontWeight: '600',
                            marginTop: '8px',
                            textAlign: 'center',
                            background: 'rgba(76,175,80,0.2)',
                            padding: '6px 12px',
                            borderRadius: '12px',
                            direction: 'rtl'
                          }}>
                            {selectedSagach.processStatus === 7 && stepNumber === 6 ? 'הושלם ' : 'הושלם'}
                          </div>
                        )}
                        {isPending && (
                          <div style={{
                            fontSize: '12px',
                            color: 'var(--muted)',
                            fontWeight: '500',
                            marginTop: '8px',
                            textAlign: 'center',
                            background: 'rgba(255,255,255,0.1)',
                            padding: '6px 12px',
                            borderRadius: '12px',
                            direction: 'rtl'
                          }}>
                            ממתין
                          </div>
                        )}

                        {/* Connection Arrow */}
                        {index < 5 && (
                          <div style={{
                            position: 'absolute',
                            left: '-20px',
                            top: '40px',
                            width: '40px',
                            height: '3px',
                            background: (selectedSagach.processStatus === 7 ? index < 5 : isCompleted) 
                              ? 'rgba(76,175,80,0.6)'
                              : isCurrentStep && index < selectedSagach.processStatus - 1
                                ? 'rgba(124,192,255,0.6)'
                                : 'rgba(255,255,255,0.3)',
                            zIndex: 1
                          }}>
                            <div style={{
                              position: 'absolute',
                              left: '-6px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              width: 0,
                              height: 0,
                              borderTop: '4px solid transparent',
                              borderBottom: '4px solid transparent',
                              borderRight: `8px solid ${(selectedSagach.processStatus === 7 ? index < 5 : isCompleted) 
                                ? 'rgba(76,175,80,0.6)'
                                : isCurrentStep && index < selectedSagach.processStatus - 1
                                  ? 'rgba(124,192,255,0.6)'
                                  : 'rgba(255,255,255,0.3)'}`
                            }} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Chat Section */}
              <div style={{
                background: 'rgba(124,192,255,0.08)',
                border: '2px solid rgba(124,192,255,0.2)',
                borderRadius: '20px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                height: '65%', // Take remaining space
                minHeight: 0, // Limit height to fit screen
                overflow: 'hidden', // Prevent section from scrolling
                maxWidth: '100%',
                boxSizing: 'border-box'
              }}>
                <h4 style={{ 
                  color: 'white', 
                  fontSize: '28px', 
                  fontWeight: '600', 
                  margin: '0 0 16px 0',
                  textAlign: 'center' 
                }}>
                  עדכוני סטטוס
                </h4>
                
                {/* Updates History */}
                <div 
                  ref={chatContainerRef}
                  style={{
                    height: '100%',
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                    marginBottom: '16px',
                    overflowY: 'auto',
                    direction: 'rtl',
                    minHeight: 0 // Allow flex shrinking
                  }}>
                  {selectedSagach.statusUpdates && selectedSagach.statusUpdates.length > 0 ? (
                    selectedSagach.statusUpdates
                      // Show all messages including system messages
                      .sort((a, b) => {
                        // Use same parsing logic as current status
                        const parseTimestamp = (timestamp: string) => {
                          if (timestamp.includes('/')) {
                            const [datePart, timePart] = timestamp.split(' ');
                            const [day, month, year] = datePart.split('/');
                            return new Date(`${year}-${month}-${day} ${timePart}`);
                          } else {
                            return new Date(timestamp);
                          }
                        };
                        const dateA = parseTimestamp(a.timestamp);
                        const dateB = parseTimestamp(b.timestamp);
                        
                        // Primary sort by timestamp (oldest first for chat display)
                        const timeDiff = dateA.getTime() - dateB.getTime();
                        if (timeDiff !== 0) {
                          return timeDiff;
                        }
                        
                        // Secondary sort by ID if timestamps are identical (older messages have lower IDs)
                        return parseInt(a.id) - parseInt(b.id);
                      })
                      .map((update) => {
                        // For system messages, use a distinct color; for status change messages, use the new status color; otherwise use the process status color
                        let phaseColor;
                        if (update.type === 'system') {
                          phaseColor = 'rgba(124,192,255, 0.8)'; // Blue for system messages
                        } else {
                          const statusToUse = update.type === 'status_change' && update.newStatus 
                            ? update.newStatus 
                            : update.processStatus;
                          phaseColor = statusToUse ? getProcessStatusColor(statusToUse) : 'rgba(158, 158, 158, 0.8)';
                        }
                        const phaseColorLight = phaseColor.replace('0.8)', '0.1)');
                        const phaseColorMedium = phaseColor.replace('0.8)', '0.3)');
                        const phaseColorBadge = phaseColor.replace('0.8)', '0.2)');
                        
                        return (
                         <div key={update.id} style={{
                           padding: '12px',
                           marginBottom: '8px',
                           background: phaseColorLight,
                           border: `1px solid ${phaseColorMedium}`,
                           borderRadius: '8px',
                           position: 'relative'
                         }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            marginBottom: '6px'
                          }}>
                            <div style={{
                              fontSize: '11px',
                              color: 'var(--muted)',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                {update.type === 'status_change' && '🔄'}
                                {update.type === 'system' && '⚙️'}
                                {update.type === 'user' && '👤'}
                                {formatDate(update.timestamp)}
                              </div>
                              {update.author && (
                                <div style={{
                                  fontSize: '11px',
                                  color: 'var(--accent)',
                                  fontWeight: '600'
                                }}>
                                  {update.author}
                                </div>
                              )}
                            </div>
                             <div style={{
                               fontSize: '10px',
                               color: 'white',
                               fontWeight: '600',
                               background: phaseColor,
                               padding: '2px 6px',
                               borderRadius: '10px'
                             }}>
                               {(() => {
                                 // For status change messages, show the new status; otherwise show the process status
                                 const statusForDisplay = update.type === 'status_change' && update.newStatus 
                                   ? update.newStatus 
                                   : update.processStatus;
                                 
                                 if (!statusForDisplay) return 'לא זמין';
                                 
                                 return statusForDisplay === 7 
                                   ? 'מובצע' 
                                   : PROCESS_STEPS[statusForDisplay - 1];
                               })()}
                             </div>
                          </div>
                          <div style={{
                            fontSize: '14px',
                            color: 'var(--text)',
                            lineHeight: '1.4'
                          }}>
                            {update.message}
                          </div>
                        </div>
                        )
                      })
                  ) : (
                    <div style={{
                      textAlign: 'center',
                      color: 'var(--muted)',
                      fontSize: '14px',
                      padding: '20px'
                    }}>
                      אין עדכונים עדיין
                    </div>
                  )}
                </div>

                {/* Add New Update */}
                {canChat() && (
                  <div style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <textarea
                    value={newUpdate}
                    onChange={(e) => setNewUpdate(e.target.value)}
                    placeholder="הכנס עדכון או הערה על התהליך..."
                    style={{
                      width: '100%',
                      minHeight: '60px',
                      background: 'transparent',
                      border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: 'var(--text)',
                      fontSize: '14px',
                      direction: 'rtl',
                      fontFamily: 'Segoe UI, sans-serif',
                      outline: 'none',
                      resize: 'vertical',
                      lineHeight: '1.5'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = 'rgba(124,192,255,0.6)'
                      e.target.style.boxShadow = '0 0 0 2px rgba(124,192,255,0.2)'
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                      e.target.style.boxShadow = 'none'
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleAddUpdate()
                      }
                    }}
                  />
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      color: 'var(--muted)'
                    }}>
                      Enter לשליחה, Shift+Enter לשורה חדשה
                    </div>
                    <button
                      onClick={handleAddUpdate}
                      disabled={!newUpdate.trim()}
                      style={{
                        background: newUpdate.trim() 
                          ? 'linear-gradient(135deg, rgba(124,192,255,0.8), rgba(124,192,255,0.6))'
                          : 'rgba(255,255,255,0.1)',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 16px',
                        color: newUpdate.trim() ? 'white' : 'var(--muted)',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: newUpdate.trim() ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s ease',
                        direction: 'rtl'
                      }}
                      onMouseEnter={(e) => {
                        if (newUpdate.trim()) {
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(124,192,255,0.4)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0px)'
                        e.currentTarget.style.boxShadow = 'none'
                      }}
                    >
                      שלח עדכון
                    </button>
                  </div>
                </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
    
    {/* Notification Settings Popup */}
    {isNotificationSettingsOpen && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }} onClick={() => setIsNotificationSettingsOpen(false)}>
        <div style={{
          background: 'radial-gradient(1200px 800px at 50% 50%, rgba(124,192,255,0.15), transparent 50%), radial-gradient(1000px 700px at 50% 50%, rgba(167, 90, 255, 0.12), transparent 50%), var(--bg)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '500px',
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(12px)',
          direction: 'rtl'
        }} onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '24px'
          }}>
            <h3 style={{
              color: 'var(--accent)',
              fontSize: '24px',
              fontWeight: '600',
              margin: '0 0 8px 0'
            }}>
              הגדרות התראות
            </h3>
            <p style={{
              color: 'var(--muted)',
              fontSize: '14px',
              margin: 0
            }}>
              בחר איך תרצה לקבל עדכונים על סג"ח זה
            </p>
          </div>

          {/* Notification Method */}
          <div style={{ marginBottom: '24px' }}>
            <h4 style={{
              color: 'var(--text)',
              fontSize: '16px',
              fontWeight: '600',
              margin: '0 0 12px 0'
            }}>
              איך תרצה לקבל עדכונים?
            </h4>
            <div style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={() => setNotificationMethod('email')}
                style={{
                  background: notificationMethod === 'email' 
                    ? 'linear-gradient(135deg, rgba(124,192,255,0.8), rgba(124,192,255,0.6))' 
                    : 'rgba(255,255,255,0.08)',
                  border: '1px solid ' + (notificationMethod === 'email' 
                    ? 'rgba(124,192,255,0.8)' 
                    : 'rgba(255,255,255,0.2)'),
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: notificationMethod === 'email' ? 'white' : 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flex: '1',
                  minWidth: '120px'
                }}
              >
                📧 מייל
              </button>
              <button
                onClick={() => setNotificationMethod('whatsapp')}
                style={{
                  background: notificationMethod === 'whatsapp' 
                    ? 'linear-gradient(135deg, rgba(49, 10, 244, 0.8), rgba(49, 19, 245, 0.6))' 
                    : 'rgba(255,255,255,0.08)',
                  border: '1px solid ' + (notificationMethod === 'whatsapp' 
                    ? 'rgba(13, 27, 224, 0.8)' 
                    : 'rgba(255,255,255,0.2)'),
                  borderRadius: '12px',
                  padding: '12px 20px',
                  color: notificationMethod === 'whatsapp' ? 'white' : 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  flex: '1',
                  minWidth: '120px'
                }}
              >
                💬 HiChat
              </button>
            </div>
          </div>

          {/* Notification Frequency */}
          <div style={{ marginBottom: '32px' }}>
            <h4 style={{
              color: 'var(--text)',
              fontSize: '16px',
              fontWeight: '600',
              margin: '0 0 12px 0'
            }}>
              באיזו תדירות?
            </h4>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              <button
                onClick={() => setNotificationFrequency('status_change')}
                style={{
                  background: notificationFrequency === 'status_change' 
                    ? 'linear-gradient(135deg, rgba(124,192,255,0.8), rgba(124,192,255,0.6))' 
                    : 'rgba(255,255,255,0.08)',
                  border: '1px solid ' + (notificationFrequency === 'status_change' 
                    ? 'rgba(124,192,255,0.8)' 
                    : 'rgba(255,255,255,0.2)'),
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: notificationFrequency === 'status_change' ? 'white' : 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'right'
                }}
              >
                🔄 רק כשמשתנה סטטוס
              </button>
              <button
                onClick={() => setNotificationFrequency('weekly')}
                style={{
                  background: notificationFrequency === 'weekly' 
                    ? 'linear-gradient(135deg, rgba(255,152,0,0.8), rgba(255,152,0,0.6))' 
                    : 'rgba(255,255,255,0.08)',
                  border: '1px solid ' + (notificationFrequency === 'weekly' 
                    ? 'rgba(255,152,0,0.8)' 
                    : 'rgba(255,255,255,0.2)'),
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: notificationFrequency === 'weekly' ? 'white' : 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'right'
                }}
              >
                📅 שבועי
              </button>
              <button
                onClick={() => setNotificationFrequency('daily')}
                style={{
                  background: notificationFrequency === 'daily' 
                    ? 'linear-gradient(135deg, rgba(233,30,99,0.8), rgba(233,30,99,0.6))' 
                    : 'rgba(255,255,255,0.08)',
                  border: '1px solid ' + (notificationFrequency === 'daily' 
                    ? 'rgba(233,30,99,0.8)' 
                    : 'rgba(255,255,255,0.2)'),
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: notificationFrequency === 'daily' ? 'white' : 'var(--text)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'right'
                }}
              >
                🌅 יומי
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <button
              onClick={async () => {
                if (!selectedSagach) return;
                
                setIsNotificationToggleLoading(true);
                
                try {
                  // Simulate API call delay
                  await new Promise(resolve => setTimeout(resolve, 600));
                  
                  // Apply notification settings using the new subscriber system
                  const userId = user?.id || 'current_user'
                  const userName = user?.name || 'משתמש'
                  
                  const updatedSagach = addNotificationSubscriber(
                    selectedSagach,
                    userId,
                    userName,
                    notificationMethod,
                    notificationFrequency
                  );
                  
                  updateSagachimStatus(selectedSagach.id, updatedSagach);
                  
                  setSelectedSagach(updatedSagach);
                  setIsNotificationSettingsOpen(false);
                  
                  // Show success indicator
                  showPopupIndicator(
                    `התראות הוגדרו בהצלחה דרך ${notificationMethod === 'email' ? 'מייל' : 'וואטסאפ'}`,
                    'success'
                  )
                } catch (error) {
                  console.error('Error setting up notifications:', error);
                  showPopupIndicator('שגיאה בהגדרת התראות', 'warning')
                } finally {
                  setIsNotificationToggleLoading(false);
                }
              }}
              disabled={isNotificationToggleLoading}
              style={{
                ...buttonStyles.primary,
                background: isNotificationToggleLoading
                  ? 'linear-gradient(135deg, rgba(76,175,80,0.4), rgba(76,175,80,0.3))'
                  : 'linear-gradient(135deg, rgba(76,175,80,0.8), rgba(76,175,80,0.6))',
                color: 'white',
                cursor: isNotificationToggleLoading ? 'not-allowed' : 'pointer',
                opacity: isNotificationToggleLoading ? 0.7 : 1
              }}
            >
              {isNotificationToggleLoading ? (
                <div style={{
                  width: '16px',
                  height: '16px',
                  border: '2px solid transparent',
                  borderTop: '2px solid currentColor',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                '✅'
              )}
              {isNotificationToggleLoading ? 'מגדיר התראות...' : 'אשר והפעל התראות'}
            </button>
            <button
              onClick={() => setIsNotificationSettingsOpen(false)}
              style={{
                ...buttonStyles.primary,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'var(--text)'
              }}
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    )}

    {/* New Sagach Creation Popup */}
    {isNewSagachPopupOpen && (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 1200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }} onClick={() => {
        if (!isCreateSagachLoading) {
          setIsNewSagachPopupOpen(false)
          setNewSagachForm({ name: '', description: '', provider: '', arena: '' })
        }
      }}>
        <div style={{
          background: 'radial-gradient(1200px 800px at 50% 50%, rgba(124,192,255,0.15), transparent 50%), radial-gradient(1000px 700px at 50% 50%, rgba(167, 90, 255, 0.12), transparent 50%), var(--bg)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '20px',
          padding: '32px',
          maxWidth: '600px',
          width: '90%',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          backdropFilter: 'blur(12px)',
          direction: 'rtl'
        }} onClick={(e) => e.stopPropagation()}>
          
          {/* Header */}
          <div style={{
            textAlign: 'center',
            marginBottom: '32px'
          }}>
            <h3 style={{
              color: 'var(--accent)',
              fontSize: '28px',
              fontWeight: '700',
              margin: '0 0 12px 0'
            }}>
              יצירת סג"ח חדש
            </h3>
            <p style={{
              color: 'var(--muted)',
              fontSize: '16px',
              margin: 0
            }}>
              מלא את הפרטים הדרושים ליצירת הסג"ח החדש
            </p>
          </div>

          {/* Form Fields */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginBottom: '32px'
          }}>
            
            {/* Sagach Name */}
            <div>
              <label style={{
                display: 'block',
                color: 'var(--text)',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                שם הסג"ח *
              </label>
              <input
                type="text"
                value={newSagachForm.name}
                onChange={(e) => setNewSagachForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="הכנס שם לסג'ח החדש..."
                disabled={isCreateSagachLoading}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontFamily: 'Segoe UI, sans-serif',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  direction: 'rtl',
                  opacity: isCreateSagachLoading ? 0.6 : 1,
                  cursor: isCreateSagachLoading ? 'not-allowed' : 'text',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (!isCreateSagachLoading) {
                    e.target.style.borderColor = 'rgba(124,192,255,0.6)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(124,192,255,0.1)'
                  }
                }}
                onBlur={(e) => {
                  if (!isCreateSagachLoading) {
                    e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                    e.target.style.boxShadow = 'none'
                  }
                }}
              />
            </div>

            {/* Description */}
            <div>
              <label style={{
                display: 'block',
                color: 'var(--text)',
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '8px'
              }}>
                תיאור *
              </label>
              <textarea
                value={newSagachForm.description}
                onChange={(e) => setNewSagachForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="הכנס תיאור מפורט לסג'ח..."
                disabled={isCreateSagachLoading}
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: '12px',
                  color: 'var(--text)',
                  fontSize: '14px',
                  fontFamily: 'Segoe UI, sans-serif',
                  outline: 'none',
                  transition: 'all 0.2s ease',
                  direction: 'rtl',
                  resize: 'vertical',
                  minHeight: '80px',
                  opacity: isCreateSagachLoading ? 0.6 : 1,
                  cursor: isCreateSagachLoading ? 'not-allowed' : 'text',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => {
                  if (!isCreateSagachLoading) {
                    e.target.style.borderColor = 'rgba(124,192,255,0.6)'
                    e.target.style.boxShadow = '0 0 0 3px rgba(124,192,255,0.1)'
                  }
                }}
                onBlur={(e) => {
                  if (!isCreateSagachLoading) {
                    e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                    e.target.style.boxShadow = 'none'
                  }
                }}
              />
            </div>

            {/* Provider, Arena & Priority Row */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '16px'
              }}>
              
              {/* Provider */}
              <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                <label style={{
                  display: 'block',
                  color: 'var(--text)',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  ספק *
                </label>
                <input
                  type="text"
                  value={newSagachForm.provider}
                  onChange={(e) => setNewSagachForm(prev => ({ ...prev, provider: e.target.value }))}
                  placeholder="שם הספק..."
                  disabled={isCreateSagachLoading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontFamily: 'Segoe UI, sans-serif',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    direction: 'rtl',
                    opacity: isCreateSagachLoading ? 0.6 : 1,
                    cursor: isCreateSagachLoading ? 'not-allowed' : 'text',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    if (!isCreateSagachLoading) {
                      e.target.style.borderColor = 'rgba(124,192,255,0.6)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(124,192,255,0.1)'
                    }
                  }}
                  onBlur={(e) => {
                    if (!isCreateSagachLoading) {
                      e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                      e.target.style.boxShadow = 'none'
                    }
                  }}
                />
              </div>

              {/* Arena */}
              <div>
                <label style={{
                  display: 'block',
                  color: 'var(--text)',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  זירה *
                </label>
                <input
                  type="text"
                  value={newSagachForm.arena}
                  onChange={(e) => setNewSagachForm(prev => ({ ...prev, arena: e.target.value }))}
                  placeholder="שם הזירה..."
                  disabled={isCreateSagachLoading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontFamily: 'Segoe UI, sans-serif',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    direction: 'rtl',
                    opacity: isCreateSagachLoading ? 0.6 : 1,
                    cursor: isCreateSagachLoading ? 'not-allowed' : 'text',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    if (!isCreateSagachLoading) {
                      e.target.style.borderColor = 'rgba(124,192,255,0.6)'
                      e.target.style.boxShadow = '0 0 0 3px rgba(124,192,255,0.1)'
                    }
                  }}
                  onBlur={(e) => {
                    if (!isCreateSagachLoading) {
                      e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                      e.target.style.boxShadow = 'none'
                    }
                  }}
                />
              </div>

              {/* Priority */}
              <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                <label style={{
                  display: 'block',
                  color: 'var(--text)',
                  fontSize: '16px',
                  fontWeight: '600',
                  marginBottom: '8px'
                }}>
                  תעדוף *
                </label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!isCreateSagachLoading) {
                      setIsPriorityDropdownOpen(prev => !prev)
                    }
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontFamily: 'Segoe UI, sans-serif',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    direction: 'rtl',
                    opacity: isCreateSagachLoading ? 0.6 : 1,
                    cursor: isCreateSagachLoading ? 'not-allowed' : 'pointer',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                  disabled={isCreateSagachLoading}
                  onMouseEnter={(e) => {
                    if (!isCreateSagachLoading) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(124,192,255,0.6)'
                      ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 3px rgba(124,192,255,0.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isCreateSagachLoading) {
                      (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.2)'
                      ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
                    }
                  }}
                >
                  <span>{newSagachForm.priority}</span>
                  <span style={{ fontSize: '12px', marginLeft: '8px' }}>▼</span>
                </button>
                {isPriorityDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    left: 0,
                    background: 'var(--panel)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    zIndex: 1000,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    backdropFilter: 'blur(8px)',
                    overflow: 'hidden'
                  }}>
                    {PRIORITY_OPTIONS.map(option => (
                      <div
                        key={option}
                        onClick={(e) => {
                          e.stopPropagation()
                          setNewSagachForm(prev => ({ ...prev, priority: option }))
                          setIsPriorityDropdownOpen(false)
                        }}
                        style={{
                          padding: '10px 16px',
                          cursor: 'pointer',
                          transition: 'background 0.2s ease',
                          direction: 'rtl',
                          color: 'var(--text)',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: newSagachForm.priority === option ? 'rgba(124,192,255,0.15)' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLDivElement).style.background = 'rgba(124,192,255,0.15)'
                        }}
                        onMouseLeave={(e) => {
                          if (newSagachForm.priority !== option) {
                            (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                          }
                        }}
                      >
                        <span>{option}</span>
                        {option === 'TOP' && <span style={{ fontSize: '12px', color: 'var(--accent)' }}>🔥</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'center'
          }}>
            <button
              onClick={handleCreateSagach}
              disabled={isCreateSagachLoading}
              style={{
                ...buttonStyles.primary,
                background: isCreateSagachLoading
                  ? 'linear-gradient(135deg, rgba(76,175,80,0.4), rgba(76,175,80,0.3))'
                  : 'linear-gradient(135deg, rgba(76,175,80,0.8), rgba(76,175,80,0.6))',
                color: 'white',
                fontSize: '16px',
                padding: '14px 28px',
                cursor: isCreateSagachLoading ? 'not-allowed' : 'pointer',
                opacity: isCreateSagachLoading ? 0.7 : 1
              }}
            >
              {isCreateSagachLoading ? (
                <div style={{
                  width: '18px',
                  height: '18px',
                  border: '2px solid transparent',
                  borderTop: '2px solid currentColor',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
              ) : (
                '✅'
              )}
              {isCreateSagachLoading ? 'יוצר סג"ח...' : 'צור סג"ח'}
            </button>
            <button
              onClick={() => {
                if (!isCreateSagachLoading) {
                  setIsNewSagachPopupOpen(false)
                  setNewSagachForm({ name: '', description: '', provider: '', arena: '', priority: 'בינוני' as PriorityOption })
                }
              }}
              disabled={isCreateSagachLoading}
              style={{
                ...buttonStyles.primary,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'var(--text)',
                fontSize: '16px',
                padding: '14px 28px',
                cursor: isCreateSagachLoading ? 'not-allowed' : 'pointer',
                opacity: isCreateSagachLoading ? 0.5 : 1
              }}
            >
              ביטול
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Bottom Popup Indicator */}
    {popupIndicator.isVisible && (
      <div style={{
        position: 'fixed',
        bottom: '30px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: popupIndicator.type === 'success' 
          ? 'linear-gradient(135deg, rgba(76,175,80,0.95), rgba(76,175,80,0.85))'
          : popupIndicator.type === 'warning'
          ? 'linear-gradient(135deg, rgba(255,152,0,0.95), rgba(255,152,0,0.85))'
          : 'linear-gradient(135deg, rgba(33,150,243,0.95), rgba(33,150,243,0.85))',
        border: `1px solid ${
          popupIndicator.type === 'success' 
            ? 'rgba(76,175,80,0.8)'
            : popupIndicator.type === 'warning'
            ? 'rgba(255,152,0,0.8)'
            : 'rgba(33,150,243,0.8)'
        }`,
        borderRadius: '25px',
        padding: '12px 24px',
        color: 'white',
        fontSize: '14px',
        fontWeight: '600',
        fontFamily: 'Segoe UI, sans-serif',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        backdropFilter: 'blur(12px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        direction: 'rtl',
        minWidth: '200px',
        justifyContent: 'center',
        animation: popupIndicator.isVisible 
          ? 'slideUpFadeIn 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
          : 'slideDownFadeOut 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
      }}>
        <span style={{ fontSize: '16px' }}>
          {popupIndicator.type === 'success' ? '✅' : 
           popupIndicator.type === 'warning' ? '⚠️' : 'ℹ️'}
        </span>
        {popupIndicator.message}
      </div>
    )}

    {/* Add slide animations CSS */}
    <style>
      {`
        @keyframes slideUpFadeIn {
          0% {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          100% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        @keyframes slideDownFadeOut {
          0% {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
        }
      `}
    </style>
    </>
  )
}
