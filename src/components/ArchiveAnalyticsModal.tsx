import React from 'react'
import { SagachimStatusItem, ArenaOption } from '../contexts/SagachDataContext'

// Custom date formatting function to use '/' instead of '.'
const formatDateWithSlashes = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

interface ArchiveAnalyticsModalProps {
  isOpen: boolean
  onClose: () => void
  sagachim: SagachimStatusItem[]
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

export const ArchiveAnalyticsModal = ({ isOpen, onClose, sagachim }: ArchiveAnalyticsModalProps) => {
  if (!isOpen) return null

  // Calculate statistics
  const calculateAnalytics = () => {
    const completedSagachim = sagachim.filter(item => item.processStatus === 7)
    
    if (completedSagachim.length === 0) {
      return {
        averageDaysPerPhase: {},
        averageImplementationDays: 0,
        providerBreakdown: {},
        arenaBreakdown: {}
      }
    }

    // Calculate average days per phase
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

    // Calculate average implementation days
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

    // Provider breakdown
    const providerBreakdown: { [key: string]: { count: number, avgDays: number } } = {}
    completedSagachim.forEach(sagach => {
      const provider = sagach.provider
      if (!providerBreakdown[provider]) {
        providerBreakdown[provider] = { count: 0, avgDays: 0 }
      }
      providerBreakdown[provider].count++
      
      if (sagach.processStartDate && sagach.completionDate) {
        const start = new Date(sagach.processStartDate)
        const end = new Date(sagach.completionDate)
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        providerBreakdown[provider].avgDays += days
      }
    })

    // Calculate average days per provider
    Object.keys(providerBreakdown).forEach(provider => {
      if (providerBreakdown[provider].count > 0) {
        providerBreakdown[provider].avgDays = Math.round((providerBreakdown[provider].avgDays / providerBreakdown[provider].count) * 10) / 10
      }
    })

    // Arena breakdown
    const arenaBreakdown: { [key: string]: { count: number, avgDays: number } } = {}
    completedSagachim.forEach(sagach => {
      sagach.arena.forEach(arena => {
        if (!arenaBreakdown[arena]) {
          arenaBreakdown[arena] = { count: 0, avgDays: 0 }
        }
        arenaBreakdown[arena].count++
        
        if (sagach.processStartDate && sagach.completionDate) {
          const start = new Date(sagach.processStartDate)
          const end = new Date(sagach.completionDate)
          const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
          arenaBreakdown[arena].avgDays += days
        }
      })
    })

    // Calculate average days per arena
    Object.keys(arenaBreakdown).forEach(arena => {
      if (arenaBreakdown[arena].count > 0) {
        arenaBreakdown[arena].avgDays = Math.round((arenaBreakdown[arena].avgDays / arenaBreakdown[arena].count) * 10) / 10
      }
    })

    return {
      averageDaysPerPhase,
      averageImplementationDays,
      providerBreakdown,
      arenaBreakdown,
      totalCompleted: completedSagachim.length
    }
  }

  const analytics = calculateAnalytics()

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px',
      direction: 'rtl',
      fontFamily: 'Segoe UI, sans-serif'
    }} onClick={onClose}>
      <div style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0.08))',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: '20px',
        padding: '32px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(12px)'
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
          borderBottom: '1px solid rgba(255,255,255,0.2)',
          paddingBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: 'var(--text)',
            margin: 0,
            textAlign: 'right'
          }}>
            אנליטיקות ארכיון
          </h2>
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

        {/* Analytics Content */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
          gap: '24px'
        }}>
          
          {/* Average Implementation Days */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(76,175,80,0.15), rgba(46,125,50,0.10))',
            border: '1px solid rgba(76,175,80,0.3)',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text)',
              margin: '0 0 16px 0'
            }}>
             ממוצע ימים למבצוע סג"ח
            </h3>
            <div style={{
              fontSize: '36px',
              fontWeight: '700',
              color: '#4CAF50',
              marginBottom: '8px'
            }}>
              {analytics.averageImplementationDays}
            </div>
            <div style={{
              fontSize: '14px',
              color: 'var(--muted)'
            }}>
              ימים
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--muted)',
              marginTop: '8px'
            }}>
              מתוך {analytics.totalCompleted} סג"חים מובצעים
            </div>
          </div>

          {/* Average Days Per Phase */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(33,150,243,0.15), rgba(21,101,192,0.10))',
            border: '1px solid rgba(33,150,243,0.3)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text)',
              margin: '0 0 16px 0',
              textAlign: 'center'
            }}>
              ממוצע ימים לכל שלב
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px'
            }}>
              {Object.entries(analytics.averageDaysPerPhase)
                .sort(([a], [b]) => parseInt(a) - parseInt(b))
                .map(([phase, days]) => (
                <div key={phase} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  <span style={{ color: 'var(--text)' }}>
                    שלב {phase}: {PROCESS_STEPS[parseInt(phase) - 1]}
                  </span>
                  <span style={{ 
                    color: '#2196F3',
                    fontWeight: '600',
                    fontSize: '16px'
                  }}>
                    {days} ימים
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Provider Breakdown */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(255,152,0,0.15), rgba(245,124,0,0.10))',
            border: '1px solid rgba(255,152,0,0.3)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text)',
              margin: '0 0 16px 0',
              textAlign: 'center'
            }}>
              פילוח לפי ספק
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {Object.entries(analytics.providerBreakdown)
                .sort(([,a], [,b]) => b.count - a.count)
                .map(([provider, data]) => (
                <div key={provider} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  <div>
                    <div style={{ color: 'var(--text)', fontWeight: '600' }}>
                      {provider}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
                      {data.count} סג"חים
                    </div>
                  </div>
                  <div style={{ 
                    color: '#FF9800',
                    fontWeight: '600',
                    fontSize: '16px'
                  }}>
                    {data.avgDays} ימים
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Arena Breakdown */}
          <div style={{
            background: 'linear-gradient(135deg, rgba(156,39,176,0.15), rgba(123,31,162,0.10))',
            border: '1px solid rgba(156,39,176,0.3)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: 'var(--text)',
              margin: '0 0 16px 0',
              textAlign: 'center'
            }}>
              פילוח לפי זירה
            </h3>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              maxHeight: '300px',
              overflowY: 'auto'
            }}>
              {Object.entries(analytics.arenaBreakdown)
                .sort(([,a], [,b]) => b.count - a.count)
                .map(([arena, data]) => (
                <div key={arena} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '8px',
                  fontSize: '14px'
                }}>
                  <div>
                    <div style={{ color: 'var(--text)', fontWeight: '600' }}>
                      {arena}
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '12px' }}>
                      {data.count} סג"חים
                    </div>
                  </div>
                  <div style={{ 
                    color: '#9C27B0',
                    fontWeight: '600',
                    fontSize: '16px'
                  }}>
                    {data.avgDays} ימים
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Summary */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '14px',
            color: 'var(--muted)'
          }}>
            סה"כ {analytics.totalCompleted} סג"חים מובצעים נכללו בחישוב האנליטיקות
          </div>
        </div>

      </div>
    </div>
  )
}
