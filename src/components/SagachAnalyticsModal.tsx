import React, { useState, useMemo } from 'react'

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
  arena: string[]
  priority: string
  sagachType?: string
  processStatus: 1 | 2 | 3 | 4 | 5 | 6 | 7
  processStartDate?: string
  estimatedCompletion?: string
  contactPerson?: string
  notes?: string
  statusUpdates?: StatusUpdate[]
  phaseData?: {
    [key: number]: {
      entries?: {
        startDate: string
        completionDate?: string
        timeSpentDays: number
      }[]
    }
  }
  notifications?: boolean
  notificationMethod?: 'email' | 'whatsapp'
  notificationFrequency?: 'daily' | 'weekly' | 'status_change'
  completionDate?: string
  notificationSubscribers?: any[]
  attachments?: FileAttachment[]
}

interface SagachAnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  sagach: SagachimStatusItem | null
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

const PRIORITY_LABELS: Record<string, string> = {
  'נמוך': 'נמוך',
  'בינוני': 'בינוני',
  'גבוה': 'גבוה',
  'TOP': 'TOP'
}

const PRIORITY_COLORS: Record<string, string> = {
  'נמוך': '#4CAF50',
  'בינוני': '#FF9800',
  'גבוה': '#F44336',
  'TOP': '#9C27B0'
}

const formatDateWithSlashes = (date: Date): string => {
  // Check if date is valid
  if (!date || isNaN(date.getTime())) {
    return 'תאריך לא זמין'
  }
  
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

const formatTimestamp = (timestamp: string): string => {
  if (!timestamp) return 'תאריך לא זמין'
  
  try {
    const date = new Date(timestamp)
    if (isNaN(date.getTime())) {
      return 'תאריך לא זמין'
    }
    return formatDateWithSlashes(date)
  } catch {
    return 'תאריך לא זמין'
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export const SagachAnalyticsModal = ({ isOpen, onClose, sagach }: SagachAnalyticsModalProps) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'chat' | 'files'>('overview')

  // Calculate total days from start to completion
  const totalDays = useMemo(() => {
    if (!sagach?.processStartDate || !sagach?.completionDate) return 0
    const start = new Date(sagach.processStartDate)
    const end = new Date(sagach.completionDate)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  }, [sagach])

  // Calculate phase history with back-and-forth movements
  const phaseHistory = useMemo(() => {
    if (!sagach) return []
    
    const history: Array<{
      phase: number
      phaseName: string
      startDate: string
      endDate?: string
      duration: number
      isBacktrack: boolean
    }> = []

    // Try to use phaseData first if available
    if (sagach.phaseData) {
      Object.entries(sagach.phaseData).forEach(([phaseNum, phaseInfo]) => {
        const phase = parseInt(phaseNum)
        if (phase >= 1 && phase <= 7 && phaseInfo.entries) {
          phaseInfo.entries.forEach(entry => {
            if (entry.timeSpentDays > 0) {
              history.push({
                phase: phase,
                phaseName: PROCESS_STEPS[phase - 1],
                startDate: entry.startDate,
                endDate: entry.completionDate || entry.startDate,
                duration: entry.timeSpentDays,
                isBacktrack: false
              })
            }
          })
        }
      })
      
      if (history.length > 0) {
        return history
      }
    }

    // Fallback to status updates if phaseData is not available
    if (!sagach.statusUpdates || sagach.statusUpdates.length === 0) {
      const startDate = sagach.processStartDate || sagach.lastUpdated
      const endDate = sagach.completionDate || sagach.lastUpdated
      const duration = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24))
      
      if (duration > 0) {
        history.push({
          phase: sagach.processStatus,
          phaseName: PROCESS_STEPS[sagach.processStatus - 1],
          startDate: startDate,
          endDate: endDate,
          duration: duration,
          isBacktrack: false
        })
      }
      
      return history
    }

    // Sort status updates by timestamp
    const sortedUpdates = [...sagach.statusUpdates]
      .filter(update => update.type === 'status_change' && update.oldStatus && update.newStatus)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

    // Start from the first phase and track through all changes
    let currentPhase = 1
    let currentStartDate = sagach.processStartDate || sagach.lastUpdated

    for (let i = 0; i < sortedUpdates.length; i++) {
      const update = sortedUpdates[i]
      
      if (update.oldStatus && update.newStatus) {
        // Calculate duration for the current phase
        const endDate = update.timestamp
        const startDate = new Date(currentStartDate)
        const endDateObj = new Date(endDate)
        const duration = Math.ceil((endDateObj.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        
        // Only add to history if duration is positive
        if (duration > 0) {
          history.push({
            phase: update.oldStatus,
            phaseName: PROCESS_STEPS[update.oldStatus - 1],
            startDate: currentStartDate,
            endDate: endDate,
            duration: duration,
            isBacktrack: update.oldStatus > update.newStatus
          })
        }

        // Start new phase
        currentPhase = update.newStatus
        currentStartDate = endDate
      }
    }

    // Add final phase if it has duration
    const endDate = sagach.completionDate || sagach.lastUpdated
    const startDate = new Date(currentStartDate)
    const endDateObj = new Date(endDate)
    const duration = Math.ceil((endDateObj.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
    
    if (duration > 0) {
      history.push({
        phase: currentPhase,
        phaseName: PROCESS_STEPS[currentPhase - 1],
        startDate: currentStartDate,
        endDate: endDate,
        duration: duration,
        isBacktrack: false
      })
    }

    return history
  }, [sagach])

  // Calculate phase statistics
  const phaseStats = useMemo(() => {
    const stats: Record<number, { totalDays: number; visits: number; avgDays: number; returns: number }> = {}
    
    // Initialize all phases with 0 values
    for (let i = 1; i <= 7; i++) {
      stats[i] = { totalDays: 0, visits: 0, avgDays: 0, returns: 0 }
    }
    
    // Count visits per phase
    const phaseVisitCounts: Record<number, number> = {}
    phaseHistory.forEach(entry => {
      if (entry.phase >= 1 && entry.phase <= 7) {
        stats[entry.phase].totalDays += entry.duration || 0
        stats[entry.phase].visits += 1
        
        // Count total visits per phase
        phaseVisitCounts[entry.phase] = (phaseVisitCounts[entry.phase] || 0) + 1
      }
    })

    // Calculate returns (visits > 1) and averages
    Object.keys(stats).forEach(phase => {
      const phaseNum = parseInt(phase)
      const totalVisits = phaseVisitCounts[phaseNum] || 0
      
      if (totalVisits > 0) {
        stats[phaseNum].avgDays = stats[phaseNum].totalDays / stats[phaseNum].visits
        // Returns = total visits - 1 (first visit doesn't count as a return)
        stats[phaseNum].returns = Math.max(0, totalVisits - 1)
      } else {
        stats[phaseNum].avgDays = 0
        stats[phaseNum].returns = 0
      }
    })

    return stats
  }, [phaseHistory])

  // Sort status updates by timestamp for chat
  const sortedStatusUpdates = useMemo(() => {
    if (!sagach?.statusUpdates) return []
    return [...sagach.statusUpdates].sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }, [sagach])

  if (!isOpen || !sagach) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
      fontFamily: 'Segoe UI, sans-serif'
    }}>
      <div style={{
        background: 'var(--panel)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '1400px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(20px)',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 32px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: 'var(--text)',
              margin: '0 0 8px 0',
              textAlign: 'right'
            }}>
              אנליטיקות: {sagach.name}
            </h2>
            <p style={{
              fontSize: '14px',
              color: 'var(--muted)',
              margin: '0',
              textAlign: 'right'
            }}>
              {sagach.provider} • {sagach.arena.join(', ')}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '24px',
              padding: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
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

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          direction: 'rtl'
        }}>
          {[
            { id: 'overview', label: 'סקירה כללית' },
            { id: 'timeline', label: 'ציר זמן' },
            { id: 'chat', label: 'עדכוני סטטוס' },
            { id: 'files', label: 'קבצים' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                padding: '16px 24px',
                background: 'none',
                border: 'none',
                color: activeTab === tab.id ? 'var(--text)' : 'var(--muted)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                borderBottom: activeTab === tab.id ? '2px solid #4CAF50' : '2px solid transparent',
                transition: 'all 0.2s ease',
                direction: 'rtl'
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px 32px'
        }}>
          {activeTab === 'overview' && (
            <div style={{ direction: 'rtl' }}>
              {/* Key Metrics */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                marginBottom: '32px'
              }}>
                <div style={{
                  background: 'rgba(76,175,80,0.1)',
                  border: '1px solid rgba(76,175,80,0.3)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#4CAF50', marginBottom: '8px' }}>
                    {totalDays}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                    ימים כוללים
                  </div>
                </div>
                
                <div style={{
                  background: 'rgba(33,150,243,0.1)',
                  border: '1px solid rgba(33,150,243,0.3)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#2196F3', marginBottom: '8px' }}>
                    {phaseHistory.length}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                    שלבים בתהליך
                  </div>
                </div>

                 <div style={{
                   background: 'rgba(255,152,0,0.1)',
                   border: '1px solid rgba(255,152,0,0.3)',
                   borderRadius: '12px',
                   padding: '20px',
                   textAlign: 'center'
                 }}>
                   <div style={{ fontSize: '32px', fontWeight: '700', color: '#FF9800', marginBottom: '8px' }}>
                     {Object.values(phaseStats).reduce((sum, stat) => sum + stat.returns, 0)}
                   </div>
                   <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                     חזרות לשלבים
                   </div>
                 </div>

                <div style={{
                  background: 'rgba(156,39,176,0.1)',
                  border: '1px solid rgba(156,39,176,0.3)',
                  borderRadius: '12px',
                  padding: '20px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '32px', fontWeight: '700', color: '#9C27B0', marginBottom: '8px' }}>
                    {sagach.statusUpdates?.length || 0}
                  </div>
                  <div style={{ fontSize: '14px', color: 'var(--muted)' }}>
                    עדכוני סטטוס
                  </div>
                </div>
              </div>


              {/* Phase Statistics */}
              <div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: 'var(--text)',
                  margin: '0 0 16px 0',
                  textAlign: 'right'
                }}>
                  סטטיסטיקות שלבים
                </h3>
                <div style={{
                  display: 'grid',
                  gap: '12px'
                }}>
                  {Object.entries(phaseStats)
                    .filter(([phase, stats]) => stats.visits > 0)
                    .map(([phase, stats]) => (
                    <div key={phase} style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '16px',
                          fontWeight: '600',
                          color: 'var(--text)',
                          marginBottom: '4px'
                        }}>
                          {PROCESS_STEPS[parseInt(phase) - 1]}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--muted)'
                        }}>
                          {stats.returns} חזרה{stats.returns > 1 ? 'ות' : ''}
                        </div>
                      </div>
                      <div style={{ textAlign: 'left' }}>
                        <div style={{
                          fontSize: '18px',
                          fontWeight: '700',
                          color: '#4CAF50'
                        }}>
                          {stats.totalDays} ימים
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--muted)'
                        }}>
                          ממוצע: {stats.avgDays.toFixed(1)} ימים
                        </div>
                      </div>
                    </div>
                  ))}
                  {Object.values(phaseStats).every(stats => stats.visits === 0) && (
                    <div style={{
                      textAlign: 'center',
                      padding: '40px',
                      color: 'var(--muted)',
                      fontSize: '14px'
                    }}>
                      אין נתונים זמינים על שלבי התהליך
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'timeline' && (
            <div style={{ direction: 'rtl' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text)',
                margin: '0 0 24px 0',
                textAlign: 'right'
              }}>
                ציר זמן מפורט
              </h3>
               <div style={{
                 position: 'relative',
                 paddingRight: '20px'
               }}>
                 {(() => {
                   const sortedPhaseHistory = phaseHistory.sort((a, b) => {
                     // First sort by completion date (endDate or startDate if no endDate)
                     const aEndDate = new Date(a.endDate || a.startDate)
                     const bEndDate = new Date(b.endDate || b.startDate)
                     const dateDiff = aEndDate.getTime() - bEndDate.getTime()
                     
                     // If dates are the same, sort by phase number (process order)
                     if (dateDiff === 0) {
                       return a.phase - b.phase
                     }
                     
                     return dateDiff
                   })
                   
                   // Track first occurrence of each phase
                   const phaseFirstOccurrence = new Set<number>()
                   
                   return sortedPhaseHistory.map((entry, index) => {
                     const isFirstOccurrence = !phaseFirstOccurrence.has(entry.phase)
                     if (isFirstOccurrence) {
                       phaseFirstOccurrence.add(entry.phase)
                     }
                     
                     return (
                  <div key={index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    marginBottom: '16px',
                    position: 'relative'
                  }}>
                     {/* Return arrow for non-first occurrences */}
                     {!isFirstOccurrence && (
                       <div style={{
                         marginLeft: '8px',
                         fontSize: '16px',
                         color: '#FF9800',
                         zIndex: 3,
                         position: 'relative'
                       }}>
                         ↶
                       </div>
                     )}
                     
                     {/* Timeline dot */}
                     <div style={{
                       width: '12px',
                       height: '12px',
                       borderRadius: '50%',
                       background: isFirstOccurrence ? '#4CAF50' : '#FF9800',
                       marginLeft: isFirstOccurrence ? '16px' : '8px',
                       flexShrink: 0,
                       position: 'relative',
                       zIndex: 2
                     }} />
                    
                     {/* Timeline line */}
                     {index < sortedPhaseHistory.length - 1 && (
                      <div style={{
                        position: 'absolute',
                        right: '5px',
                        top: '12px',
                        width: '2px',
                        height: '16px',
                        background: 'rgba(255,255,255,0.2)',
                        zIndex: 1
                      }} />
                    )}

                    {/* Content */}
                    <div style={{
                      flex: 1,
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '16px',
                      marginRight: '8px'
                    }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '8px'
                      }}>
                         <div style={{
                           fontSize: '16px',
                           fontWeight: '600',
                           color: 'var(--text)'
                         }}>
                           {entry.phaseName}
                           {!isFirstOccurrence && (
                             <span style={{
                               fontSize: '12px',
                               color: '#FF9800',
                               marginRight: '8px'
                             }}>
                               (חזרה)
                             </span>
                           )}
                         </div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '700',
                          color: '#4CAF50'
                        }}>
                          {entry.duration} ימים
                        </div>
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--muted)',
                        display: 'flex',
                        gap: '16px'
                      }}>
                        <span>התחלה: {formatDateWithSlashes(new Date(entry.startDate))}</span>
                        {entry.endDate && (
                          <span>סיום: {formatDateWithSlashes(new Date(entry.endDate))}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  )
                   })
                 })()}
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div style={{ direction: 'rtl' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text)',
                margin: '0 0 24px 0',
                textAlign: 'right'
              }}>
                עדכוני סטטוס
              </h3>
              <div style={{
                maxHeight: '400px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}>
                {sortedStatusUpdates.map((update, index) => (
                  <div key={update.id || index} style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '12px',
                    padding: '16px'
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: '600',
                        color: 'var(--text)'
                      }}>
                        {update.author || 'מערכת'}
                      </div>
                       <div style={{
                         fontSize: '12px',
                         color: 'var(--muted)'
                       }}>
                         {formatTimestamp(update.timestamp)}
                       </div>
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: 'var(--text)',
                      lineHeight: '1.5',
                      marginBottom: '8px'
                    }}>
                      {update.message}
                    </div>
                    {update.type === 'status_change' && update.oldStatus && update.newStatus && (
                      <div style={{
                        fontSize: '12px',
                        color: 'var(--muted)',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        display: 'inline-block'
                      }}>
                        {PROCESS_STEPS[update.oldStatus - 1]} → {PROCESS_STEPS[update.newStatus - 1]}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div style={{ direction: 'rtl' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'var(--text)',
                margin: '0 0 24px 0',
                textAlign: 'right'
              }}>
                קבצים רלוונטיים
              </h3>
              {sagach.attachments && sagach.attachments.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gap: '12px'
                }}>
                  {sagach.attachments.map((file) => (
                    <div key={file.id} style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      padding: '16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'var(--text)',
                          marginBottom: '4px'
                        }}>
                          {file.name}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: 'var(--muted)'
                        }}>
                          {formatFileSize(file.size)} • {formatDateWithSlashes(new Date(file.uploadDate))}
                        </div>
                      </div>
                      <button
                        style={{
                          padding: '8px 16px',
                          background: 'rgba(76,175,80,0.8)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
                          fontSize: '12px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(76,175,80,1)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(76,175,80,0.8)'
                        }}
                      >
                        הורד
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: 'var(--muted)'
                }}>
                  אין קבצים רלוונטיים
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
