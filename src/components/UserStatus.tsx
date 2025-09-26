import React, { useState } from 'react'
import { usePermissions, getRoleDisplayName } from '../contexts/PermissionContext'
import { getAuthModeDisplayName } from '../config/authConfig'

export const UserStatus: React.FC = () => {
  const { user, logout, canManageUsers, authMode } = usePermissions()
  const [showDropdown, setShowDropdown] = useState(false)

  if (!user) {
    return null
  }

  const handleLogout = () => {
    logout()
    setShowDropdown(false)
  }

  return (
    <div style={{ position: 'relative', direction: 'rtl' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 14px',
          maxHeight: '35px',
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          color: 'var(--text)',
          fontSize: '10px',
          fontFamily: 'Segoe UI, Arial, sans-serif',
          cursor: 'pointer',
          transition: 'all 0.2s',
          direction: 'rtl'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--border)'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = 'var(--panel)'
        }}
      >
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: 'var(--accent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '14px',
          fontWeight: '600'
        }}>
          {user.name.charAt(0).toUpperCase()}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: '600', fontSize: '12px' }}>
            {user.name}
          </div>
          <div style={{ 
            fontSize: '10px', 
            color: 'var(--muted)',
            marginTop: '2px'
          }}>
            {getRoleDisplayName(user.role)}
          </div>
        </div>
        <div style={{
          fontSize: '12px',
          color: 'var(--muted)',
          transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
          transition: 'transform 0.2s'
        }}>
          ▼
        </div>
      </button>

      {showDropdown && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '4px',
          backgroundColor: 'var(--panel)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 1000,
          minWidth: '200px',
          direction: 'rtl'
        }}>
          <div style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)'
          }}>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: 'var(--text)',
              marginBottom: '4px'
            }}>
              {user.name}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--muted)',
              marginBottom: '2px'
            }}>
              {user.email}
            </div>
            <div style={{
              fontSize: '12px',
              color: 'var(--accent)',
              fontWeight: '500'
            }}>
              {getRoleDisplayName(user.role)}
            </div>
            <div style={{
              fontSize: '10px',
              color: 'var(--muted)',
              marginTop: '2px'
            }}>
              {getAuthModeDisplayName(authMode)}
            </div>
          </div>

          <div style={{ padding: '8px' }}>
            {canManageUsers() && (
              <button
                onClick={() => {
                  // TODO: Open user management modal
                  window.dispatchEvent(new CustomEvent('excel:status', { 
                    detail: { 
                      message: 'פונקציונליות ניהול משתמשים תהיה זמינה בקרוב', 
                      type: 'info', 
                      durationMs: 3000 
                    } 
                  }))
                  setShowDropdown(false)
                }}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--accent)',
                  fontSize: '14px',
                  fontFamily: 'Segoe UI, Arial, sans-serif',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s',
                  textAlign: 'right',
                  direction: 'rtl',
                  marginBottom: '8px'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(124, 192, 255, 0.1)'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                👥 ניהול משתמשים
              </button>
            )}
            
            <button
              onClick={handleLogout}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'Segoe UI, Arial, sans-serif',
                cursor: 'pointer',
                borderRadius: '8px',
                transition: 'background-color 0.2s',
                textAlign: 'right',
                direction: 'rtl'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(255, 0, 0, 0.1)'
                e.currentTarget.style.color = '#ff4444'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--text)'
              }}
            >
              התנתק
            </button>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  )
}
