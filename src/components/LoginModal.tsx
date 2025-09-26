import React, { useState } from 'react'
import { usePermissions, UserRole, getRoleDisplayName } from '../contexts/PermissionContext'
import { getAuthMode, getAuthModeDisplayName, canSwitchAuthMode, setAuthMode } from '../config/authConfig'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose }) => {
  const { login, loginWithAdfs, isLoading, authMode, canSwitchAuthMode: canSwitch } = usePermissions()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'viewer' as UserRole
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'אנא הזן שם משתמש', 
          type: 'error', 
          durationMs: 3000 
        } 
      }))
      return
    }

    try {
      // Check for demo admin account
      if (formData.name.trim() === 'admin' && formData.password === 'admin') {
        await login({
          name: 'מנהל מערכת',
          email: 'admin@system.com',
          role: 'admin'
        })
        onClose()
        setFormData({ name: '', email: '', password: '', role: 'viewer' })
        return
      }

      await login(formData) 
      onClose()
      // Reset form
      setFormData({ name: '', email: '', password: '', role: 'viewer' })
    } catch (error) {
      console.error('Login failed:', error)
    }
  }

  const handleAdfsLogin = async () => {
    try {
      await loginWithAdfs()
      onClose()
    } catch (error) {
      console.error('ADFS login failed:', error)
    }
  }

  const handleAuthModeSwitch = () => {
    const newMode = authMode === 'local' ? 'adfs' : 'local'
    setAuthMode(newMode)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  if (!isOpen) return null

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      fontFamily: 'Segoe UI, Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'var(--panel)',
        borderRadius: '12px',
        padding: '32px',
        maxWidth: '400px',
        width: '90%',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        border: '1px solid var(--border)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <div style={{ direction: 'rtl' }}>
            <h2 style={{
              margin: 0,
              color: 'var(--text)',
              fontSize: '24px',
              fontWeight: '600'
            }}>
              התחברות למערכת
            </h2>
            <div style={{
              fontSize: '14px',
              color: 'var(--muted)',
              marginTop: '4px'
            }}>
              מצב אימות: {getAuthModeDisplayName(authMode)}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--text)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--muted)'}
          >
            ×
          </button>
        </div>

        {/* Authentication Mode Switcher */}
        {canSwitch && (
          <div style={{
            marginBottom: '20px',
            textAlign: 'center',
            direction: 'rtl'
          }}>
            <button
              type="button"
              onClick={handleAuthModeSwitch}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid var(--accent)',
                backgroundColor: 'transparent',
                color: 'var(--accent)',
                fontSize: '12px',
                fontFamily: 'Segoe UI, Arial, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--accent)'
                e.currentTarget.style.color = 'white'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--accent)'
              }}
            >
              עבור ל{authMode === 'local' ? 'אימות ADFS' : 'אימות מקומי'}
            </button>
          </div>
        )}

        {/* ADFS Authentication */}
        {authMode === 'adfs' && (
          <div style={{ direction: 'rtl', textAlign: 'center', marginBottom: '20px' }}>
            <button
              type="button"
              onClick={handleAdfsLogin}
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isLoading ? 'var(--muted)' : '#0078d4',
                color: 'white',
                fontSize: '16px',
                fontFamily: 'Segoe UI, Arial, sans-serif',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                fontWeight: '600'
              }}
            >
              {isLoading ? 'מתחבר...' : 'התחבר עם ADFS'}
            </button>
            <div style={{
              fontSize: '12px',
              color: 'var(--muted)',
              marginTop: '8px'
            }}>
              תועבר לדף ההתחברות של ADFS
            </div>
            
            {/* Local Login Option in ADFS Mode */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: 'rgba(124, 192, 255, 0.1)',
              borderRadius: '8px',
              border: '1px solid rgba(124, 192, 255, 0.2)'
            }}>
              <div style={{
                fontSize: '12px',
                color: 'var(--muted)',
                marginBottom: '8px'
              }}>
                או התחבר עם חשבון מקומי:
              </div>
              <button
                type="button"
                onClick={handleAuthModeSwitch}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid var(--accent)',
                  backgroundColor: 'transparent',
                  color: 'var(--accent)',
                  fontSize: '12px',
                  fontFamily: 'Segoe UI, Arial, sans-serif',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--accent)'
                  e.currentTarget.style.color = 'white'
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.color = 'var(--accent)'
                }}
              >
                עבור לאימות מקומי
              </button>
            </div>
          </div>
        )}

        {/* Local Authentication Form */}
        {authMode === 'local' && (
          <form onSubmit={handleSubmit} style={{ direction: 'rtl' }}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--text)',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              שם משתמש *
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="הזן שם משתמש"
              required
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'Segoe UI, Arial, sans-serif',
                direction: 'rtl',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--text)',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              סיסמה (אופציונלי)
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="הזן סיסמה"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'Segoe UI, Arial, sans-serif',
                direction: 'rtl',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--text)',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              כתובת אימייל (אופציונלי)
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="הזן כתובת אימייל"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'Segoe UI, Arial, sans-serif',
                direction: 'rtl',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              color: 'var(--text)',
              fontWeight: '500',
              fontSize: '14px'
            }}>
              הרשאות
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleInputChange}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '8px',
                border: '2px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'Segoe UI, Arial, sans-serif',
                direction: 'rtl',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <option value="viewer">צופה - צפייה בלבד</option>
              <option value="editor">עורך - הוספת הודעות</option>
              <option value="admin">מנהל - הרשאות מלאות</option>
            </select>
          </div>

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: '2px solid var(--border)',
                backgroundColor: 'transparent',
                color: 'var(--text)',
                fontSize: '14px',
                fontFamily: 'Segoe UI, Arial, sans-serif',
                cursor: 'pointer',
                transition: 'all 0.2s',
                direction: 'rtl'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--border)'
                e.currentTarget.style.color = 'var(--text)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--text)'
              }}
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                padding: '12px 24px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isLoading ? 'var(--muted)' : 'var(--accent)',
                color: 'white',
                fontSize: '14px',
                fontFamily: 'Segoe UI, Arial, sans-serif',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                direction: 'rtl'
              }}
            >
              {isLoading ? 'מתחבר...' : 'התחבר'}
            </button>
          </div>
          </form>
        )}

        <div style={{
          marginTop: '20px',
          padding: '16px',
          backgroundColor: 'rgba(124, 192, 255, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(124, 192, 255, 0.2)',
          direction: 'rtl'
        }}>
          {authMode === 'local' ? (
            <>
              <h4 style={{
                margin: '0 0 8px 0',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                הסבר על הרשאות:
              </h4>
              <div style={{
                fontSize: '12px',
                color: 'var(--muted)',
                lineHeight: '1.4'
              }}>
                <div><strong>צופה:</strong> צפייה בלבד בסג"חים</div>
                <div><strong>עורך:</strong> הוספת הודעות בצ'אט</div>
                <div><strong>מנהל:</strong> עריכת סטטוסים, יצירת סג"חים, הודעות וניהול משתמשים</div>
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(124, 192, 255, 0.3)' }}>
                  <div style={{ color: 'var(--accent)', fontWeight: '600' }}>חשבון מנהל לדמו:</div>
                  <div>שם משתמש: <strong>admin</strong></div>
                  <div>סיסמה: <strong>admin</strong></div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h4 style={{
                margin: '0 0 8px 0',
                color: 'var(--text)',
                fontSize: '14px',
                fontWeight: '600'
              }}>
                אימות ADFS:
              </h4>
              <div style={{
                fontSize: '12px',
                color: 'var(--muted)',
                lineHeight: '1.4'
              }}>
                <div>ההרשאות נקבעות אוטומטית על פי חברות בקבוצות Active Directory:</div>
                <div><strong>מנהלים:</strong> admin, admins, Administrators</div>
                <div><strong>עורכים:</strong> editor, editors, Writers</div>
                <div><strong>צופים:</strong> כל המשתמשים האחרים</div>
                {canSwitch && (
                  <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(124, 192, 255, 0.3)' }}>
                    <div style={{ color: 'var(--accent)', fontWeight: '600' }}>
                      ניתן לעבור בין מצבי אימות בלחיצה על הכפתור למעלה
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
