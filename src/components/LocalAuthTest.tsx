import React, { useState } from 'react'
import { usePermissions } from '../contexts/PermissionContext'

export const LocalAuthTest: React.FC = () => {
  const { user, login, logout, authMode } = usePermissions()
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testAdminLogin = async () => {
    addResult('Testing admin login...')
    try {
      const success = await login('admin', 'admin')
      if (success) {
        addResult('✅ Admin login successful!')
      } else {
        addResult('❌ Admin login failed!')
      }
    } catch (error) {
      addResult(`❌ Admin login failed: ${error}`)
    }
  }

  const testViewerLogin = async () => {
    addResult('Testing viewer login...')
    try {
      const success = await login('viewer', 'viewer')
      if (success) {
        addResult('✅ Viewer login successful!')
      } else {
        addResult('❌ Viewer login failed!')
      }
    } catch (error) {
      addResult(`❌ Viewer login failed: ${error}`)
    }
  }

  const testEditorLogin = async () => {
    addResult('Testing editor login...')
    try {
      const success = await login('editor', 'editor')
      if (success) {
        addResult('✅ Editor login successful!')
      } else {
        addResult('❌ Editor login failed!')
      }
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

  if (authMode !== 'server') {
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
          בדיקת אימות שרת
        </h3>
        <p style={{ color: 'var(--muted)', margin: 0 }}>
          בדיקה זו זמינה רק במצב אימות שרת. מצב נוכחי: {authMode}
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
        בדיקת אימות שרת
      </h3>
      
      <div style={{ marginBottom: '16px' }}>
        <p style={{ margin: '0 0 8px 0', color: 'var(--muted)' }}>
          מצב נוכחי: {authMode} | משתמש: {user ? user.name : 'לא מחובר'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <button
          onClick={testAdminLogin}
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
