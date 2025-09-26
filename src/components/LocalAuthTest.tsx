import React, { useState } from 'react'
import { usePermissions } from '../contexts/PermissionContext'

export const LocalAuthTest: React.FC = () => {
  const { user, login, logout, authMode } = usePermissions()
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testLocalLogin = async () => {
    addResult('Testing local login...')
    try {
      await login({
        name: 'Test User',
        email: 'test@example.com',
        role: 'admin'
      })
      addResult('✅ Local login successful!')
    } catch (error) {
      addResult(`❌ Local login failed: ${error}`)
    }
  }

  const testViewerLogin = async () => {
    addResult('Testing viewer login...')
    try {
      await login({
        name: 'Viewer User',
        email: 'viewer@example.com',
        role: 'viewer'
      })
      addResult('✅ Viewer login successful!')
    } catch (error) {
      addResult(`❌ Viewer login failed: ${error}`)
    }
  }

  const testEditorLogin = async () => {
    addResult('Testing editor login...')
    try {
      await login({
        name: 'Editor User',
        email: 'editor@example.com',
        role: 'editor'
      })
      addResult('✅ Editor login successful!')
    } catch (error) {
      addResult(`❌ Editor login failed: ${error}`)
    }
  }

  const testLogout = () => {
    addResult('Testing logout...')
    try {
      logout()
      addResult('✅ Logout successful!')
    } catch (error) {
      addResult(`❌ Logout failed: ${error}`)
    }
  }

  const clearResults = () => {
    setTestResults([])
  }

  if (authMode !== 'local') {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: 'var(--panel)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        margin: '16px',
        direction: 'rtl'
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: 'var(--text)' }}>
          בדיקת אימות מקומי
        </h3>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          בדיקה זו זמינה רק במצב אימות מקומי. מצב נוכחי: {authMode}
        </p>
      </div>
    )
  }

  return (
    <div style={{
      padding: '16px',
      backgroundColor: 'var(--panel)',
      border: '1px solid var(--border)',
      borderRadius: '8px',
      margin: '16px',
      direction: 'rtl'
    }}>
      <h3 style={{ margin: '0 0 12px 0', color: 'var(--text)' }}>
        בדיקת אימות מקומי
      </h3>
      
      <div style={{ marginBottom: '16px' }}>
        <p style={{ margin: '0 0 8px 0', color: 'var(--muted)' }}>
          מצב נוכחי: {authMode} | משתמש: {user ? user.name : 'לא מחובר'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={testLocalLogin}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--accent)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          התחבר כמנהל
        </button>
        <button
          onClick={testEditorLogin}
          style={{
            padding: '8px 16px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          התחבר כעורך
        </button>
        <button
          onClick={testViewerLogin}
          style={{
            padding: '8px 16px',
            backgroundColor: '#17a2b8',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          התחבר כצופה
        </button>
        <button
          onClick={testLogout}
          style={{
            padding: '8px 16px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          התנתק
        </button>
        <button
          onClick={clearResults}
          style={{
            padding: '8px 16px',
            backgroundColor: 'var(--muted)',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          נקה תוצאות
        </button>
      </div>

      {testResults.length > 0 && (
        <div style={{
          backgroundColor: 'var(--bg)',
          border: '1px solid var(--border)',
          borderRadius: '4px',
          padding: '12px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--text)' }}>
            תוצאות בדיקה:
          </h4>
          {testResults.map((result, index) => (
            <div
              key={index}
              style={{
                fontSize: '12px',
                fontFamily: 'monospace',
                marginBottom: '4px',
                color: result.includes('✅') ? 'var(--success)' : result.includes('❌') ? 'var(--error)' : 'var(--text)'
              }}
            >
              {result}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
