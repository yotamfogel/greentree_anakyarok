import { useState, useEffect, useRef } from 'react'

interface SagachItem {
  id: string
  [key: string]: string // Dynamic columns
}

interface SagachVersion {
  version: string
  date: string
  time: string
  data: SagachItem[]
  changes?: string[]
}

interface SagachTable {
  id: string
  name: string
  data: SagachItem[]
  versions: SagachVersion[]
  currentVersion: string
}

export const SagachimManager = () => {
  const [currentSagachs, setCurrentSagachs] = useState<SagachTable[]>([
    {
      id: 'sagach1',
      name: 'סג"ח ראשי',
      currentVersion: '1.0.4',
      data: [
        { id: '1', 'Column 1': 'חדש', 'Column 2': 'string', 'Column 3': '14/07/2024', 'Column 4': 'eventTime' },
        { id: '2', 'Column 1': 'ID', 'Column 2': 'String', 'Column 3': '432423423', 'Column 4': 'Id' },
        { id: '3', 'Column 1': 'טלפון', 'Column 2': 'String', 'Column 3': '9728549308', 'Column 4': 'Pstn' },
        { id: '4', 'Column 1': 'סים', 'Column 2': 'string', 'Column 3': '4580432942', 'Column 4': 'imsi' }
      ],
      versions: [
        {
          version: '1.0.4',
          date: '24/08/2025',
          time: '10:05',
          data: [
            { id: '1', 'Column 1': 'חדש', 'Column 2': 'string', 'Column 3': '14/07/2024', 'Column 4': 'eventTime' },
            { id: '2', 'Column 1': 'ID', 'Column 2': 'String', 'Column 3': '432423423', 'Column 4': 'Id' },
            { id: '3', 'Column 1': 'טלפון', 'Column 2': 'String', 'Column 3': '9728549308', 'Column 4': 'Pstn' },
            { id: '4', 'Column 1': 'סים', 'Column 2': 'string', 'Column 3': '4580432942', 'Column 4': 'imsi' }
          ]
        },
        {
          version: '1.0.3',
          date: '24/08/2025',
          time: '11:05',
          data: [
            { id: '1', 'Column 1': 'חדש', 'Column 2': 'string', 'Column 3': '14/07/2024', 'Column 4': 'eventTime' },
            { id: '2', 'Column 1': 'ID', 'Column 2': 'String', 'Column 3': '432423423', 'Column 4': 'Id' },
            { id: '3', 'Column 1': 'טלפון', 'Column 2': 'String', 'Column 3': '9728549308', 'Column 4': 'Pstn' }
          ]
        },
        {
          version: '1.0.2',
          date: '24/08/2025',
          time: '10:05',
          data: [
            { id: '1', 'Column 1': 'חדש', 'Column 2': 'string', 'Column 3': '14/07/2024', 'Column 4': 'eventTime' },
            { id: '2', 'Column 1': 'ID', 'Column 2': 'String', 'Column 3': '432423423', 'Column 4': 'Id' }
          ]
        },
        {
          version: '1.0.1',
          date: '24/08/2025',
          time: '10:05',
          data: [
            { id: '1', 'Column 1': 'חדש', 'Column 2': 'string', 'Column 3': '14/07/2024', 'Column 4': 'eventTime' }
          ]
        }
      ]
    },
    {
      id: 'sagach2',
      name: 'סג"ח משני',
      currentVersion: '1.0.2',
      data: [
        { id: '5', 'Column 1': 'כתובת', 'Column 2': 'string', 'Column 3': 'רחוב הנשיא 123', 'Column 4': 'address' },
        { id: '6', 'Column 1': 'עיר', 'Column 2': 'String', 'Column 3': 'תל אביב', 'Column 4': 'city' }
      ],
      versions: [
        {
          version: '1.0.2',
          date: '24/08/2025',
          time: '10:15',
          data: [
            { id: '5', 'Column 1': 'כתובת', 'Column 2': 'string', 'Column 3': 'רחוב הנשיא 123', 'Column 4': 'address' },
            { id: '6', 'Column 1': 'עיר', 'Column 2': 'String', 'Column 3': 'תל אביב', 'Column 4': 'city' }
          ]
        },
        {
          version: '1.0.1',
          date: '24/08/2025',
          time: '10:10',
          data: [
            { id: '5', 'Column 1': 'כתובת', 'Column 2': 'string', 'Column 3': 'רחוב הנשיא 123', 'Column 4': 'address' }
          ]
        }
      ]
    }
  ])

  const [selectedSagachId, setSelectedSagachId] = useState<string>('sagach1')
  const [selectedVersion, setSelectedVersion] = useState<string>('1.0.4')
  const [editingCell, setEditingCell] = useState<{rowId: string, field: string} | null>(null)
  
  // Debug editingCell changes
  useEffect(() => {
    console.log('editingCell state changed to:', editingCell)
  }, [editingCell])
  const [changedItems, setChangedItems] = useState<Set<string>>(new Set())
  const [isCreatingNewSagach, setIsCreatingNewSagach] = useState(false)
  const [newSagachName, setNewSagachName] = useState<string>('')
  const [newSagachDescription, setNewSagachDescription] = useState<string>('')
  const [newSagachCategory, setNewSagachCategory] = useState<string>('')
  const [isVersionsPanelCollapsed, setIsVersionsPanelCollapsed] = useState<boolean>(true)
  const [isVersionSelected, setIsVersionSelected] = useState<boolean>(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false)
  const [itemToDelete, setItemToDelete] = useState<string | null>(null)
  const [selectedCell, setSelectedCell] = useState<{rowId: string, field: string} | null>(null)
  const [columnWidths, setColumnWidths] = useState<{[key: string]: number}>({})
  const [isResizing, setIsResizing] = useState<string | null>(null)
  const [tableColumns, setTableColumns] = useState<string[]>(['Column 1', 'Column 2', 'Column 3', 'Column 4'])
  const [editingColumn, setEditingColumn] = useState<string | null>(null)
  const [editingColumnName, setEditingColumnName] = useState<string>('')

  // Initialize column widths for default columns
  useEffect(() => {
    const initialWidths: {[key: string]: number} = {}
    tableColumns.forEach(column => {
      if (!columnWidths[column]) {
        initialWidths[column] = 150
      }
    })
    if (Object.keys(initialWidths).length > 0) {
      setColumnWidths(prev => ({ ...prev, ...initialWidths }))
    }
  }, [tableColumns])

  // Get current selected sagach
  const getCurrentSagach = (): SagachTable | undefined => {
    return currentSagachs.find(s => s.id === selectedSagachId)
  }

  // Get versions for current sagach
  const getCurrentSagachVersions = (): SagachVersion[] => {
    const sagach = getCurrentSagach()
    return sagach ? sagach.versions : []
  }

  // Update selected version when sagach changes
  useEffect(() => {
    const currentSagach = getCurrentSagach()
    if (currentSagach) {
      setSelectedVersion(currentSagach.currentVersion)
      setIsVersionSelected(false) // Reset version selection when switching sagachs
    }
  }, [selectedSagachId])

  // Get current sagach data
  const getCurrentSagachData = (): SagachItem[] => {
    const currentSagach = currentSagachs.find(s => s.id === selectedSagachId)
    return currentSagach ? currentSagach.data : []
  }

  // Update current sagach data
  const updateCurrentSagachData = (newData: SagachItem[]) => {
    setCurrentSagachs(prev => prev.map(sagach => 
      sagach.id === selectedSagachId 
        ? { ...sagach, data: newData }
        : sagach
    ))
  }

  const handleSave = (sagachId?: string) => {
    // If sagachId is provided, save only that sagach. Otherwise save the current selected sagach
    const targetSagachId = sagachId || selectedSagachId
    const currentSagach = currentSagachs.find(s => s.id === targetSagachId)
    
    if (!currentSagach) return

    // Compare current sagach data with its latest version
    const latestVersion = currentSagach.versions[0]
    const changes: string[] = []
    
    // Check for data changes within the sagach
    currentSagach.data.forEach(item => {
      const originalItem = latestVersion.data.find(orig => orig.id === item.id)
      if (!originalItem) {
        changes.push(`Added: ${item.name}`)
      } else {
        if (originalItem.name !== item.name) changes.push(`Name changed: ${originalItem.name} → ${item.name}`)
        if (originalItem.type !== item.type) changes.push(`Type changed for ${item.name}: ${originalItem.type} → ${item.type}`)
        if (originalItem.data !== item.data) changes.push(`Data changed for ${item.name}: ${originalItem.data} → ${item.data}`)
        if (originalItem.fieldName !== item.fieldName) changes.push(`Field name changed for ${item.name}: ${originalItem.fieldName} → ${item.fieldName}`)
      }
    })

    latestVersion.data.forEach(item => {
      if (!currentSagach.data.find(curr => curr.id === item.id)) {
        changes.push(`Removed: ${item.name}`)
      }
    })

    if (changes.length > 0) {
      // Create new version for this specific sagach
      const newVersionNumber = getNextVersion(currentSagach.currentVersion)
      const now = new Date()
      const newVersion: SagachVersion = {
        version: newVersionNumber,
        date: now.toLocaleDateString('he-IL'),
        time: now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        data: [...currentSagach.data],
        changes
      }

      // Update the sagach with the new version
      setCurrentSagachs(prev => prev.map(sagach => 
        sagach.id === targetSagachId 
          ? {
              ...sagach,
              currentVersion: newVersionNumber,
              versions: [newVersion, ...sagach.versions]
            }
          : sagach
      ))
      
      // Update selected version to the new one if we're viewing this sagach
      if (targetSagachId === selectedSagachId) {
        setSelectedVersion(newVersionNumber)
      }
    }
  }

  const getNextVersion = (currentVersion: string): string => {
    const parts = currentVersion.split('.')
    const patch = parseInt(parts[2]) + 1
    return `${parts[0]}.${parts[1]}.${patch}`
  }

  const handleVersionSelect = (version: string) => {
    const currentSagach = getCurrentSagach()
    if (!currentSagach) return

    const selectedVersionData = currentSagach.versions.find(v => v.version === version)
    if (selectedVersionData) {
      // Update the current sagach's data to match the selected version
      setCurrentSagachs(prev => prev.map(sagach => 
        sagach.id === selectedSagachId 
          ? { ...sagach, data: [...selectedVersionData.data] }
          : sagach
      ))
      setSelectedVersion(version)
      setIsVersionSelected(true) // Mark that a version was explicitly selected
      // Reset changed items when switching versions
      setChangedItems(new Set())
    }
  }

  const handleCreateNewSagach = () => {
    if (newSagachName.trim()) {
      const newSagachId = `sagach${Date.now()}`
      const now = new Date()
      const emptyRow = createEmptyRow()
      const initialVersion: SagachVersion = {
        version: '1.0.1',
        date: now.toLocaleDateString('he-IL'),
        time: now.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }),
        data: [emptyRow],
        changes: ['Initial version']
      }

      const newSagach: SagachTable = {
        id: newSagachId,
        name: newSagachName.trim(),
        data: [emptyRow],
        currentVersion: '1.0.1',
        versions: [initialVersion]
      }
      
      setCurrentSagachs(prev => [...prev, newSagach])
      setSelectedSagachId(newSagachId)
      setSelectedVersion('1.0.1')
      setNewSagachName('')
      setNewSagachDescription('')
      setNewSagachCategory('')
      setIsCreatingNewSagach(false)
    }
  }

  const handleExcelUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // For now, just log the file - in a real implementation, you'd parse the Excel file
      console.log('Excel file uploaded:', file.name)
      // You would typically use a library like xlsx to parse the file
      // and extract the data to populate the table
    }
  }

  const getItemChanges = (item: SagachItem): { type: 'new' | 'modified' | 'removed', fields: string[] } => {
    // Only show changes if a version is explicitly selected and versions panel is not collapsed
    if (!isVersionSelected || isVersionsPanelCollapsed) return { type: 'modified', fields: [] }
    
    const currentSagach = getCurrentSagach()
    if (!currentSagach) return { type: 'modified', fields: [] }

    const selectedVersionData = currentSagach.versions.find(v => v.version === selectedVersion)
    if (!selectedVersionData) return { type: 'modified', fields: [] }
    
    // Find the index of the selected version
    const selectedVersionIndex = currentSagach.versions.findIndex(v => v.version === selectedVersion)
    
    // If we're viewing the earliest version (last in array), no changes to show
    if (selectedVersionIndex === currentSagach.versions.length - 1) {
      return { type: 'modified', fields: [] }
    }
    
    // Get the previous version (the one after the selected version in the array)
    // Since versions are ordered from latest to earliest, the previous version is at index + 1
    const previousVersion = currentSagach.versions[selectedVersionIndex + 1]
    if (!previousVersion) return { type: 'modified', fields: [] }
    
    const previousItem = previousVersion.data.find(prev => prev.id === item.id)
    
    // If item doesn't exist in previous version, it's new
    if (!previousItem) return { type: 'new', fields: [] }
    
    // Check for field modifications
    const modifiedFields: string[] = []
    if (previousItem.name !== item.name) modifiedFields.push('name')
    if (previousItem.type !== item.type) modifiedFields.push('type')
    if (previousItem.data !== item.data) modifiedFields.push('data')
    if (previousItem.fieldName !== item.fieldName) modifiedFields.push('fieldName')
    
    return { type: modifiedFields.length > 0 ? 'modified' : 'modified', fields: modifiedFields }
  }

  // Get removed items (items that exist in previous version but not in current)
  const getRemovedItems = (): SagachItem[] => {
    // Only show removed items if a version is explicitly selected and versions panel is not collapsed
    if (!isVersionSelected || isVersionsPanelCollapsed) return []
    
    const currentSagach = getCurrentSagach()
    if (!currentSagach) return []

    const selectedVersionData = currentSagach.versions.find(v => v.version === selectedVersion)
    if (!selectedVersionData) return []
    
    // Find the index of the selected version
    const selectedVersionIndex = currentSagach.versions.findIndex(v => v.version === selectedVersion)
    
    // If we're viewing the earliest version (last in array), no removed items to show
    if (selectedVersionIndex === currentSagach.versions.length - 1) {
      return []
    }
    
    // Get the previous version (the one after the selected version in the array)
    // Since versions are ordered from latest to earliest, the previous version is at index + 1
    const previousVersion = currentSagach.versions[selectedVersionIndex + 1]
    if (!previousVersion) return []
    
    const currentData = getCurrentSagachData()
    
    // Find items that exist in previous version but not in current
    return previousVersion.data.filter(prevItem => 
      !currentData.find(currItem => currItem.id === prevItem.id)
    )
  }

  const handleCellClick = (rowId: string, field: string) => {
    setEditingCell({ rowId, field })
  }

  const handleCellSave = (rowId: string, field: string, value: string) => {
    // Update the item in whichever sagach contains it
    setCurrentSagachs(prev => prev.map(sagach => ({
      ...sagach,
      data: sagach.data.map(item => 
        item.id === rowId 
          ? { ...item, [field]: value }
          : item
      )
    })))
    setEditingCell(null)
  }

  const handleDeleteRow = (id: string) => {
    // Find which sagach contains this item and remove it
    setCurrentSagachs(prev => prev.map(sagach => ({
      ...sagach,
      data: sagach.data.filter(item => item.id !== id)
    })))
    setShowDeleteConfirm(false)
    setItemToDelete(null)
  }

  const handleDeleteClick = (id: string) => {
    setItemToDelete(id)
    setShowDeleteConfirm(true)
  }

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false)
    setItemToDelete(null)
  }

  const handleCellSelect = (rowId: string, field: string) => {
    setSelectedCell({ rowId, field })
    // Focus the table container for keyboard navigation
    const tableContainer = document.querySelector('[tabindex="0"]') as HTMLElement
    if (tableContainer) {
      tableContainer.focus()
    }
  }

  const handleCellDoubleClick = (rowId: string, field: string, currentValue: string) => {
    console.log('handleCellDoubleClick called with:', { rowId, field, currentValue })
    console.log('Setting editingCell to:', { rowId, field })
    const newEditingCell = { rowId, field }
    console.log('About to set editingCell to:', newEditingCell)
    setEditingCell(newEditingCell)
    setSelectedCell(null)
    console.log('editingCell state should now be:', newEditingCell)
  }

  const handleKeyNavigation = (e: React.KeyboardEvent) => {
    if (!selectedCell) return

    const currentData = getCurrentSagachData()
    const currentIndex = currentData.findIndex(item => item.id === selectedCell.rowId)
    const currentFieldIndex = tableColumns.indexOf(selectedCell.field)

    let newRowIndex = currentIndex
    let newFieldIndex = currentFieldIndex

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        newRowIndex = Math.max(0, currentIndex - 1)
        break
      case 'ArrowDown':
        e.preventDefault()
        newRowIndex = Math.min(currentData.length - 1, currentIndex + 1)
        break
      case 'ArrowLeft':
        e.preventDefault()
        newFieldIndex = Math.max(0, currentFieldIndex - 1)
        break
      case 'ArrowRight':
        e.preventDefault()
        newFieldIndex = Math.min(tableColumns.length - 1, currentFieldIndex + 1)
        break
      case 'Enter':
        e.preventDefault()
        if (currentData[currentIndex]) {
          const currentValue = currentData[currentIndex][selectedCell.field] || ''
          handleCellDoubleClick(selectedCell.rowId, selectedCell.field, currentValue)
        }
        return
      case 'Tab':
        e.preventDefault()
        if (e.shiftKey) {
          // Shift+Tab: move left
          newFieldIndex = Math.max(0, currentFieldIndex - 1)
        } else {
          // Tab: move right
          newFieldIndex = Math.min(tableColumns.length - 1, currentFieldIndex + 1)
        }
        break
      default:
        return
    }

    if (currentData[newRowIndex] && tableColumns[newFieldIndex]) {
      setSelectedCell({ rowId: currentData[newRowIndex].id, field: tableColumns[newFieldIndex] })
    }
  }

  const handleColumnResize = (column: string, newWidth: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [column]: Math.max(80, newWidth)
    }))
  }

  const handleResizeStart = (column: string) => {
    setIsResizing(column)
  }

  const handleResizeEnd = () => {
    setIsResizing(null)
  }

  const handleAddColumn = () => {
    // Generate a unique column name automatically
    const columnNumber = tableColumns.length + 1
    const newColumn = `Column ${columnNumber}`
    
    setTableColumns(prev => [newColumn, ...prev])
    setColumnWidths(prev => ({
      ...prev,
      [newColumn]: 150
    }))
    
    // Add the new column to all existing data
    setCurrentSagachs(prev => prev.map(sagach => ({
      ...sagach,
      data: sagach.data.map(item => ({
        ...item,
        [newColumn]: ''
      })),
      versions: sagach.versions.map(version => ({
        ...version,
        data: version.data.map(item => ({
          ...item,
          [newColumn]: ''
        }))
      }))
    })))
    
    // Auto-select the first cell of the new column for immediate editing
    const currentData = getCurrentSagachData()
    if (currentData.length > 0) {
      const firstRowId = currentData[0].id
      setSelectedCell({ rowId: firstRowId, field: newColumn })
    }
  }

  const handleRemoveColumn = (columnName: string) => {
    if (tableColumns.length > 1) {
      setTableColumns(prev => prev.filter(col => col !== columnName))
      setColumnWidths(prev => {
        const newWidths = { ...prev }
        delete newWidths[columnName]
        return newWidths
      })
    }
  }

  const handleRenameColumn = (oldName: string, newName: string) => {
    if (newName.trim() && newName !== oldName) {
      const trimmedNewName = newName.trim()
      
      // Update column names
      setTableColumns(prev => prev.map(col => col === oldName ? trimmedNewName : col))
      
      // Update column widths
      setColumnWidths(prev => {
        const newWidths = { ...prev }
        newWidths[trimmedNewName] = newWidths[oldName] || 150
        delete newWidths[oldName]
        return newWidths
      })
      
      // Update all data in current sagachs to use new column name
      setCurrentSagachs(prev => prev.map(sagach => ({
        ...sagach,
        data: sagach.data.map(item => {
          const newItem = { ...item }
          if (newItem[oldName] !== undefined) {
            newItem[trimmedNewName] = newItem[oldName]
            delete newItem[oldName]
          }
          return newItem
        }),
        versions: sagach.versions.map(version => ({
          ...version,
          data: version.data.map(item => {
            const newItem = { ...item }
            if (newItem[oldName] !== undefined) {
              newItem[trimmedNewName] = newItem[oldName]
              delete newItem[oldName]
            }
            return newItem
          })
        }))
      })))
    }
  }

  const handleStartColumnEdit = (columnName: string) => {
    setEditingColumn(columnName)
    setEditingColumnName(columnName)
  }

  const handleSaveColumnEdit = () => {
    if (editingColumn && editingColumnName.trim() && editingColumnName !== editingColumn) {
      handleRenameColumn(editingColumn, editingColumnName.trim())
    }
    setEditingColumn(null)
    setEditingColumnName('')
  }

  const handleCancelColumnEdit = () => {
    setEditingColumn(null)
    setEditingColumnName('')
  }

  const handleColumnEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveColumnEdit()
    } else if (e.key === 'Escape') {
      handleCancelColumnEdit()
    }
  }

  const createEmptyRow = (): SagachItem => {
    const emptyRow: SagachItem = { id: `row_${Date.now()}` }
    tableColumns.forEach(column => {
      emptyRow[column] = ''
    })
    return emptyRow
  }

  const addColumnToExistingData = (newColumn: string) => {
    // Add the new column to all existing data
    setCurrentSagachs(prev => prev.map(sagach => ({
      ...sagach,
      data: sagach.data.map(item => ({
        ...item,
        [newColumn]: ''
      })),
      versions: sagach.versions.map(version => ({
        ...version,
        data: version.data.map(item => ({
          ...item,
          [newColumn]: ''
        }))
      }))
    })))
  }

  // This function is now handled by individual sagach cards

  return (
    <div className="sagachim-manager" style={{
      height: '100vh',
      background: 'radial-gradient(1200px 800px at 80% 20%, rgba(124,192,255,0.15), transparent 50%), radial-gradient(1000px 700px at 10% 90%, rgba(167, 90, 255, 0.12), transparent 50%), var(--bg)',
      color: 'var(--text)',
      fontFamily: '"Segoe UI", system-ui, sans-serif',
      position: 'relative',
      width: '100vw',
      maxWidth: '100%',
      boxSizing: 'border-box',
      overflow: 'hidden'
    }}>
      {/* Left Panel - Versions - Pinned to Left */}
      <div className="versions-panel" style={{
        position: 'fixed',
        left: '12px',
        top: '120px',
        bottom: '12px',
        width: isVersionsPanelCollapsed ? '60px' : '280px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 'var(--radius)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 20px 60px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        overflow: 'hidden',
        zIndex: 100,
        transition: 'width 0.3s ease'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          paddingBottom: '12px'
        }}>
          {!isVersionsPanelCollapsed && (
            <h2 style={{
              color: 'var(--accent)',
              fontSize: '20px',
              fontWeight: '700',
              letterSpacing: '0.4px',
              margin: 0
            }}>Versions</h2>
          )}
          <button
            onClick={() => {
              setIsVersionsPanelCollapsed(!isVersionsPanelCollapsed)
              // Reset version selection when collapsing or expanding
              if (!isVersionsPanelCollapsed) {
                // When collapsing, hide changes
                setIsVersionSelected(false)
              } else {
                // When expanding, clear version selection
                setIsVersionSelected(false)
                setSelectedVersion('')
              }
            }}
            className="btn ghost"
            style={{
              padding: '8px',
              fontSize: '16px',
              minWidth: 'auto',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isVersionsPanelCollapsed ? 'הרחב' : 'כווץ'}
          >
            {isVersionsPanelCollapsed ? '▶' : '◀'}
          </button>
        </div>
        
        {!isVersionsPanelCollapsed && (
          <>
            {/* Show current sagach name */}
            <div style={{
              padding: '8px 12px',
              background: 'rgba(124,192,255,0.1)',
              border: '1px solid rgba(124,192,255,0.3)',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'var(--accent)',
              fontSize: '14px',
              fontWeight: '600',
              direction: 'rtl',
              marginBottom: '12px'
            }}>
              {getCurrentSagach()?.name || 'בחר סג"ח'}
            </div>
            
            <div className="versions-list">
              {getCurrentSagachVersions().map(version => (
                <div
                  key={version.version}
                  className={`version-item ${selectedVersion === version.version ? 'selected' : ''}`}
                  onClick={() => handleVersionSelect(version.version)}
                  style={{
                    background: selectedVersion === version.version 
                      ? 'linear-gradient(180deg, rgba(124,192,255,0.22), rgba(124,192,255,0.1))' 
                      : 'rgba(255,255,255,0.06)',
                    color: selectedVersion === version.version ? 'var(--text)' : 'var(--text)',
                    border: selectedVersion === version.version 
                      ? '1px solid rgba(124,192,255,0.6)' 
                      : '1px solid rgba(255,255,255,0.14)',
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '10px',
                    cursor: 'pointer',
                    transition: 'transform 120ms ease, box-shadow 200ms ease, background 200ms ease',
                    textAlign: 'center',
                    position: 'relative',
                    boxShadow: selectedVersion === version.version
                      ? '0 6px 22px rgba(124,192,255,0.24)'
                      : '0 4px 12px rgba(0,0,0,0.2)',
                    backdropFilter: 'blur(6px)'
                  }}
                >
                  <div style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '5px' }}>
                    {version.version}
                    {version.changes && version.changes.length > 0 && (
                      <span style={{ 
                        position: 'absolute',
                        top: '6px',
                        right: '6px',
                        backgroundColor: 'var(--accent)',
                        color: '#000',
                        borderRadius: '50%',
                        width: '6px',
                        height: '6px',
                        fontSize: '6px',
                        display: 'inline-block',
                        boxShadow: '0 0 8px rgba(124,192,255,0.6)'
                      }} />
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {version.date}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                    {version.time}
                  </div>
                  {version.changes && version.changes.length > 0 && (
                    <div style={{ fontSize: '10px', marginTop: '6px', color: 'var(--accent)', fontWeight: 'bold' }}>
                      {version.changes.length} שינויים
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Center Panel - Main Table Display */}
      <div className="table-panel" style={{
        position: 'fixed',
        left: isVersionsPanelCollapsed ? '84px' : '304px',
        right: '344px',
        top: '120px',
        bottom: '12px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 'var(--radius)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 20px 60px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 50
      }}>
        {selectedSagachId ? (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            {/* Table Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.12)'
            }}>
              <div>
                <h2 style={{
                  color: 'var(--accent)',
                  fontSize: '20px',
                  fontWeight: '700',
                  direction: 'rtl',
                  margin: 0
                }}>
                  {currentSagachs.find(s => s.id === selectedSagachId)?.name}
                </h2>
                {/* Color Legend - Only show when a version is selected and versions panel is expanded */}
                {isVersionSelected && !isVersionsPanelCollapsed && (
                  <div style={{
                    display: 'flex',
                    gap: '16px',
                    marginTop: '8px',
                    fontSize: '12px',
                    direction: 'rtl'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: 'rgba(76,175,80,0.6)',
                        borderRadius: '2px'
                      }}></div>
                      <span style={{ color: 'var(--muted)' }}>הוספו מהגרסה הקודמת</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: 'rgba(255,165,0,0.6)',
                        borderRadius: '2px'
                      }}></div>
                      <span style={{ color: 'var(--muted)' }}>שונו מהגרסה הקודמת</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        backgroundColor: 'rgba(255,80,80,0.6)',
                        borderRadius: '2px'
                      }}></div>
                      <span style={{ color: 'var(--muted)' }}>הוסרו מהגרסה הקודמת</span>
                    </div>
                  </div>
                )}
              </div>
              <div style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                <button
                  onClick={() => {
                    const newItem = createEmptyRow()
                    const currentData = getCurrentSagachData()
                    const updatedData = [...currentData, newItem]
                    updateCurrentSagachData(updatedData)
                    
                    // Auto-select the first cell of the new row for immediate editing
                    if (tableColumns.length > 0) {
                      setSelectedCell({ rowId: newItem.id, field: tableColumns[0] })
                    }
                  }}
                  className="btn primary"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    direction: 'rtl'
                  }}
                >
                  + הוסף רשומה
                </button>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file && file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
                      console.log('Excel file uploaded:', file.name)
                      // Here you would implement Excel parsing logic
                    }
                    // Reset file input
                    e.target.value = ''
                  }}
                  style={{ display: 'none' }}
                  id="excel-upload"
                />
                <label
                  htmlFor="excel-upload"
                  className="btn ghost"
                  style={{
                    padding: '8px 16px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    direction: 'rtl'
                  }}
                >
                  📁 העלה אקסל
                </label>
              </div>
            </div>

            {/* Table */}
            <div 
              style={{ 
                flex: 1, 
                overflow: 'auto',
                position: 'relative',
                outline: 'none'
              }}
              onKeyDown={handleKeyNavigation}
              tabIndex={0}
              onFocus={(e) => {
                // Ensure the container can receive focus for keyboard navigation
                e.currentTarget.focus()
              }}
            >
              {/* Custom Scrollbar Styles */}
              <style>
                {`
                  .table-container::-webkit-scrollbar {
                    width: 12px;
                    height: 12px;
                  }
                  .table-container::-webkit-scrollbar-track {
                    background: rgba(255,255,255,0.05);
                    border-radius: 6px;
                  }
                  .table-container::-webkit-scrollbar-thumb {
                    background: linear-gradient(135deg, rgba(124,192,255,0.6), rgba(167,90,255,0.6));
                    border-radius: 6px;
                    border: 2px solid rgba(255,255,255,0.1);
                  }
                  .table-container::-webkit-scrollbar-thumb:hover {
                    background: linear-gradient(135deg, rgba(124,192,255,0.8), rgba(167,90,255,0.8));
                  }
                  .table-container::-webkit-scrollbar-corner {
                    background: rgba(255,255,255,0.05);
                  }
                `}
              </style>
              <div className="table-container" style={{ 
                overflow: 'auto',
                height: '100%',
                position: 'relative'
              }}>
                <table style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse',
                  minWidth: `${Object.values(columnWidths).reduce((sum, width) => sum + width, 0) + 100}px`
                }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.08)' }}>
                    {/* Add Column Button - Left Side */}
                    <th style={{ 
                      padding: '12px', 
                      textAlign: 'center', 
                      color: 'var(--accent)', 
                      fontWeight: '600',
                      borderBottom: '2px solid rgba(124,192,255,0.3)',
                      width: '80px',
                      minWidth: '80px'
                    }}>
                      <button
                        onClick={handleAddColumn}
                        style={{
                          background: 'linear-gradient(135deg, rgba(76,175,80,0.8), rgba(76,175,80,0.6))',
                          border: '1px solid rgba(76,175,80,0.4)',
                          borderRadius: '8px',
                          padding: '6px 8px',
                          color: 'white',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(76,175,80,0.3)',
                          minWidth: '32px',
                          height: '32px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)'
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(76,175,80,0.4)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0px)'
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(76,175,80,0.3)'
                        }}
                        title="הוסף עמודה חדשה"
                      >
                        +
                      </button>
                    </th>
                    {tableColumns.map((column, index) => (
                      <th 
                        key={column}
                        style={{ 
                          padding: '12px', 
                          textAlign: 'center', 
                          color: 'var(--accent)', 
                          fontWeight: '600',
                          direction: 'rtl',
                          borderBottom: '2px solid rgba(124,192,255,0.3)',
                          width: `${columnWidths[column] || 150}px`,
                          minWidth: '80px',
                          position: 'relative',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          {editingColumn === column ? (
                            <input
                              type="text"
                              value={editingColumnName}
                              onChange={(e) => setEditingColumnName(e.target.value)}
                              onBlur={handleSaveColumnEdit}
                              onKeyDown={handleColumnEditKeyDown}
                              autoFocus
                              style={{
                                background: 'rgba(124,192,255,0.2)',
                                border: '1px solid rgba(124,192,255,0.6)',
                                borderRadius: '4px',
                                padding: '4px 8px',
                                color: 'var(--text)',
                                fontSize: '14px',
                                fontWeight: '600',
                                width: '100%',
                                direction: 'rtl',
                                outline: 'none'
                              }}
                            />
                          ) : (
                            <span 
                              style={{ 
                                flex: 1, 
                                cursor: 'pointer',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                transition: 'background 0.2s ease'
                              }}
                              onClick={() => handleStartColumnEdit(column)}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = 'rgba(124,192,255,0.1)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = 'transparent'
                              }}
                              title="לחץ לעריכה"
                            >
                              {column}
                            </span>
                          )}
                          <button
                            onClick={() => handleRemoveColumn(column)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ff5050',
                              cursor: 'pointer',
                              fontSize: '12px',
                              padding: '2px 4px',
                              marginLeft: '8px',
                              opacity: tableColumns.length > 1 ? 1 : 0.3
                            }}
                            disabled={tableColumns.length <= 1}
                            title="מחק עמודה"
                          >
                            ×
                          </button>
                        </div>
                        <div
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: '4px',
                            cursor: 'col-resize',
                            background: isResizing === column ? 'rgba(124,192,255,0.8)' : 'transparent',
                            transition: 'background 0.2s ease'
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault()
                            handleResizeStart(column)
                            const startX = e.clientX
                            const startWidth = columnWidths[column] || 150

                            const handleMouseMove = (e: MouseEvent) => {
                              const newWidth = startWidth + (e.clientX - startX)
                              handleColumnResize(column, newWidth)
                            }

                            const handleMouseUp = () => {
                              document.removeEventListener('mousemove', handleMouseMove)
                              document.removeEventListener('mouseup', handleMouseUp)
                              handleResizeEnd()
                            }

                            document.addEventListener('mousemove', handleMouseMove)
                            document.addEventListener('mouseup', handleMouseUp)
                          }}
                          onMouseEnter={(e) => {
                            if (!isResizing) {
                              e.currentTarget.style.background = 'rgba(124,192,255,0.3)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isResizing) {
                              e.currentTarget.style.background = 'transparent'
                            }
                          }}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {getCurrentSagachData().map((item, index) => (
                    <TableRow
                      key={item.id}
                      item={item}
                      isEven={index % 2 === 0}
                      changes={getItemChanges(item)}
                      editingCell={editingCell}
                      selectedCell={selectedCell}
                      columnWidths={columnWidths}
                      tableColumns={tableColumns}
                      onCellClick={handleCellClick}
                      onCellSelect={handleCellSelect}
                      onCellDoubleClick={handleCellDoubleClick}
                      onCellSave={handleCellSave}
                      onDelete={handleDeleteClick}
                    />
                  ))}
                  {/* Show removed items */}
                  {getRemovedItems().map((item, index) => (
                    <TableRow
                      key={`removed-${item.id}`}
                      item={item}
                      isEven={(getCurrentSagachData().length + index) % 2 === 0}
                      changes={{ type: 'removed', fields: [] }}
                      editingCell={editingCell}
                      selectedCell={selectedCell}
                      columnWidths={columnWidths}
                      tableColumns={tableColumns}
                      onCellClick={handleCellClick}
                      onCellSelect={handleCellSelect}
                      onCellDoubleClick={handleCellDoubleClick}
                      onCellSave={handleCellSave}
                      onDelete={() => {}} // Removed items can't be deleted
                    />
                  ))}
                </tbody>
              </table>
              </div>
              
              {getCurrentSagachData().length === 0 && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '200px',
                  color: 'var(--muted)',
                  fontSize: '16px',
                  direction: 'rtl'
                }}>
                  אין רשומות בסג"ח זה
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--muted)',
            fontSize: '16px',
            direction: 'rtl'
          }}>
            <div>בחר סג"ח כדי להציג את הנתונים</div>
          </div>
        )}
      </div>

      {/* Right Panel - Sagach Manager */}
      <div className="sagach-manager-panel" style={{
        position: 'fixed',
        right: '12px',
        top: '120px',
        bottom: '12px',
        width: '320px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: 'var(--radius)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 20px 60px rgba(0,0,0,0.35)',
        backdropFilter: 'blur(8px)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        zIndex: 100,
        overflow: 'auto'
      }}>
        <h2 style={{
          color: 'var(--accent)',
          fontSize: '18px',
          marginBottom: '12px',
          textAlign: 'center',
          fontWeight: '700',
          letterSpacing: '0.4px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
          paddingBottom: '10px',
          direction: 'rtl'
        }}>מנהל סג"חים</h2>

        {/* Create New Sagach Button */}
        <div style={{ marginBottom: '16px' }}>
          <button
            onClick={() => setIsCreatingNewSagach(true)}
            className="btn primary"
            style={{ width: '100%', padding: '10px', fontSize: '14px', direction: 'rtl' }}
          >
            + צור סג"ח חדש
          </button>
        </div>

        {/* Sagachs List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>
          {currentSagachs.map(sagach => (
            <SagachCard
              key={sagach.id}
              sagach={sagach}
              isSelected={selectedSagachId === sagach.id}
              onSelect={() => setSelectedSagachId(sagach.id)}
            />
          ))}
        </div>

        {/* Bottom buttons */}
        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button
            onClick={() => handleSave()}
            className="btn primary"
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: '600',
              direction: 'rtl',
              letterSpacing: '0.3px'
            }}
          >
            שמור שינויים לסג"ח הנוכחי
          </button>
          <button
            className="btn ghost"
            style={{
              padding: '10px 16px',
              fontSize: '13px',
              fontWeight: '600',
              direction: 'rtl',
              letterSpacing: '0.3px'
            }}
          >
            פרסם לשותפים
          </button>
        </div>
      </div>

      {/* Create Sagach Modal */}
      {isCreatingNewSagach && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'radial-gradient(1200px 800px at 50% 50%, rgba(124,192,255,0.15), transparent 50%), radial-gradient(1000px 700px at 50% 50%, rgba(167, 90, 255, 0.12), transparent 50%), var(--bg)',
            border: '2px solid rgba(124,192,255,0.3)',
            borderRadius: '24px',
            padding: '32px',
            width: '480px',
            maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)'
          }}>
            <h2 style={{
              color: 'var(--text)',
              fontSize: '24px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '24px',
              direction: 'rtl'
            }}>
              צור סג"ח חדש
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Name Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  color: 'var(--text)',
                  fontSize: '16px',
                  fontWeight: '600',
                  direction: 'rtl'
                }}>
                  שם יחיד לשיתוף
                </label>
                <input
                  type="text"
                  value={newSagachName}
                  onChange={(e) => setNewSagachName(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    color: 'var(--text)',
                    fontSize: '16px',
                    direction: 'rtl',
                    outline: 'none',
                    fontFamily: 'Segoe UI, sans-serif',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(124,192,255,0.6)'
                    e.target.style.boxShadow = '0 0 20px rgba(124,192,255,0.3)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              {/* Description Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  color: 'var(--text)',
                  fontSize: '16px',
                  fontWeight: '600',
                  direction: 'rtl'
                }}>
                  שם הסג"ח
                </label>
                <input
                  type="text"
                  value={newSagachDescription}
                  onChange={(e) => setNewSagachDescription(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    color: 'var(--text)',
                    fontSize: '16px',
                    direction: 'rtl',
                    outline: 'none',
                    fontFamily: 'Segoe UI, sans-serif',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(124,192,255,0.6)'
                    e.target.style.boxShadow = '0 0 20px rgba(124,192,255,0.3)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              {/* Category Field */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  color: 'var(--text)',
                  fontSize: '16px',
                  fontWeight: '600',
                  direction: 'rtl'
                }}>
                  סיפק
                </label>
                <input
                  type="text"
                  value={newSagachCategory}
                  onChange={(e) => setNewSagachCategory(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '12px',
                    padding: '14px 16px',
                    color: 'var(--text)',
                    fontSize: '16px',
                    direction: 'rtl',
                    outline: 'none',
                    fontFamily: 'Segoe UI, sans-serif',
                    transition: 'all 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = 'rgba(124,192,255,0.6)'
                    e.target.style.boxShadow = '0 0 20px rgba(124,192,255,0.3)'
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = 'rgba(255,255,255,0.2)'
                    e.target.style.boxShadow = 'none'
                  }}
                />
              </div>

              {/* Excel Upload Section */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{
                  color: 'var(--text)',
                  fontSize: '16px',
                  fontWeight: '600',
                  direction: 'rtl'
                }}>
                  העלה קובץ אקסל (אופציונלי)
                </label>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '12px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '2px dashed rgba(124,192,255,0.3)',
                  borderRadius: '12px',
                  padding: '20px',
                  transition: 'all 0.2s ease'
                }}>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                    style={{ display: 'none' }}
                    id="excel-upload-popup"
                  />
                  <label
                    htmlFor="excel-upload-popup"
                    style={{
                      background: 'linear-gradient(135deg, rgba(76,175,80,0.8), rgba(76,175,80,0.6))',
                      border: '1px solid rgba(76,175,80,0.4)',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      direction: 'rtl'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-1px)'
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(76,175,80,0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0px)'
                      e.currentTarget.style.boxShadow = 'none'
                    }}
                  >
                    📁 בחר קובץ אקסל
                  </label>
                  <span style={{
                    color: 'var(--muted)',
                    fontSize: '14px',
                    direction: 'rtl'
                  }}>
                    או גרור קובץ לכאן
                  </span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              marginTop: '32px',
              justifyContent: 'center'
            }}>
              <button
                onClick={handleCreateNewSagach}
                style={{
                  background: 'linear-gradient(135deg, rgba(124,192,255,0.8), rgba(124,192,255,0.6))',
                  border: '1px solid rgba(124,192,255,0.4)',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  direction: 'rtl',
                  boxShadow: '0 4px 16px rgba(124,192,255,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(124,192,255,0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,192,255,0.3)'
                }}
              >
                הוסף פורמט להעלאת דגימה
              </button>
              
              <button
                onClick={() => {
                  setIsCreatingNewSagach(false)
                  setNewSagachName('')
                  setNewSagachDescription('')
                  setNewSagachCategory('')
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(124,192,255,0.4)',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  color: 'var(--text)',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  direction: 'rtl'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(124,192,255,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                מעלה דגימה
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'radial-gradient(1200px 800px at 50% 50%, rgba(124,192,255,0.15), transparent 50%), radial-gradient(1000px 700px at 50% 50%, rgba(167, 90, 255, 0.12), transparent 50%), var(--bg)',
            border: '2px solid rgba(255,80,80,0.3)',
            borderRadius: '24px',
            padding: '32px',
            width: '400px',
            maxWidth: '90vw',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
            backdropFilter: 'blur(12px)'
          }}>
            <h2 style={{
              color: '#ff5050',
              fontSize: '24px',
              fontWeight: '700',
              textAlign: 'center',
              marginBottom: '16px',
              direction: 'rtl'
            }}>
              מחק רשומה
            </h2>
            <p style={{
              color: 'var(--text)',
              fontSize: '16px',
              textAlign: 'center',
              marginBottom: '24px',
              direction: 'rtl'
            }}>
              האם אתה בטוח שברצונך למחוק את הרשומה הזו? פעולה זו לא ניתנת לביטול.
            </p>
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              justifyContent: 'center'
            }}>
              <button
                onClick={handleDeleteCancel}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  color: 'var(--text)',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  direction: 'rtl'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
              >
                ביטול
              </button>
              <button
                onClick={() => itemToDelete && handleDeleteRow(itemToDelete)}
                style={{
                  background: 'linear-gradient(135deg, rgba(255,80,80,0.8), rgba(255,80,80,0.6))',
                  border: '1px solid rgba(255,80,80,0.4)',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  color: 'white',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  direction: 'rtl',
                  boxShadow: '0 4px 16px rgba(255,80,80,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,80,80,0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0px)'
                  e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,80,80,0.3)'
                }}
              >
                מחק
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface TableRowProps {
  item: SagachItem
  isEven: boolean
  changes: { type: 'new' | 'modified' | 'removed', fields: string[] }
  editingCell: {rowId: string, field: string} | null
  selectedCell: {rowId: string, field: string} | null
  columnWidths: {[key: string]: number}
  tableColumns: string[]
  onCellClick: (rowId: string, field: string) => void
  onCellSelect: (rowId: string, field: string) => void
  onCellDoubleClick: (rowId: string, field: string, currentValue: string) => void
  onCellSave: (rowId: string, field: string, value: string) => void
  onDelete: (id: string) => void
}

const TableRow = ({ item, isEven, changes, editingCell, selectedCell, columnWidths, tableColumns, onCellClick, onCellSelect, onCellDoubleClick, onCellSave, onDelete }: TableRowProps) => {
  const [editValue, setEditValue] = useState<string>('')
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null)
  const [hoveredCell, setHoveredCell] = useState<string | null>(null)
  const [clickCount, setClickCount] = useState<number>(0)
  const [lastClickTime, setLastClickTime] = useState<number>(0)

  // Debug: Log when component re-renders
  console.log('TableRow re-rendered for item:', item.id, 'item data:', item)


  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout)
      }
    }
  }, [clickTimeout])

  // Update editValue when editing starts for this cell
  useEffect(() => {
    if (editingCell?.rowId === item.id && editingCell?.field) {
      const currentValue = item[editingCell.field] || ''
      setEditValue(currentValue)
    }
  }, [editingCell, item.id]) // Only depend on item.id, not the entire item object

  const getCellStyle = (field: string, baseStyle: any) => {
    const isEditing = editingCell?.rowId === item.id && editingCell?.field === field
    const isSelected = selectedCell?.rowId === item.id && selectedCell?.field === field
    const isFieldModified = changes.fields.includes(field)
    const isNewRow = changes.type === 'new'
    const isRemovedRow = changes.type === 'removed'
    const isHovered = hoveredCell === field
    
    let backgroundColor = baseStyle.backgroundColor
    let border = baseStyle.border
    let boxShadow = 'none'
    let opacity = 1
    
    if (isEditing) {
      backgroundColor = 'rgba(124,192,255,0.2)'
      border = '1px solid rgba(124,192,255,0.6)'
      boxShadow = '0 0 8px rgba(124,192,255,0.3)'
    } else if (isSelected) {
      backgroundColor = 'rgba(124,192,255,0.1)'
      border = '1px solid rgba(124,192,255,0.4)'
      boxShadow = '0 0 4px rgba(124,192,255,0.2)'
    } else if (isRemovedRow) {
      // Red highlighting for removed rows
      backgroundColor = 'rgba(255,80,80,0.15)'
      border = '1px solid rgba(255,80,80,0.4)'
      boxShadow = '0 0 8px rgba(255,80,80,0.2)'
      opacity = 0.7
    } else if (isNewRow) {
      // Green highlighting for new rows
      backgroundColor = 'rgba(76,175,80,0.15)'
      border = '1px solid rgba(76,175,80,0.4)'
      boxShadow = '0 0 8px rgba(76,175,80,0.2)'
    } else if (isFieldModified) {
      // Orange highlighting for modified cells
      backgroundColor = 'rgba(255,165,0,0.15)'
      border = '1px solid rgba(255,165,0,0.4)'
      boxShadow = '0 0 8px rgba(255,165,0,0.2)'
    } else if (isHovered) {
      // Hover highlighting
      backgroundColor = 'rgba(124,192,255,0.08)'
      border = '1px solid rgba(124,192,255,0.3)'
      boxShadow = '0 0 4px rgba(124,192,255,0.15)'
    }
    
    return {
      ...baseStyle,
      backgroundColor,
      border,
      boxShadow,
      opacity,
      cursor: isEditing ? 'text' : 'pointer',
      transition: 'all 0.2s ease'
    }
  }

  const handleCellClick = (field: string, currentValue: string) => {
    console.log('Click detected on field:', field, 'clickCount:', clickCount, 'lastClickTime:', lastClickTime)
    const now = Date.now()
    
    // Clear any existing timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout)
      setClickTimeout(null)
    }
    
    // Check if this is a double click (within 300ms)
    if (now - lastClickTime < 300 && clickCount > 0) {
      console.log('Double click detected via click counting')
      setClickCount(0)
      setLastClickTime(0)
      onCellDoubleClick(item.id, field, currentValue || '')
      return
    }
    
    // Set up for potential double click
    setClickCount(prev => {
      console.log('Incrementing click count from', prev, 'to', prev + 1)
      return prev + 1
    })
    setLastClickTime(now)
    
    // Set a timeout for single click
    const timeout = setTimeout(() => {
      console.log('Single click timeout triggered, selecting cell')
      onCellSelect(item.id, field)
      setClickCount(0)
    }, 300)
    
    setClickTimeout(timeout)
  }

  const handleLocalDoubleClick = (field: string, currentValue: string) => {
    console.log('Double click event detected on field:', field, 'value:', currentValue)
    console.log('About to call onCellDoubleClick with:', { rowId: item.id, field, currentValue })
    
    // Clear single click timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout)
      setClickTimeout(null)
    }
    
    // Reset click counter
    setClickCount(0)
    setLastClickTime(0)
    
    // Double click starts editing
    onCellDoubleClick(item.id, field, currentValue || '')
    console.log('onCellDoubleClick called successfully')
  }

  // Test function that we can call directly
  const testEditFunction = () => {
    console.log('TEST: testEditFunction called')
    console.log('TEST: item.id:', item.id, 'field:', 'Column 1')
    console.log('TEST: calling onCellDoubleClick directly')
    onCellDoubleClick(item.id, 'Column 1', 'test value')
    console.log('TEST: onCellDoubleClick called')
  }

  // Make test function available globally for debugging
  useEffect(() => {
    (window as any).testEditFunction = testEditFunction
    return () => {
      delete (window as any).testEditFunction
    }
  }, [testEditFunction])

  const handleCellMouseDown = (field: string, currentValue: string, e: React.MouseEvent) => {
    // Don't prevent default for double-click to work properly
    // e.preventDefault()
  }

  const handleSave = (field: string) => {
    onCellSave(item.id, field, editValue)
  }

  const handleKeyPress = (e: React.KeyboardEvent, field: string) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSave(field)
    } else if (e.key === 'Enter' && e.shiftKey) {
      // Allow multiline editing with Shift+Enter
      const textarea = e.currentTarget as HTMLTextAreaElement
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const value = textarea.value
      const newValue = value.substring(0, start) + '\n' + value.substring(end)
      setEditValue(newValue)
      // Move cursor to after the newline
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 1
      }, 0)
    } else if (e.key === 'Escape') {
      // Cancel editing by clearing the editing cell
      onCellSave(item.id, field, editValue) // Save current value and exit edit mode
    }
  }

  const renderCell = (field: keyof SagachItem, value: string) => {
    const isEditing = editingCell?.rowId === item.id && editingCell?.field === field
    console.log('renderCell called with:', { 
      field, 
      value, 
      isEditing, 
      itemId: item.id, 
      editingCell,
      item: item,
      itemFieldValue: item[field]
    })
    
    if (isEditing) {
      return (
        <textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => handleSave(field)}
          onKeyDown={(e) => handleKeyPress(e, field)}
          autoFocus
          style={{
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text)',
            fontSize: '13px',
            width: '100%',
            minHeight: '20px',
            maxHeight: '100px',
            resize: 'none',
            textAlign: 'center',
            direction: field === 'name' ? 'rtl' : 'ltr',
            fontFamily: 'inherit',
            lineHeight: '1.4'
          }}
        />
      )
    }
    
    return (
      <div
        onClick={(e) => {
          console.log('Click event on field:', field, 'value:', value, 'item:', item)
          e.stopPropagation()
          handleCellClick(field as string, value)
        }}
        onDoubleClick={(e) => {
          console.log('Double click event on field:', field, 'value:', value)
          e.stopPropagation()
          e.preventDefault()
          console.log('Double click event handler triggered')
          handleLocalDoubleClick(field as string, value)
        }}
        onMouseEnter={() => setHoveredCell(field as string)}
        onMouseLeave={() => setHoveredCell(null)}
        style={{ 
          cursor: 'pointer', 
          display: 'flex',
          width: '100%',
          height: '100%',
          minHeight: '40px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          userSelect: 'none',
          padding: '8px',
          margin: '-8px',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
      >
        <span style={{
          textAlign: 'center',
          width: '100%'
        }}>
          {value}
        </span>
      </div>
    )
  }

  const getRowStyle = () => {
    const isNewRow = changes.type === 'new'
    const isRemovedRow = changes.type === 'removed'
    
    let background = isEven ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)'
    let borderBottom = '1px solid rgba(255,255,255,0.06)'
    let opacity = 1
    
    if (isNewRow) {
      background = 'rgba(76,175,80,0.08)'
      borderBottom = '1px solid rgba(76,175,80,0.3)'
    } else if (isRemovedRow) {
      background = 'rgba(255,80,80,0.08)'
      borderBottom = '1px solid rgba(255,80,80,0.3)'
      opacity = 0.7
    }
    
    return {
      background,
      borderBottom,
      opacity,
      transition: 'background 0.2s ease, opacity 0.2s ease'
    }
  }
  const baseCellStyle = { 
    padding: '10px 12px', 
    border: 'none', 
    textAlign: 'center' as const,
    color: 'var(--text)',
    fontSize: '13px'
  }

  const rowStyle = getRowStyle()
  
  return (
    <tr 
      style={rowStyle}
      onMouseEnter={(e) => {
        if (!editingCell && changes.type !== 'removed') {
          e.currentTarget.style.background = changes.type === 'new' 
            ? 'rgba(76,175,80,0.12)' 
            : 'rgba(255,255,255,0.08)'
        }
      }}
      onMouseLeave={(e) => {
        if (!editingCell) {
          e.currentTarget.style.background = rowStyle.background as string
        }
      }}
    >
      {/* Empty cell for add column button */}
      <td style={{
        width: '80px',
        minWidth: '80px',
        padding: '10px 12px',
        border: 'none',
        textAlign: 'center' as const,
        color: 'var(--text)',
        fontSize: '13px'
      }}>
        {/* Empty space for add column button alignment */}
      </td>
      {tableColumns.map((column, index) => (
        <td 
          key={column}
          style={{
            ...getCellStyle(column, { 
              ...baseCellStyle, 
              direction: index === 0 ? 'rtl' : 'ltr'
            }),
            width: `${columnWidths[column] || 150}px`,
            minWidth: '80px'
          }}
        >
          {index === tableColumns.length - 1 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ flex: 1 }}>
                {renderCell(column, item[column] || '')}
              </span>
              {changes.type === 'removed' ? (
                <span style={{
                  color: '#ff5050',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  marginLeft: '8px'
                }}>
                  הוסר
                </span>
              ) : (
                <button
                  onClick={() => onDelete(item.id)}
                  className="btn ghost"
                  style={{
                    padding: '2px 4px',
                    fontSize: '10px',
                    borderColor: 'rgba(255,80,80,0.4)',
                    color: '#ff5050',
                    marginLeft: '8px',
                    minWidth: 'auto',
                    width: '20px',
                    height: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="מחק רשומה"
                >
                  🗑
                </button>
              )}
            </div>
          ) : (
            renderCell(column, item[column] || '')
          )}
        </td>
      ))}
    </tr>
  )
}

interface SagachCardProps {
  sagach: SagachTable
  isSelected: boolean
  onSelect: () => void
}

const SagachCard = ({ sagach, isSelected, onSelect }: SagachCardProps) => {

  return (
    <div
      style={{
        background: isSelected 
          ? 'linear-gradient(180deg, rgba(124,192,255,0.15), rgba(124,192,255,0.08))'
          : 'rgba(255,255,255,0.06)',
        border: isSelected 
          ? '1px solid rgba(124,192,255,0.6)' 
          : '1px solid rgba(255,255,255,0.14)',
        borderRadius: '12px',
        padding: '12px',
        transition: 'all 0.2s ease',
        boxShadow: isSelected 
          ? '0 6px 22px rgba(124,192,255,0.24)'
          : '0 4px 12px rgba(0,0,0,0.2)'
      }}
    >
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        marginBottom: '8px'
      }}>
        <div
          onClick={onSelect}
          style={{
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--text)',
            direction: 'rtl',
            flex: 1
          }}
        >
          {sagach.name}
        </div>
      </div>

      {/* Summary */}
      <div style={{ 
        fontSize: '12px', 
        color: 'var(--muted)', 
        marginBottom: '8px',
        direction: 'rtl'
      }}>
        {sagach.data.length} רשומות
      </div>
    </div>
  )
}
