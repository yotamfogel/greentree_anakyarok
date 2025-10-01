import React from 'react'
import { useSagachData } from '../contexts/SagachDataContext'

interface DatabaseStatusProps {
  showDetails?: boolean
}

export const DatabaseStatus: React.FC<DatabaseStatusProps> = ({ showDetails = false }) => {
  const { useDatabase, isDatabaseConnected } = useSagachData()

  if (!showDetails) {
    return null
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: useDatabase ? (isDatabaseConnected ? '#e8f5e8' : '#fff3cd') : '#f8f9fa',
      border: `1px solid ${useDatabase ? (isDatabaseConnected ? '#28a745' : '#ffc107') : '#dee2e6'}`,
      borderRadius: '4px',
      padding: '8px 12px',
      fontSize: '12px',
      zIndex: 1000,
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        Storage: {useDatabase ? 'PostgreSQL' : 'LocalStorage'}
      </div>
      {useDatabase && (
        <div style={{ color: isDatabaseConnected ? '#28a745' : '#856404' }}>
          Status: {isDatabaseConnected ? '✅ Connected' : '⚠️ Connection Failed'}
        </div>
      )}
    </div>
  )
}

export default DatabaseStatus
