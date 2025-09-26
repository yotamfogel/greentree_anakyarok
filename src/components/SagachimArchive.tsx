import React, { useState, useEffect, useMemo } from 'react'
import { usePermissions } from '../contexts/PermissionContext'
import { useSagachData, type ArenaOption, type PhaseEntry, type PhaseData } from '../contexts/SagachDataContext'
import { SagachAnalyticsModal } from './SagachAnalyticsModal'

// Custom date formatting function to use '/' instead of '.'
const formatDateWithSlashes = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
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

const PRIORITY_OPTIONS = ['נמוך', 'בינוני', 'גבוה', 'TOP'] as const
type PriorityOption = typeof PRIORITY_OPTIONS[number]

interface FileAttachment {
  id: string
  name: string
  size: number
  type: string
  uploadDate: string
  url?: string
  data?: string
}

interface SagachimStatusItem {
  id: string
  name: string
  description: string
  provider: string
  lastUpdated: string
  arena: ArenaOption[]
  priority: PriorityOption
  sagachType?: string
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
  notificationMethod?: 'email' | 'whatsapp'
  notificationFrequency?: 'daily' | 'weekly' | 'status_change'
  completionDate?: string
  notificationSubscribers?: NotificationSubscriber[]
  attachments?: FileAttachment[]
}

interface NotificationSubscriber {
  userId: string
  userName: string
  notificationMethod: 'email' | 'whatsapp'
  notificationFrequency: 'daily' | 'weekly' | 'status_change'
  subscribedAt: string
}

const PROCESS_STEPS_WITH_COMPLETED = [
  'ממתין לבשלות בצד ספק',
  'ממתין לקבלת דג"ח והתנעה', 
  'בתהליכי אפיון',
  'ממתין לאינטגרציות',
  'אינטגרציות',
  'מבצוע',
  'מובצע'
] as const

const PRIORITY_LABELS: Record<PriorityOption, string> = {
  'נמוך': 'נמוך',
  'בינוני': 'בינוני',
  'גבוה': 'גבוה',
  'TOP': 'TOP'
}

const PRIORITY_COLORS: Record<PriorityOption, string> = {
  'נמוך': '#4CAF50',
  'בינוני': '#FF9800',
  'גבוה': '#F44336',
  'TOP': '#9C27B0'
}

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

const getTotalDays = (item: SagachimStatusItem) => {
  if (!item.processStartDate || !item.completionDate) return 0
  const start = new Date(item.processStartDate)
  const end = new Date(item.completionDate)
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
}

const getDaysColor = (days: number) => {
  if (days <= 14) return '#4CAF50' // Green
  if (days <= 30) return '#FF9800' // Orange
  return '#F44336' // Red
}

interface SagachimArchiveProps {
  onBack?: () => void
}

export const SagachimArchive = ({ onBack }: SagachimArchiveProps) => {
  const { user } = usePermissions()
  const { sagachimStatus, isLoading, error } = useSagachData()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedArena, setSelectedArena] = useState('')
  const [dateRangeType, setDateRangeType] = useState<'custom' | 'preset'>('preset')
  const [customDays, setCustomDays] = useState('')
  const [customUnit, setCustomUnit] = useState<'days' | 'months' | 'years'>('days')
  const [presetRange, setPresetRange] = useState('')
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false)
  const [isArenaDropdownOpen, setIsArenaDropdownOpen] = useState(false)
  const [isDateRangeDropdownOpen, setIsDateRangeDropdownOpen] = useState(false)
  const [isAnalyticsModalOpen, setIsAnalyticsModalOpen] = useState(false)
  const [selectedSagach, setSelectedSagach] = useState<SagachimStatusItem | null>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-dropdown-container]')) {
        setIsProviderDropdownOpen(false)
        setIsArenaDropdownOpen(false)
        setIsDateRangeDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Standardized button styles
  const buttonStyles = {
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
    }
  }

  // Filter completed sagachim (processStatus === 7)
  const completedSagachim = useMemo(() => {
    if (!sagachimStatus) return []
    return sagachimStatus.filter((item: SagachimStatusItem) => item.processStatus === 7)
  }, [sagachimStatus])

  // Filter and sort data
  const filteredData = useMemo(() => {
    let filtered = completedSagachim

    // Search filter - only by name
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((item: SagachimStatusItem) => 
        item.name.toLowerCase().includes(query)
      )
    }

    // Provider filter
    if (selectedProvider) {
      filtered = filtered.filter((item: SagachimStatusItem) => item.provider === selectedProvider)
    }

    // Arena filter
    if (selectedArena) {
      filtered = filtered.filter((item: SagachimStatusItem) => 
        item.arena.includes(selectedArena as ArenaOption)
      )
    }

    // Debug: Log filter state
    if (process.env.NODE_ENV === 'development') {
      console.log('Filter state:', {
        dateRangeType,
        presetRange,
        customDays,
        customUnit,
        totalItems: completedSagachim.length,
        beforeDateFilter: filtered.length
      })
    }

    // Date range filter
    if (dateRangeType === 'preset' && presetRange) {
      const now = new Date()
      let cutoffDate = new Date()
      
      switch (presetRange) {
        case 'last7days':
          cutoffDate.setDate(now.getDate() - 7)
          break
        case 'last30days':
          cutoffDate.setDate(now.getDate() - 30)
          break
        case 'last3months':
          cutoffDate.setMonth(now.getMonth() - 3)
          break
        case 'last6months':
          cutoffDate.setMonth(now.getMonth() - 6)
          break
        case 'lastyear':
          cutoffDate.setFullYear(now.getFullYear() - 1)
          break
      }
      
      filtered = filtered.filter((item: SagachimStatusItem) => {
        const completionDate = item.completionDate ? new Date(item.completionDate) : new Date(item.lastUpdated)
        const now = new Date()
        const isInRange = completionDate >= cutoffDate && completionDate <= now && !isNaN(completionDate.getTime())
        
        // Debug logging
        if (process.env.NODE_ENV === 'development') {
          console.log('Date filter debug:', {
            itemName: item.name,
            completionDate: item.completionDate,
            lastUpdated: item.lastUpdated,
            parsedDate: completionDate,
            cutoffDate: cutoffDate,
            now: now,
            isValid: !isNaN(completionDate.getTime()),
            isInRange: isInRange
          })
        }
        return isInRange
      })
    } else if (dateRangeType === 'custom' && customDays) {
      const days = parseInt(customDays)
      if (!isNaN(days)) {
        const now = new Date()
        let cutoffDate = new Date()
        
        switch (customUnit) {
          case 'days':
            cutoffDate.setDate(now.getDate() - days)
            break
          case 'months':
            cutoffDate.setMonth(now.getMonth() - days)
            break
          case 'years':
            cutoffDate.setFullYear(now.getFullYear() - days)
            break
        }
        
        filtered = filtered.filter((item: SagachimStatusItem) => {
          const completionDate = item.completionDate ? new Date(item.completionDate) : new Date(item.lastUpdated)
          const now = new Date()
          const isInRange = completionDate >= cutoffDate && completionDate <= now && !isNaN(completionDate.getTime())
          
          // Debug logging
          if (process.env.NODE_ENV === 'development') {
            console.log('Custom date filter debug:', {
              itemName: item.name,
              completionDate: item.completionDate,
              lastUpdated: item.lastUpdated,
              parsedDate: completionDate,
              cutoffDate: cutoffDate,
              now: now,
              isValid: !isNaN(completionDate.getTime()),
              isInRange: isInRange
            })
          }
          return isInRange
        })
      }
    }

    // Sort by total days (default)
    filtered.sort((a: SagachimStatusItem, b: SagachimStatusItem) => {
      return getTotalDays(b) - getTotalDays(a) // Descending order (most days first)
    })

    // Debug: Log final count
    if (process.env.NODE_ENV === 'development') {
      console.log('Final filtered count:', filtered.length)
    }

    return filtered
  }, [completedSagachim, searchQuery, selectedProvider, selectedArena, dateRangeType, presetRange, customDays, customUnit])

  // Handle sagach card click
  const handleSagachClick = (sagach: SagachimStatusItem) => {
    setSelectedSagach(sagach)
    setIsAnalyticsModalOpen(true)
  }

  // Get unique providers for filter
  const providers = useMemo(() => {
    if (!sagachimStatus) return []
    const providerSet = new Set<string>()
    sagachimStatus.forEach((item: SagachimStatusItem) => {
      if (item.provider) providerSet.add(item.provider)
    })
    return Array.from(providerSet).sort()
  }, [sagachimStatus])

  // Get unique arenas for filter
  const availableArenas = useMemo(() => {
    if (!sagachimStatus) return []
    const arenas = new Set<string>()
    sagachimStatus.forEach((item: SagachimStatusItem) => {
      item.arena.forEach((arena: ArenaOption) => arenas.add(arena))
    })
    return Array.from(arenas).sort()
  }, [sagachimStatus])

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        fontSize: '18px',
        color: 'var(--text)',
        fontFamily: 'Segoe UI, sans-serif'
      }}>
        טוען ארכיון...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        fontSize: '18px',
        color: 'var(--error)',
        fontFamily: 'Segoe UI, sans-serif'
      }}>
        שגיאה בטעינת הארכיון: {error}
      </div>
    )
  }

  return (
    <main className="app-main" style={{ padding: '20px', direction: 'rtl', fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {onBack && (
            <button
              onClick={onBack}
              style={{
                padding: '12px',
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: 'var(--text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'Segoe UI, sans-serif',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
                e.currentTarget.style.borderColor = 'rgba(124,192,255,0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
              }}
              title="חזור לסטטוס סגחים"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
              </svg>
            </button>
          )}
          <div>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '700',
              color: 'var(--text)',
              margin: '0 0 8px 0',
              textAlign: 'right'
            }}>
              ארכיון סגחים מובצעים
            </h1>
            <p style={{
              fontSize: '16px',
              color: 'var(--muted)',
              margin: '0',
              textAlign: 'right'
            }}>
              {completedSagachim.length} סגחים הושלמו בסך הכל
            </p>
          </div>
        </div>
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
              placeholder="חיפוש לפי שם..."
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
          <div style={{ position: 'relative', minWidth: '160px', maxWidth: '220px', flex: '0 1 180px' }} onClick={(e) => e.stopPropagation()} data-dropdown-container>
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
          <div style={{ position: 'relative', minWidth: '160px', maxWidth: '220px', flex: '0 1 180px' }} onClick={(e) => e.stopPropagation()} data-dropdown-container>
            <button
              onClick={() => setIsArenaDropdownOpen(!isArenaDropdownOpen)}
              style={buttonStyles.filter}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(0px)'
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
                {availableArenas.map(arena => (
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

          {/* Date Range Filter */}
          <div style={{ position: 'relative', minWidth: '200px', maxWidth: '280px', flex: '0 1 200px' }} onClick={(e) => e.stopPropagation()} data-dropdown-container>
            <button
              onClick={() => setIsDateRangeDropdownOpen(!isDateRangeDropdownOpen)}
              style={buttonStyles.filter}
              onMouseEnter={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLButtonElement).style.transform = 'translateY(0px)'
              }}
            >
              <span>
                {dateRangeType === 'preset' 
                  ? (presetRange ? 
                      (presetRange === 'last7days' ? '7 ימים אחרונים' :
                       presetRange === 'last30days' ? '30 ימים אחרונים' :
                       presetRange === 'last3months' ? '3 חודשים אחרונים' :
                       presetRange === 'last6months' ? '6 חודשים אחרונים' :
                       presetRange === 'lastyear' ? 'שנה אחרונה' : 'טווח זמנים')
                      : 'טווח זמנים')
                  : (customDays ? `${customDays} ${customUnit === 'days' ? 'ימים' : customUnit === 'months' ? 'חודשים' : 'שנים'}` : 'טווח זמנים')
                }
              </span>
              <span style={{ marginLeft: '8px' }}>▼</span>
            </button>
            {isDateRangeDropdownOpen && (
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
                maxHeight: '300px',
                overflowY: 'auto',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(8px)',
                padding: '8px'
              }}>
                {/* Preset Options */}
                <div style={{ marginBottom: '8px' }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    marginBottom: '4px',
                    textAlign: 'right'
                  }}>
                    טווחים מוגדרים:
                  </div>
                  {[
                    { value: 'last7days', label: '7 ימים אחרונים' },
                    { value: 'last30days', label: '30 ימים אחרונים' },
                    { value: 'last3months', label: '3 חודשים אחרונים' },
                    { value: 'last6months', label: '6 חודשים אחרונים' },
                    { value: 'lastyear', label: 'שנה אחרונה' }
                  ].map(option => (
                    <div
                      key={option.value}
                      onClick={() => {
                        setDateRangeType('preset')
                        setPresetRange(option.value)
                        setIsDateRangeDropdownOpen(false)
                      }}
                      style={{
                        padding: '6px 8px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'background 0.2s ease',
                        fontSize: '13px',
                        color: '#ffffff',
                        textAlign: 'right',
                        direction: 'rtl',
                        marginBottom: '2px'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLDivElement).style.background = 'transparent'
                      }}
                    >
                      {option.label}
                    </div>
                  ))}
                </div>

                {/* Custom Range */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '8px' }}>
                  <div style={{
                    fontSize: '12px',
                    color: 'var(--muted)',
                    marginBottom: '4px',
                    textAlign: 'right'
                  }}>
                    טווח מותאם אישית:
                  </div>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center', marginBottom: '8px' }}>
                    <input
                      type="number"
                      placeholder="מספר"
                      value={customDays}
                      onChange={(e) => setCustomDays(e.target.value)}
                      style={{
                        width: '60px',
                        padding: '4px 6px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        color: 'var(--text)',
                        fontSize: '12px',
                        direction: 'rtl',
                        outline: 'none'
                      }}
                    />
                    <select
                      value={customUnit}
                      onChange={(e) => setCustomUnit(e.target.value as 'days' | 'months' | 'years')}
                      style={{
                        padding: '4px 6px',
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        color: 'var(--text)',
                        fontSize: '12px',
                        direction: 'rtl',
                        outline: 'none'
                      }}
                    >
                      <option value="days">ימים</option>
                      <option value="months">חודשים</option>
                      <option value="years">שנים</option>
                    </select>
                    <button
                      onClick={() => {
                        setDateRangeType('custom')
                        setIsDateRangeDropdownOpen(false)
                      }}
                      style={{
                        padding: '4px 8px',
                        background: 'rgba(76,175,80,0.8)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      החל
                    </button>
                  </div>
                </div>

                {/* Clear Filter */}
                <div
                  onClick={() => {
                    setPresetRange('')
                    setCustomDays('')
                    setDateRangeType('preset')
                    setIsDateRangeDropdownOpen(false)
                  }}
                  style={{
                    padding: '6px 8px',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'background 0.2s ease',
                    fontSize: '13px',
                    color: '#ffffff',
                    textAlign: 'right',
                    direction: 'rtl',
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    marginTop: '8px',
                    paddingTop: '8px'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLDivElement).style.background = 'transparent'
                  }}
                >
                  נקה סינון
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div style={{
        marginBottom: '20px',
        textAlign: 'right',
        color: 'var(--muted)',
        fontSize: '14px'
      }}>
        {filteredData.length} מתוך {completedSagachim.length} סגחים
      </div>

      {/* Archive List */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '24px',
        justifyItems: 'center'
      }}>
        {filteredData.map((item: SagachimStatusItem) => (
          <div
            key={item.id}
            onClick={() => handleSagachClick(item)}
            style={{
              background: 'linear-gradient(180deg, rgba(76,175,80,0.15), rgba(46,125,50,0.10))',
              border: '1px solid rgba(76,175,80,0.3)',
              borderRadius: '16px',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(76,175,80,0.2), inset 0 1px 0 rgba(76,175,80,0.1)',
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
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(76,175,80,0.3), inset 0 1px 0 rgba(76,175,80,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)'
              e.currentTarget.style.boxShadow = '0 8px 32px rgba(76,175,80,0.2), inset 0 1px 0 rgba(76,175,80,0.1)'
            }}
          >
            {/* Process Status Badge */}
            <div style={{
              position: 'absolute',
              top: '16px',
              left: '16px',
              background: getProcessStatusColor(item.processStatus),
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
              ✅ מובצע
            </div>

            {/* Days Label */}
            {(() => {
              const totalDays = getTotalDays(item)
              if (totalDays > 0) {
                return (
                  <div style={{
                    position: 'absolute',
                    top: '16px',
                    right: '16px',
                    background: getDaysColor(totalDays),
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
                    justifyContent: 'center',
                    gap: '4px'
                  }}>
                    {totalDays} ימים
                  </div>
                )
              }
              return null
            })()}

            {/* Content */}
            <div style={{ marginTop: '40px', direction: 'rtl' }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: 'var(--text)',
                margin: '0 0 12px 0',
                lineHeight: '1.3'
              }}>
                {item.name}
              </h3>

              <p style={{
                fontSize: '14px',
                color: 'var(--muted)',
                margin: '0 0 16px 0',
                lineHeight: '1.5',
                minHeight: '42px',
                whiteSpace: 'pre-wrap',
                direction: 'rtl',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden'
              }}>
                {item.description}
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
                    {item.provider}
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
                    {item.arena.join(', ')}
                  </span>
                </div>

                {item.completionDate && (
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
                      הושלם:
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: 'var(--text)'
                    }}>
                      {formatDateWithSlashes(new Date(item.completionDate))}
                    </span>
                  </div>
                )}

                {item.contactPerson && (
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
                      איש קשר:
                    </span>
                    <span style={{
                      fontSize: '12px',
                      color: 'var(--text)'
                    }}>
                      {item.contactPerson}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Hover Effect Overlay */}
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'linear-gradient(135deg, rgba(76,175,80,0.15), rgba(46,125,50,0.1))',
              opacity: 0,
              transition: 'opacity 0.3s ease',
              pointerEvents: 'none'
            }} />
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredData.length === 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          textAlign: 'center'
        }}>
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="currentColor"
            style={{ color: 'var(--muted)', marginBottom: '16px' }}
          >
            <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 9.5l4 4h-2.5V16h-3v-2.5H8l4-4z"/>
          </svg>
          <h3 style={{
            fontSize: '18px',
            color: 'var(--text)',
            margin: '0 0 8px 0'
          }}>
            לא נמצאו סגחים מובצעים
          </h3>
          <p style={{
            fontSize: '14px',
            color: 'var(--muted)',
            margin: '0'
          }}>
            {searchQuery || selectedProvider || selectedArena 
              ? 'נסה לשנות את הפילטרים או החיפוש'
              : 'עדיין לא הושלמו סגחים במערכת'
            }
          </p>
        </div>
      )}

      {/* Analytics Modal */}
      <SagachAnalyticsModal
        isOpen={isAnalyticsModalOpen}
        onClose={() => {
          setIsAnalyticsModalOpen(false)
          setSelectedSagach(null)
        }}
        sagach={selectedSagach}
      />
    </main>
  )
}
