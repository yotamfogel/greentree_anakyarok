import React, { useState, useEffect, useMemo } from 'react'
import { usePermissions } from '../contexts/PermissionContext'
import { useSagachData, type ArenaOption, type PhaseEntry, type PhaseData } from '../contexts/SagachDataContext'

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

const PROCESS_STEPS = [
  'ממתין לבשלות בצד ספק',
  'ממתין לקבלת דג"ח והתנעה', 
  'בתהליכי אפיון',
  'ממתין לאינטגרציות',
  'אינטגרציות',
  'מבצוע',
  'מובצע'
] as const

export const SagachimAnalytics = () => {
  const { user } = usePermissions()
  const { sagachimStatus, isLoading, error } = useSagachData()
  const [selectedProvider, setSelectedProvider] = useState('')
  const [selectedArena, setSelectedArena] = useState('')
  const [isProviderDropdownOpen, setIsProviderDropdownOpen] = useState(false)
  const [isArenaDropdownOpen, setIsArenaDropdownOpen] = useState(false)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-dropdown-container]')) {
        setIsProviderDropdownOpen(false)
        setIsArenaDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Get unique providers and arenas for filters
  const providers = useMemo(() => {
    if (!sagachimStatus) return []
    const completedSagachim = sagachimStatus.filter(item => item.processStatus === 7)
    const providerSet = new Set<string>()
    completedSagachim.forEach((item: SagachimStatusItem) => {
      if (item.provider) providerSet.add(item.provider)
    })
    return Array.from(providerSet).sort()
  }, [sagachimStatus])

  const availableArenas = useMemo(() => {
    if (!sagachimStatus) return []
    const completedSagachim = sagachimStatus.filter(item => item.processStatus === 7)
    const arenas = new Set<string>()
    completedSagachim.forEach((item: SagachimStatusItem) => {
      item.arena.forEach((arena: ArenaOption) => arenas.add(arena))
    })
    return Array.from(arenas).sort()
  }, [sagachimStatus])

  // Standardized button styles for filters
  const buttonStyles = {
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

  // Calculate statistics
  const calculateAnalytics = () => {
     if (!sagachimStatus) return {
       averageDaysPerPhase: {},
       averageImplementationDays: 0,
       totalCompleted: 0,
       overallAverageImplementationDays: 0,
       overallAverageDaysPerPhase: {},
       overallTotalCompleted: 0
     }

    // Get all completed sagachim for overall averages
    const allCompletedSagachim = sagachimStatus.filter(item => item.processStatus === 7)
    
    // Filter completed sagachim for current filters
    let completedSagachim = allCompletedSagachim
    
    // Apply provider filter
    if (selectedProvider) {
      completedSagachim = completedSagachim.filter(item => item.provider === selectedProvider)
    }
    
    // Apply arena filter
    if (selectedArena) {
      completedSagachim = completedSagachim.filter(item => 
        item.arena.includes(selectedArena as ArenaOption)
      )
    }
    
    // Calculate overall averages first
    const overallPhaseTotals: { [key: number]: number } = {}
    const overallPhaseCounts: { [key: number]: number } = {}
    
    allCompletedSagachim.forEach(sagach => {
      if (sagach.phaseData) {
        Object.entries(sagach.phaseData).forEach(([phaseNum, phaseData]) => {
          const phase = parseInt(phaseNum)
          if (phaseData && phaseData.entries) {
            const phaseDays = phaseData.entries.reduce((total, entry) => {
              if (entry.completionDate) {
                const start = entry.startDate ? new Date(entry.startDate) : new Date(sagach.processStartDate || sagach.lastUpdated)
                const end = new Date(entry.completionDate)
                return total + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
              }
              return total
            }, 0)
            
            overallPhaseTotals[phase] = (overallPhaseTotals[phase] || 0) + phaseDays
            overallPhaseCounts[phase] = (overallPhaseCounts[phase] || 0) + 1
          }
        })
      }
    })

    const overallAverageDaysPerPhase: { [key: number]: number } = {}
    Object.keys(overallPhaseTotals).forEach(phase => {
      const phaseNum = parseInt(phase)
      overallAverageDaysPerPhase[phaseNum] = overallPhaseCounts[phaseNum] > 0 
        ? Math.round((overallPhaseTotals[phaseNum] / overallPhaseCounts[phaseNum]) * 10) / 10 
        : 0
    })

    // Calculate overall average implementation days
    const totalOverallImplementationDays = allCompletedSagachim.reduce((total, sagach) => {
      if (sagach.processStartDate && sagach.completionDate) {
        const start = new Date(sagach.processStartDate)
        const end = new Date(sagach.completionDate)
        return total + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      }
      return total
    }, 0)
    
    const overallAverageImplementationDays = allCompletedSagachim.length > 0 
      ? Math.round((totalOverallImplementationDays / allCompletedSagachim.length) * 10) / 10 
      : 0
    
     if (completedSagachim.length === 0) {
       return {
         averageDaysPerPhase: {},
         averageImplementationDays: 0,
         totalCompleted: 0,
         overallAverageImplementationDays,
         overallAverageDaysPerPhase: overallAverageDaysPerPhase,
         overallTotalCompleted: allCompletedSagachim.length
       }
     }

    // Calculate filtered averages
    const phaseTotals: { [key: number]: number } = {}
    const phaseCounts: { [key: number]: number } = {}
    
    completedSagachim.forEach(sagach => {
      if (sagach.phaseData) {
        Object.entries(sagach.phaseData).forEach(([phaseNum, phaseData]) => {
          const phase = parseInt(phaseNum)
          if (phaseData && phaseData.entries) {
            const phaseDays = phaseData.entries.reduce((total, entry) => {
              if (entry.completionDate) {
                const start = entry.startDate ? new Date(entry.startDate) : new Date(sagach.processStartDate || sagach.lastUpdated)
                const end = new Date(entry.completionDate)
                return total + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
              }
              return total
            }, 0)
            
            phaseTotals[phase] = (phaseTotals[phase] || 0) + phaseDays
            phaseCounts[phase] = (phaseCounts[phase] || 0) + 1
          }
        })
      }
    })

    const averageDaysPerPhase: { [key: number]: number } = {}
    Object.keys(phaseTotals).forEach(phase => {
      const phaseNum = parseInt(phase)
      averageDaysPerPhase[phaseNum] = phaseCounts[phaseNum] > 0 
        ? Math.round((phaseTotals[phaseNum] / phaseCounts[phaseNum]) * 10) / 10 
        : 0
    })

    // Calculate filtered average implementation days
    const totalImplementationDays = completedSagachim.reduce((total, sagach) => {
      if (sagach.processStartDate && sagach.completionDate) {
        const start = new Date(sagach.processStartDate)
        const end = new Date(sagach.completionDate)
        return total + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      }
      return total
    }, 0)
    
    const averageImplementationDays = completedSagachim.length > 0 
      ? Math.round((totalImplementationDays / completedSagachim.length) * 10) / 10 
      : 0

     return {
       averageDaysPerPhase,
       averageImplementationDays,
       totalCompleted: completedSagachim.length,
       overallAverageImplementationDays,
       overallAverageDaysPerPhase: overallAverageDaysPerPhase,
       overallTotalCompleted: allCompletedSagachim.length
     }
  }

  // Helper function to get color based on comparison
  const getComparisonColor = (current: number, overall: number): string => {
    const diff = Math.abs(current - overall)
    const tolerance = 0.5 // Tolerance for "same" values
    
    if (diff <= tolerance) {
      return '#FF9800' // Orange for same
    } else if (current < overall) {
      return '#4CAF50' // Green for better (lower)
    } else {
      return '#F44336' // Red for worse (higher)
    }
  }

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
        טוען אנליטיקות...
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
        שגיאה בטעינת האנליטיקות: {error}
      </div>
    )
  }

  const analytics = calculateAnalytics()

  return (
    <main className="app-main" style={{
      display: 'flex', 
      flexDirection: 'column', 
      direction: 'rtl', 
      fontFamily: 'Segoe UI, sans-serif', 
      height: '100vh', 
      overflow: 'auto', 
      width: '100%',
      padding: '20px'
    }}>
      
      {/* Custom Scrollbar Styles */}
      <style>
        {`
          .analytics-scroll::-webkit-scrollbar {
            width: 8px;
          }
          
          .analytics-scroll::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 4px;
          }
          
          .analytics-scroll::-webkit-scrollbar-thumb {
            background: rgba(76, 175, 80, 0.6);
            border-radius: 4px;
            transition: background 0.3s ease;
          }
          
          .analytics-scroll::-webkit-scrollbar-thumb:hover {
            background: rgba(76, 175, 80, 0.8);
          }
          
          /* For Firefox */
          .analytics-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(76, 175, 80, 0.6) rgba(255, 255, 255, 0.1);
          }
        `}
      </style>

      {/* Title Section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '32px',
        padding: '16px 0',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <span style={{
          fontSize: '32px',
          fontWeight: '700',
          color: 'var(--text)',
          margin: '0 0 8px 0',
          textAlign: 'center'
        }}>אנליטיקות - הכנסות סג"חים</span>
        <span style={{
          fontSize: '16px',
          color: 'var(--muted)',
          margin: '0 0 16px 0',
          textAlign: 'center'
        }}> ניתוח מפורט של תהליכי הכנסת סג"חים עד היום</span>
        
        {/* Summary Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          width: '100%',
          maxWidth: '800px',
          marginTop: '16px'
        }}>
           {/* Average Implementation Days */}
           <div style={{
             background: 'linear-gradient(135deg, rgba(76,175,80,0.15), rgba(46,125,50,0.10))',
             border: '1px solid rgba(76,175,80,0.3)',
             borderRadius: '12px',
             padding: '20px',
             textAlign: 'center'
           }}>
             <div style={{
               fontSize: '32px',
               fontWeight: '700',
               color: '#4CAF50',
               marginBottom: '8px'
             }}>
               {analytics.overallAverageImplementationDays}
             </div>
             <div style={{
               fontSize: '20px',
               color: 'var(--muted)',
               marginBottom: '4px'
             }}>
               ממוצע ימים למבצוע סג"ח
             </div>
           </div>

           {/* Total Completed */}
           <div style={{
             background: 'linear-gradient(135deg, rgba(33,150,243,0.15), rgba(21,101,192,0.10))',
             border: '1px solid rgba(33,150,243,0.3)',
             borderRadius: '12px',
             padding: '20px',
             textAlign: 'center'
           }}>
             <div style={{
               fontSize: '32px',
               fontWeight: '700',
               color: '#2196F3',
               marginBottom: '8px'
             }}>
               {analytics.overallTotalCompleted}
             </div>
             <div style={{
               fontSize: '20px',
               color: 'var(--muted)',
               marginBottom: '4px'
             }}>
               סה"כ סג"חים שמובצעו
             </div>
            
           </div>
        </div>

        {/* Filter Controls */}
        <div style={{
          display: 'flex',
          gap: '16px',
          justifyContent: 'center',
          flexWrap: 'wrap',
          alignItems: 'center',
          width: '100%',
          marginTop: '24px'
        }}>
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
        </div>
      </div>

      {/* Analytics Content */}
      <div className="analytics-scroll" style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '24px',
        width: '100%',
        maxHeight: 'calc(100vh - 300px)',
        overflowY: 'auto',
        padding: '0 20px'
      }}>
        
        {/* Filter Summary - Only show when filters are active */}
        {(selectedProvider || selectedArena) && (
          <div style={{
            minWidth: '280px',
            maxWidth: '320px',
            height: 'fit-content',
            textAlign: 'right',
            direction: 'rtl',
            marginLeft: '120px'
          }}>
            
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--text)'
            }}>
                <span style={{ fontSize: '26px', fontWeight: '700', color: 'var(--text)', marginBottom: '20px', textAlign: 'center', borderBottom: '2px solid rgba(255,255,255,0.1)', padding: '8px 0'}}>פלטורים פעילים</span>
              {selectedProvider && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <span style={{ color: 'white', fontWeight: '600', fontSize: '26px'}}>ספק</span>
                <div
                  style={{
                    color: 'rgb(33, 150, 243)',
                    fontWeight: '600',
                    fontSize: '40px',
                    marginTop: '16px'
                  }}
                >
                  {selectedProvider}
                </div>
              </div>
              )}
                {selectedArena && (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px'}}>
                    <span style={{ color: 'white', fontWeight: '600', fontSize: '26px'}}>זירה</span>
                    <div style={{ color: 'rgb(33, 150, 243)', fontWeight: '600', fontSize: '40px', marginTop: '16px'}}>
                        {selectedArena}
                    </div>
                    </div>
                )}
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px'}}>
                     <span style={{ color: 'white', fontWeight: '600', fontSize: '26px'}}>סג"חים שמובצעו</span>
                     <div style={{ color: 'rgb(76, 175, 80)', fontWeight: '600', fontSize: '40px', marginTop: '16px'}}>
                         {analytics.totalCompleted}
                     </div>
                     <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '400', fontSize: '18px', marginTop: '8px' }}>
                         {sagachimStatus ? Math.round((analytics.totalCompleted / sagachimStatus.filter(item => item.processStatus === 7).length) * 100) : 0}% מכלל הסג"חים
                     </div>
                     </div>
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px'}}>
                     <span style={{ color: 'white', fontWeight: '600', fontSize: '26px' }}>ממוצע ימים למבצוע</span>
                     <div style={{ color: getComparisonColor(analytics.averageImplementationDays, analytics.overallAverageImplementationDays), fontWeight: '600', fontSize: '40px',marginTop: '16px' }}>
                         {analytics.averageImplementationDays}
                     </div>
                     <div style={{ color: 'rgba(255,255,255,0.7)', fontWeight: '400', fontSize: '18px', marginTop: '8px' }}>
                         ממוצע כולל: {analytics.overallAverageImplementationDays} ימים
                     </div>
                     </div>
            </div>
          </div>
          </div>
        )}
        
        {/* Phase Averages - Plain Text */}
        {Object.keys(analytics.averageDaysPerPhase).length > 0 && (
          <div style={{
            minWidth: '400px',
            maxWidth: '500px',
            height: 'fit-content',
            textAlign: 'right',
            direction: 'rtl'
          }}>
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: 'var(--text)',
              marginBottom: '20px',
              textAlign: 'center',
              borderBottom: '2px solid rgba(255,255,255,0.1)', padding: '8px 0'
            }}>
              ממוצע ימים בפילוח לשלבים
            </div>
            
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              fontSize: '16px',
              color: 'var(--text)'
            }}>
              {Object.entries(analytics.averageDaysPerPhase)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([phase, days]) => {
                  const phaseNum = parseInt(phase)
                  const overallAverage = analytics.overallAverageDaysPerPhase[phaseNum] || 0
                  const comparisonColor = getComparisonColor(days, overallAverage)
                  
                  return (
                    <div key={phase} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 0',
                      borderBottom: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '4px' }}>
                          שלב {phase}: {PROCESS_STEPS[parseInt(phase) - 1]}
                        </div>
                        <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                          ממוצע כולל: {overallAverage} ימים
                        </div>
                      </div>
                      <div style={{
                        color: comparisonColor,
                        fontWeight: '700',
                        fontSize: '20px'
                      }}>
                        {days} ימים
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

      </div>

      {/* Summary */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'rgba(255,255,255,0.05)',
        borderRadius: '12px',
        textAlign: 'center',
        margin: '24px 20px 0 20px'
      }}>
        <div style={{
          fontSize: '14px',
          color: 'var(--muted)'
        }}>
          האנליטיקות מבוססות על סג"חים שהוכנסו למערכת ומובצעו
        </div>
      </div>

    </main>
  )
}
