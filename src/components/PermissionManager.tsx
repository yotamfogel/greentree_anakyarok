import React, { useState, useEffect } from 'react'
import { usePermissions, UserRole, getRoleDisplayName } from '../contexts/PermissionContext'

interface User {
  id: string
  name: string
  email: string
  role: UserRole
  lastLogin?: string
}

interface PermissionManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function PermissionManager({ isOpen, onClose }: PermissionManagerProps) {
  const { user: currentUser, canManageUsers } = usePermissions()
  const [users, setUsers] = useState<User[]>([])
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [newUser, setNewUser] = useState<Partial<User>>({
    name: '',
    email: '',
    role: 'viewer'
  })

  // Load users from localStorage on mount
  useEffect(() => {
    if (isOpen) {
      loadUsers()
    }
  }, [isOpen])

  const loadUsers = () => {
    try {
      const savedUsers = localStorage.getItem('admin_users')
      if (savedUsers) {
        const usersData = JSON.parse(savedUsers) as User[]
        setUsers(usersData)
      } else {
        // Initialize with current user if no users exist
        if (currentUser) {
          setUsers([currentUser])
        }
      }
    } catch (error) {
      console.error('Failed to load users:', error)
      setUsers([])
    }
  }

  const saveUsers = (updatedUsers: User[]) => {
    try {
      localStorage.setItem('admin_users', JSON.stringify(updatedUsers))
      setUsers(updatedUsers)
    } catch (error) {
      console.error('Failed to save users:', error)
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'שגיאה בשמירת משתמשים', 
          type: 'error', 
          durationMs: 3000 
        } 
      }))
    }
  }

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email) {
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'יש למלא שם ואימייל', 
          type: 'warn', 
          durationMs: 3000 
        } 
      }))
      return
    }

    const userExists = users.some(u => u.email === newUser.email)
    if (userExists) {
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'משתמש עם אימייל זה כבר קיים', 
          type: 'warn', 
          durationMs: 3000 
        } 
      }))
      return
    }

    const user: User = {
      id: `user_${Date.now()}`,
      name: newUser.name!,
      email: newUser.email!,
      role: newUser.role!,
      lastLogin: new Date().toISOString()
    }

    const updatedUsers = [...users, user]
    saveUsers(updatedUsers)
    setNewUser({ name: '', email: '', role: 'viewer' })
    setIsAddingUser(false)

    window.dispatchEvent(new CustomEvent('excel:status', { 
      detail: { 
        message: `משתמש ${user.name} נוסף בהצלחה`, 
        type: 'ok', 
        durationMs: 3000 
      } 
    }))
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
  }

  const handleSaveEdit = () => {
    if (!editingUser) return

    const updatedUsers = users.map(u => 
      u.id === editingUser.id ? editingUser : u
    )
    saveUsers(updatedUsers)
    setEditingUser(null)

    window.dispatchEvent(new CustomEvent('excel:status', { 
      detail: { 
        message: `משתמש ${editingUser.name} עודכן בהצלחה`, 
        type: 'ok', 
        durationMs: 3000 
      } 
    }))
  }

  const handleDeleteUser = (userId: string) => {
    if (userId === currentUser?.id) {
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: 'לא ניתן למחוק את המשתמש הנוכחי', 
          type: 'warn', 
          durationMs: 3000 
        } 
      }))
      return
    }

    const updatedUsers = users.filter(u => u.id !== userId)
    saveUsers(updatedUsers)

    window.dispatchEvent(new CustomEvent('excel:status', { 
      detail: { 
        message: 'משתמש נמחק בהצלחה', 
        type: 'ok', 
        durationMs: 3000 
      } 
    }))
  }

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    const updatedUsers = users.map(u => 
      u.id === userId ? { ...u, role: newRole } : u
    )
    saveUsers(updatedUsers)
  }

  if (!isOpen || !canManageUsers()) {
    return null
  }

  return (
    <div className="permission-manager-overlay" onClick={onClose}>
      <div className="permission-manager-modal" onClick={(e) => e.stopPropagation()}>
        <div className="permission-manager-header">
          <h2 style={{ margin: 0, color: '#fff', fontFamily: 'Segoe UI, Arial, sans-serif' }}>ניהול הרשאות משתמשים</h2>
          <button 
            className="close-button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ×
          </button>
        </div>

        <div className="permission-manager-content">
          {/* Add new user section */}
          <div className="add-user-section">
            <button 
              className="btn primary"
              onClick={() => setIsAddingUser(!isAddingUser)}
              style={{ marginBottom: '16px' }}
            >
              {isAddingUser ? 'ביטול' : 'הוסף משתמש חדש'}
            </button>

            {isAddingUser && (
              <div className="add-user-form" style={{ 
                background: 'rgba(255,255,255,0.1)', 
                padding: '16px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <input
                    type="text"
                    placeholder="שם משתמש"
                    value={newUser.name || ''}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontFamily: 'Segoe UI, Arial, sans-serif',
                      direction: 'rtl'
                    }}
                  />
                  <input
                    type="email"
                    placeholder="אימייל"
                    value={newUser.email || ''}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontFamily: 'Segoe UI, Arial, sans-serif',
                      direction: 'rtl'
                    }}
                  />
                  <select
                    value={newUser.role || 'viewer'}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255,255,255,0.3)',
                      background: 'rgba(255,255,255,0.1)',
                      color: '#fff',
                      fontFamily: 'Segoe UI, Arial, sans-serif',
                      direction: 'rtl'
                    }}
                  >
                    <option value="viewer">צופה</option>
                    <option value="editor">עורך</option>
                    <option value="admin">מנהל</option>
                  </select>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      className="btn primary"
                      onClick={handleAddUser}
                      style={{ flex: 1 }}
                    >
                      הוסף
                    </button>
                    <button 
                      className="btn ghost"
                      onClick={() => {
                        setIsAddingUser(false)
                        setNewUser({ name: '', email: '', role: 'viewer' })
                      }}
                      style={{ flex: 1 }}
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Users list */}
          <div className="users-list">
            <h3 style={{ color: '#fff', marginBottom: '16px', fontFamily: 'Segoe UI, Arial, sans-serif' }}>רשימת משתמשים</h3>
            {users.length === 0 ? (
              <div style={{ color: '#ccc', textAlign: 'center', padding: '20px' }}>
                אין משתמשים רשומים
              </div>
            ) : (
              <div className="users-table">
                {users.map((user) => (
                  <div key={user.id} className="user-row" style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.05)',
                    borderRadius: '6px',
                    marginBottom: '8px',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div className="user-info" style={{ flex: 1 }}>
                      <div style={{ color: '#fff', fontWeight: 'bold', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
                        {user.name}
                      </div>
                      <div style={{ color: '#ccc', fontSize: '14px', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
                        {user.email}
                      </div>
                      {user.lastLogin && (
                        <div style={{ color: '#999', fontSize: '12px', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
                          התחברות אחרונה: {new Date(user.lastLogin).toLocaleString('he-IL')}
                        </div>
                      )}
                    </div>

                    <div className="user-actions" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {editingUser?.id === user.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <select
                            value={editingUser.role}
                            onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid rgba(255,255,255,0.3)',
                              background: 'rgba(255,255,255,0.1)',
                              color: '#fff',
                              fontFamily: 'Segoe UI, Arial, sans-serif',
                              direction: 'rtl'
                            }}
                          >
                            <option value="viewer">צופה</option>
                            <option value="editor">עורך</option>
                            <option value="admin">מנהל</option>
                          </select>
                          <button 
                            className="btn primary"
                            onClick={handleSaveEdit}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            שמור
                          </button>
                          <button 
                            className="btn ghost"
                            onClick={() => setEditingUser(null)}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            ביטול
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ 
                            color: '#fff', 
                            background: 'rgba(124,192,255,0.2)', 
                            padding: '4px 8px', 
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontFamily: 'Segoe UI, Arial, sans-serif'
                          }}>
                            {getRoleDisplayName(user.role)}
                          </span>
                          <button 
                            className="btn ghost"
                            onClick={() => handleEditUser(user)}
                            style={{ padding: '4px 8px', fontSize: '12px' }}
                          >
                            ערוך
                          </button>
                          {user.id !== currentUser?.id && (
                            <button 
                              className="btn ghost"
                              onClick={() => handleDeleteUser(user.id)}
                              style={{ 
                                padding: '4px 8px', 
                                fontSize: '12px',
                                color: '#ff6b6b'
                              }}
                            >
                              מחק
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}


