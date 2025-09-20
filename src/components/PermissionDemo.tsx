import React from 'react'
import { usePermissions, getRoleDisplayName } from '../contexts/PermissionContext'

export const PermissionDemo: React.FC = () => {
  const { user, canEditStatus, canCreateSagach, canChat, canManageUsers, hasPermission } = usePermissions()

  if (!user) {
    return (
      <div style={{
        padding: '20px',
        backgroundColor: 'var(--panel)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        margin: '20px',
        direction: 'rtl',
        textAlign: 'center'
      }}>
        <h3 style={{ color: 'var(--text)', marginBottom: '16px' }}>
          מערכת הרשאות
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
          התחבר כדי לראות את הרשאותיך
        </p>
      </div>
    )
  }

  return (
    <div style={{
      padding: '20px',
      backgroundColor: 'var(--panel)',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      margin: '20px',
      direction: 'rtl'
    }}>
      <h3 style={{ 
        color: 'var(--text)', 
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        👤 הרשאות משתמש: {user.name}
        <span style={{
          backgroundColor: 'var(--accent)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '6px',
          fontSize: '12px',
          fontWeight: '600'
        }}>
          {getRoleDisplayName(user.role)}
        </span>
      </h3>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            {canEditStatus() ? '✅' : '❌'}
            <strong style={{ color: 'var(--text)' }}>עריכת סטטוסים</strong>
          </div>
          <p style={{ 
            color: 'var(--muted)', 
            fontSize: '12px',
            margin: 0
          }}>
            {canEditStatus() ? 'משתמש יכול לערוך סטטוסים של סג"חים' : 'אין הרשאה לעריכת סטטוסים'}
          </p>
        </div>

        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            {canCreateSagach() ? '✅' : '❌'}
            <strong style={{ color: 'var(--text)' }}>יצירת סג"חים</strong>
          </div>
          <p style={{ 
            color: 'var(--muted)', 
            fontSize: '12px',
            margin: 0
          }}>
            {canCreateSagach() ? 'משתמש יכול ליצור סג"חים חדשים' : 'אין הרשאה ליצירת סג"חים'}
          </p>
        </div>

        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            {canChat() ? '✅' : '❌'}
            <strong style={{ color: 'var(--text)' }}>הודעות בצ'אט</strong>
          </div>
          <p style={{ 
            color: 'var(--muted)', 
            fontSize: '12px',
            margin: 0
          }}>
            {canChat() ? 'משתמש יכול להוסיף הודעות' : 'אין הרשאה להוספת הודעות'}
          </p>
        </div>

        <div style={{
          padding: '12px',
          backgroundColor: 'rgba(255,255,255,0.05)',
          borderRadius: '8px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px'
          }}>
            {canManageUsers() ? '✅' : '❌'}
            <strong style={{ color: 'var(--text)' }}>ניהול משתמשים</strong>
          </div>
          <p style={{ 
            color: 'var(--muted)', 
            fontSize: '12px',
            margin: 0
          }}>
            {canManageUsers() ? 'משתמש יכול לנהל הרשאות משתמשים' : 'אין הרשאה לניהול משתמשים'}
          </p>
        </div>
      </div>

      <div style={{
        padding: '12px',
        backgroundColor: 'rgba(124, 192, 255, 0.1)',
        borderRadius: '8px',
        border: '1px solid rgba(124, 192, 255, 0.2)'
      }}>
        <h4 style={{
          color: 'var(--text)',
          fontSize: '14px',
          fontWeight: '600',
          margin: '0 0 8px 0'
        }}>
          הסבר על הרשאות:
        </h4>
        <ul style={{
          color: 'var(--muted)',
          fontSize: '12px',
          margin: 0,
          paddingRight: '16px',
          lineHeight: '1.4'
        }}>
          <li><strong>צופה:</strong> צפייה בלבד בסג"חים</li>
          <li><strong>עורך:</strong> הוספת הודעות בצ'אט</li>
          <li><strong>מנהל:</strong> עריכת סטטוסים, יצירת סג"חים, הודעות וניהול משתמשים</li>
        </ul>
      </div>
    </div>
  )
}
