import { useCallback, useEffect, useRef, useState } from 'react'
import { Workbook } from 'exceljs'

function hexToARGB(hex: string): string {
  const normalized = hex.replace('#', '')
  const r = normalized.substring(0, 2)
  const g = normalized.substring(2, 4)
  const b = normalized.substring(4, 6)
  return `FF${r}${g}${b}`
}

// Color options for cubes with matching glows
const CUBE_COLORS = {
  default: { bg: 'linear-gradient(180deg, rgba(124,192,255,0.18), rgba(124,192,255,0.08))' },
  green: { bg: '#4CAF50' },
  red: { bg: '#F44336' },
  yellow: { bg: '#E6A700' }
}

export function ExcelExtractor() {
  const fontName = 'Segoe UI'
  const fontSize = 14
  const headerTextColor = '#ffffff'
  const headerBgColor = '#2a6bff'

  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const mappingFileInputRef = useRef<HTMLInputElement | null>(null)
  const dragImageRef = useRef<HTMLDivElement | null>(null)
  const [excelFields, setExcelFields] = useState<Array<{
    id: string
    name: string
    fieldType: string
    fieldEssence: string
    dgh: string
    always: string
    notes: string
    expanded?: boolean
    isMapped?: boolean
    mappedTargetLabel?: string
    color?: keyof typeof CUBE_COLORS
  }>>([])
  
  // Add state for inline editing
  const [editingField, setEditingField] = useState<{ id: string; field: 'fieldEssence' | 'dgh' | 'always' | 'notes' } | null>(null)
  const [editValue, setEditValue] = useState<string>('')

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean
    x: number
    y: number
    fieldId: string
  } | null>(null)

  // Function to handle cube color change
  const handleColorChange = useCallback((fieldId: string, color: keyof typeof CUBE_COLORS) => {
    setExcelFields(prev => prev.map(field => 
      field.id === fieldId ? { ...field, color } : field
    ))
    setContextMenu(null)
    
    // Add animation class to the cube
    const cubeElement = document.querySelector(`[data-field-id="${fieldId}"]`) as HTMLElement
    if (cubeElement) {
      cubeElement.classList.add('color-changed')
      setTimeout(() => {
        cubeElement.classList.remove('color-changed')
      }, 600)
    }
    
    // Show success feedback
    const field = excelFields.find(f => f.id === fieldId)
    if (field) {
      const colorNames = {
        default: 'Default Blue',
        green: 'Green',
        red: 'Red',
        yellow: 'Yellow'
      }
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: `Cube "${field.name}" color changed to ${colorNames[color]}`, 
          type: 'ok', 
          durationMs: 2000 
        } 
      }))
    }
  }, [excelFields])

  // Function to handle right-click on cube
  const handleCubeRightClick = useCallback((e: React.MouseEvent, fieldId: string) => {
    e.preventDefault()
    
    // Calculate position to ensure menu stays on screen
    const menuWidth = 140
    const menuHeight = 200
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    
    let x = e.clientX
    let y = e.clientY
    
    // Adjust X position if menu would go off right edge
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 10
    }
    
    // Adjust Y position if menu would go off bottom edge
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 10
    }
    
    setContextMenu({
      visible: true,
      x,
      y,
      fieldId
    })
  }, [excelFields])

  // Function to cancel editing
  const handleCancelEditing = useCallback(() => {
    setEditingField(null)
    setEditValue('')
  }, [])

  // Function to handle saving edited field values
  const handleSaveFieldValue = useCallback((fieldId: string, fieldType: 'fieldEssence' | 'dgh' | 'always' | 'notes', newValue: string) => {
    try {
      // Trim the value and handle empty strings
      const trimmedValue = newValue.trim()
      
      setExcelFields(prev => prev.map(field => 
        field.id === fieldId 
          ? { ...field, [fieldType]: trimmedValue }
          : field
      ))
      setEditingField(null)
      setEditValue('')
      
      // Log the change for debugging
      const fieldNames = {
        fieldEssence: 'Field Essence',
        dgh: 'DGH',
        always: 'Always Return',
        notes: 'Notes'
      }
      console.log(`${fieldNames[fieldType]} updated for field ${fieldId}:`, trimmedValue || '(empty)')
      
      // Show a brief success feedback
      const field = excelFields.find(f => f.id === fieldId)
      if (field) {
        const message = trimmedValue 
          ? `${fieldNames[fieldType]} updated for "${field.name}"`
          : `${fieldNames[fieldType]} cleared for "${field.name}"`
        window.dispatchEvent(new CustomEvent('excel:status', { 
          detail: { 
            message, 
            type: 'ok', 
            durationMs: 2000 
          } 
        }))
      }
    } catch (error) {
      console.error(`Failed to update ${fieldType}:`, error)
      // Keep editing mode on error so user can retry
      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: `Failed to update ${fieldType}: ${error}`, 
          type: 'error', 
          durationMs: 3000 
        } 
      }))
    }
  }, [excelFields])

  // Function to close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => closeContextMenu()
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeContextMenu()
      }
    }
    
    document.addEventListener('click', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)
    
    return () => {
      document.removeEventListener('click', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [closeContextMenu])

  const onDownloadTemplate = useCallback(async () => {
    try {
      const headers = [
        'שם שדה',
        'סוג שדה',
        'מהות השדה',
        'דג"ח',
        'האם יחזור תמיד?',
        'הערות'
      ]

      const workbook = new Workbook()
      const worksheet = workbook.addWorksheet('Template', {
        views: [{ rightToLeft: true }]
      })

      // Column widths by header length
      headers.forEach((h, idx) => {
        const col = worksheet.getColumn(idx + 1)
        col.width = Math.max(18, h.length + 2)
        col.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        ;(col as any).font = { name: fontName, size: fontSize }
      })

      // Header row
      worksheet.addRow(headers)
      const headerRow = worksheet.getRow(1)
      headerRow.height = 50
      headerRow.eachCell((cell: any) => {
        cell.font = {
          name: fontName,
          size: fontSize,
          bold: true,
          color: { argb: hexToARGB(headerTextColor) }
        }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: hexToARGB(headerBgColor) }
        }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      })

      // Pre-create bordered empty rows to give full-column borders in the template
      const templateDataRows = 50
      for (let r = 2; r <= 1 + templateDataRows; r++) {
        const row = worksheet.getRow(r)
        headers.forEach((_, cIdx) => {
          const cell = row.getCell(cIdx + 1)
          cell.font = { name: fontName, size: fontSize }
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' }
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        })
      }

      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'PaaS Template.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to generate template:', err)
      alert('Failed to generate template. Check console for details.')
    }
  }, [])
  
  // Helper to compute full hierarchy label from a target node id (e.g., "a.b.c:42" -> "a -> b -> c")
  const getFullHierarchyLabel = (targetNode?: { id?: string; name?: string; path?: string } | null): string => {
    try {
      if (!targetNode) return ''
      // Prefer explicit path from imported mapping (e.g., "a.b.c")
      const explicitPath = (targetNode as any)?.path
      if (typeof explicitPath === 'string' && explicitPath.trim()) {
        return explicitPath.trim().split('.').join(' -> ')
      }
      const rawId = String(targetNode.id || '').trim()
      if (!rawId) return targetNode.name || ''
      const pathPart = rawId.split(':')[0]
      if (!pathPart || pathPart === 'root') return targetNode.name || ''
      // If the id does not encode a hierarchy (no dots), prefer the actual node name
      if (!pathPart.includes('.')) return targetNode.name || ''
      return pathPart.split('.').join(' -> ')
    } catch (e) {
      console.error('Failed to compute full hierarchy label for targetNode:', e, targetNode)
      return targetNode?.name || ''
    }
  }

  // Generate mapping Excel workbook (can be used by other processes)
  const generateMappingWorkbook = useCallback(async (data?: any[], savedMappings?: any[], schemaKey?: string) => {
    try {
      // Create 5 headers with specific names
      const headers = ['שם שדה צד ספק', 'מהות השדה', 'סוג השדה צד ספק','דג"ח', 'שם השדה בתקן', 'סוג השדה בתקן', 'חוקי השדה בתקן','האם יחזור תמיד', 'פירוט הפרסר', 'המיפוי יתבצע בOUTPUTS הבאים:', 'הערות', 'האם צריך להזרים מהספק?']

      const workbook = new Workbook()
      const worksheet = workbook.addWorksheet('mapping', {
        views: [{ rightToLeft: true }]
      })

      // Columns formatting with specific widths and wrap text
      headers.forEach((h, idx) => {
        const col = worksheet.getColumn(idx + 1)
        
        // Set specific column widths for certain columns
        if (idx === 0) { // שם שדה צד ספק
          col.width = 33
        } else if (idx === 3) { // דג"ח
          col.width = 45
        } else if (idx === 4) { // שם השדה בתקן
          col.width = 50
        } else {
          col.width = Math.max(18, h.length + 2)
        }
        
        col.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
        ;(col as any).font = { name: fontName, size: fontSize }
      })

      // Header row styling identical to template
      worksheet.addRow(headers)
      const headerRow = worksheet.getRow(1)
      headerRow.height = 50
      headerRow.eachCell((cell: any) => {
        cell.font = {
          name: fontName,
          size: fontSize,
          bold: true,
          color: { argb: hexToARGB(headerTextColor) }
        }
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: hexToARGB(headerBgColor) }
        }
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      })

      // Build a quick-lookup map for the latest mapping per field identity (name + type)
      const mappingByFieldKey = new Map<string, any>()
      if (savedMappings && Array.isArray(savedMappings)) {
        savedMappings.forEach((m: any) => {
          const k = `${m?.field?.name || ''}__${m?.field?.fieldType || ''}`
          // Overwrite to ensure the last occurrence wins (latest mapping)
          mappingByFieldKey.set(k, m)
        })
      }

      // Prefer current field cubes (excelFields) as the most up-to-date source
      if (excelFields && excelFields.length > 0) {
        const list = excelFields
        list.forEach((f) => {
          const matched = mappingByFieldKey.get(`${f.name}__${f.fieldType}`)
          const hasTarget = !!(matched && ((matched?.targetNode?.name && String(matched.targetNode.name).trim()) || (matched?.targetNode as any)?.path))
          const isMapped = !!hasTarget || !!f.isMapped
          const excelRow = [
            f.name || '',                    // שם שדה צד ספק
            f.fieldEssence || '',            // מהות השדה
            f.fieldType || '',               // סוג שדה צד ספק
            f.dgh || '',                     // דג"ח
            getFullHierarchyLabel(matched?.targetNode) || '', // שם השדה בתקן
            matched?.targetNode?.type || '', // סוג השדה בתקן
            matched?.targetNode?.rules ? matched.targetNode.rules.join(', ') : '', // חוקי השדה בתקן
            f.always || '',                  // האם יחזור תמיד
            matched?.mappingDetails || '',   // פירוט הפרסר
            matched?.outputs || '',          // המיפוי יתבצע בOUTPUTS הבאים:
            f.notes || '',                   // הערות
            ''                               // האם צריך להזרים מהספק?
          ]
          const row = worksheet.addRow(excelRow)
          // If user colored the field cube yellow/red, tint the entire row accordingly
          try {
            if (f.color === 'yellow' || f.color === 'red') {
              const colorHex = f.color === 'yellow' ? '#E6A700' : '#F44336'
              row.eachCell((cell: any) => {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: hexToARGB(colorHex) }
                }
              })
            }
          } catch (e) {
            console.warn('Failed to apply colored row background:', e)
          }
          headers.forEach((_, cIdx) => {
            const cell = row.getCell(cIdx + 1)
            cell.font = { name: fontName, size: fontSize }
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            }
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            // Special styling for the last column (האם צריך להזרים מהספק?)
            if (cIdx === headers.length - 1) {
              // If mapped → green; otherwise reflect cube color (yellow/red) or white for default
              const lastColArgb = isMapped
                ? 'FF90EE90'
                : (f.color === 'yellow' ? hexToARGB('#E6A700') : (f.color === 'red' ? hexToARGB('#F44336') : 'FFFFFFFF'))
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: lastColArgb }
              }
            }
          })
        })
      } else if (data && data.length > 0) {
        data.forEach((rowData, rowIdx) => {
          const row = worksheet.addRow(rowData)
          headers.forEach((_, cIdx) => {
            const cell = row.getCell(cIdx + 1)
            cell.font = { name: fontName, size: fontSize }
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            }
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            
            // Special styling for the last column (האם צריך להזרים מהספק?) - white background for unmapped template rows
            if (cIdx === headers.length - 1) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFFFFFFF' }
              }
            }
          })
        })
      } else if (savedMappings && savedMappings.length > 0) {
        // Use saved mappings to generate Excel rows
        console.log('Processing saved mappings for Excel generation:', savedMappings)
        savedMappings.forEach((mapping, index) => {
          console.log(`Processing mapping ${index + 1}:`, mapping)
          const excelRow = [
            mapping.field.name || '', // שם שדה צד ספק
            mapping.field.fieldEssence || '', // מהות השדה
            mapping.field.fieldType || '', // סוג שדה צד ספק
            mapping.field.dgh || '', // דג"ח
            getFullHierarchyLabel(mapping.targetNode) || '', // שם השדה בתקן
            mapping.targetNode.type || '', // סוג השדה בתקן
            mapping.targetNode.rules ? mapping.targetNode.rules.join(', ') : '', // חוקי השדה בתקן
            mapping.field.always || '', // האם יחזור תמיד
            mapping.mappingDetails || '', // פירוט הפרסר
            mapping.outputs || '', // המיפוי יתבצע בOUTPUTS הבאים:
            (mapping.field && mapping.field.notes) ? mapping.field.notes : '', // הערות
            '' // האם צריך להזרים מהספק? (empty cell, will be colored green)
          ]
          console.log(`Generated Excel row ${index + 1}:`, excelRow)
          
          const row = worksheet.addRow(excelRow)
          // If user colored this field yellow/red in the UI state (if available), tint row
          try {
            const f = excelFields?.find(ff => ff.name === mapping.field.name && ff.fieldType === mapping.field.fieldType)
            if (f && (f.color === 'yellow' || f.color === 'red')) {
              const colorHex = f.color === 'yellow' ? '#E6A700' : '#F44336'
              row.eachCell((cell: any) => {
                cell.fill = {
                  type: 'pattern',
                  pattern: 'solid',
                  fgColor: { argb: hexToARGB(colorHex) }
                }
              })
            }
          } catch (e) {
            console.warn('Failed to apply colored row background (savedMappings branch):', e)
          }
          headers.forEach((_, cIdx) => {
            const cell = row.getCell(cIdx + 1)
            cell.font = { name: fontName, size: fontSize }
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            }
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
            
            // Special styling for the last column (האם צריך להזרים מהספק?) - green only if truly mapped
            if (cIdx === headers.length - 1) {
              const hasTarget = !!((mapping?.targetNode?.name && String(mapping.targetNode.name).trim()) || (mapping?.targetNode as any)?.path)
              const isMapped = !!hasTarget
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: isMapped ? 'FF90EE90' : 'FFFFFFFF' }
              }
            }
          })
        })
        console.log(`Added ${savedMappings.length} rows to Excel worksheet`)
      } else {
        // Empty body rows with borders to mirror template
        console.log('No saved mappings found, creating empty template rows')
        const templateDataRows = 50
        for (let r = 2; r <= 1 + templateDataRows; r++) {
          const row = worksheet.getRow(r)
          headers.forEach((_, cIdx) => {
            const cell = row.getCell(cIdx + 1)
            cell.font = { name: fontName, size: fontSize }
            cell.border = {
              top: { style: 'thin' },
              left: { style: 'thin' },
              bottom: { style: 'thin' },
              right: { style: 'thin' }
            }
            cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
          })
        }
      }

      // Embed selected schema key in a hidden meta sheet for later import
      if (schemaKey) {
        const metaSheet = workbook.addWorksheet('__meta')
        metaSheet.getCell('A1').value = 'schemaKey'
        metaSheet.getCell('B1').value = schemaKey
        ;(metaSheet as any).state = 'veryHidden'
      }

      return workbook
    } catch (err) {
      console.error('Failed to generate mapping workbook:', err)
      throw err
    }
  }, [excelFields])

  const onDownloadMapping = useCallback(async () => {
    try {
      // Get saved mappings directly from the global state
      console.log('Getting saved mappings from global state...')
      
      // Use a global variable to store mappings temporarily
      let savedMappings: any[] = []
      
      // Request saved mappings from the main app
      const mappingsEvent = new CustomEvent('excel:request-mappings', {
        detail: { callback: (mappings: any[]) => { savedMappings = mappings } }
      })
      window.dispatchEvent(mappingsEvent)
      
      // Wait a bit for the callback to be executed
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Request currently selected schema from the main app
      let selectedSchemaKey: string = ''
      const schemaEvent = new CustomEvent('excel:request-selected-schema', {
        detail: { callback: (key: string) => { selectedSchemaKey = key } }
      })
      window.dispatchEvent(schemaEvent)
      await new Promise(resolve => setTimeout(resolve, 50))

      console.log('Final saved mappings for Excel generation:', savedMappings)
      const workbook = await generateMappingWorkbook(undefined, savedMappings, selectedSchemaKey)
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'mapping.xlsx'
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download mapping excel:', err)
      // Fail gracefully and surface error for debugging per user rule
      window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: `Failed to download mapping excel: ${err}`, type: 'error', durationMs: 5000 } }))
    }
  }, [generateMappingWorkbook])

  const onUploadMappingFile = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer()
      const wb = new Workbook()
      await wb.xlsx.load(buffer)
      // Try to read schema key from hidden meta sheet
      let importedSchemaKey = ''
      try {
        const meta = wb.getWorksheet('__meta')
        if (meta) {
          const keyCell = meta.getCell('B1')
          const v = keyCell?.value
          if (typeof v === 'string') importedSchemaKey = v.trim()
          if (!importedSchemaKey && typeof v === 'object' && v && 'text' in (v as any)) {
            importedSchemaKey = String((v as any).text || '').trim()
          }
        }
      } catch (e) {
        console.warn('No __meta sheet found in mapping file or failed to read schema key')
      }

      const ws = wb.worksheets[0]
      if (!ws) throw new Error('No worksheet found in uploaded mapping file')

      // Read headers from row 1, map to indices
      const headerRow = ws.getRow(1)
      const headerToIndex: Record<string, number> = {}
      headerRow.eachCell((cell, colNumber) => {
        const key = String(cell.value ?? '').trim()
        if (key) headerToIndex[key] = colNumber
      })

      const getIdx = (names: string[]) => {
        for (const n of names) {
          if (headerToIndex[n] != null) return headerToIndex[n]
        }
        return -1
      }

      const idxSourceName = getIdx(['שם שדה צד ספק'])
      const idxEssence = getIdx(['מהות השדה'])
      const idxSourceType = getIdx(['סוג השדה צד ספק'])
      const idxDgh = getIdx(['דג"ח', 'דג"ח', 'דג\"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח', 'דג"ח'])
      const idxTargetName = getIdx(['שם השדה בתקן'])
      const idxTargetType = getIdx(['סוג השדה בתקן'])
      const idxRules = getIdx(['חוקי השדה בתקן'])
      const idxAlways = getIdx(['האם יחזור תמיד'])
      const idxMappingDetails = getIdx(['פירוט הפרסר'])
      const idxOutputs = getIdx(['המיפוי יתבצע בOUTPUTS הבאים:'])
      const idxNotes = getIdx(['הערות'])

      const importedMappings: any[] = []
      const updatedFieldsMap = new Map<string, any>()
      // Seed with existing fields to preserve IDs
      excelFields.forEach(f => {
        updatedFieldsMap.set(`${f.name}__${f.fieldType}`, { ...f })
      })

      const rowCount = ws.rowCount
      for (let r = 2; r <= rowCount; r++) {
        const row = ws.getRow(r)
        // Detect if the entire row was highlighted yellow in the exported workbook
        const isRowYellow = (() => {
          try {
            let flagged = false
            row.eachCell((cell: any) => {
              const fill = (cell && cell.fill) || null
              const argb = (fill && fill.fgColor && (fill.fgColor.argb || fill.fgColor.rgb)) || ''
              if (typeof argb === 'string' && argb) {
                const v = argb.toUpperCase()
                if (v === hexToARGB('#E6A700').toUpperCase() || v === 'FFE6A700') {
                  flagged = true
                }
              }
            })
            return flagged
          } catch {
            return false
          }
        })()
        // Detect if the entire row was highlighted red in the exported workbook
        const isRowRed = (() => {
          try {
            let flagged = false
            row.eachCell((cell: any) => {
              const fill = (cell && cell.fill) || null
              const argb = (fill && fill.fgColor && (fill.fgColor.argb || fill.fgColor.rgb)) || ''
              if (typeof argb === 'string' && argb) {
                const v = argb.toUpperCase()
                if (v === hexToARGB('#F44336').toUpperCase() || v === 'FFF44336') {
                  flagged = true
                }
              }
            })
            return flagged
          } catch {
            return false
          }
        })()
        const sourceName = idxSourceName > 0 ? String(row.getCell(idxSourceName).value ?? '').trim() : ''
        const sourceType = idxSourceType > 0 ? String(row.getCell(idxSourceType).value ?? '').trim() : ''
        const essence = idxEssence > 0 ? String(row.getCell(idxEssence).value ?? '').trim() : ''
        const dgh = idxDgh > 0 ? String(row.getCell(idxDgh).value ?? '').trim() : ''
        const targetNameRaw = idxTargetName > 0 ? String(row.getCell(idxTargetName).value ?? '').trim() : ''
        // Accept either a plain leaf name or a full hierarchy label like "a -> b -> c" and extract the leaf
        const parseTarget = (() => {
          try {
            if (!targetNameRaw) return ''
            if (targetNameRaw.includes('->')) {
              const parts = targetNameRaw.split('->').map(s => s.trim()).filter(Boolean)
              const leaf = parts.length ? parts[parts.length - 1] : targetNameRaw
              // Convert visual label back to dot path for round-trip
              const dotPath = parts.join('.')
              return { targetName: leaf, targetPath: dotPath }
            }
            return { targetName: targetNameRaw, targetPath: '' }
          } catch (e) {
            console.error('Failed to parse target name from imported mapping row:', e, targetNameRaw)
            return { targetName: targetNameRaw, targetPath: '' }
          }
        })()
        const targetName = typeof parseTarget === 'object' && parseTarget ? (parseTarget as any).targetName : ''
        const targetPath = typeof parseTarget === 'object' && parseTarget ? (parseTarget as any).targetPath : ''
        const targetType = idxTargetType > 0 ? String(row.getCell(idxTargetType).value ?? '').trim() : ''
        const rules = idxRules > 0 ? String(row.getCell(idxRules).value ?? '').trim() : ''
        const always = idxAlways > 0 ? String(row.getCell(idxAlways).value ?? '').trim() : ''
        const mappingDetails = idxMappingDetails > 0 ? String(row.getCell(idxMappingDetails).value ?? '').trim() : ''
        const outputs = idxOutputs > 0 ? String(row.getCell(idxOutputs).value ?? '').trim() : ''
        const notes = idxNotes > 0 ? String(row.getCell(idxNotes).value ?? '').trim() : ''

        const isRowEmpty = ![sourceName, sourceType, essence, dgh, targetName, targetType, rules, always, mappingDetails, outputs, notes].some(Boolean)
        if (isRowEmpty) continue

        const key = `${sourceName}__${sourceType}`
        const existing = updatedFieldsMap.get(key)
        if (existing) {
          existing.fieldEssence = essence || existing.fieldEssence || ''
          existing.dgh = dgh || existing.dgh || ''
          existing.always = always || existing.always || ''
          existing.notes = notes || existing.notes || ''
          if (targetName || mappingDetails || outputs) {
            existing.isMapped = true
            existing.mappedTargetLabel = getFullHierarchyLabel({ id: '', name: targetName, path: targetPath }) || ''
            // preserve explicit tint if present
            existing.color = isRowYellow ? 'yellow' : (isRowRed ? 'red' : existing.color || 'green')
          } else if (isRowYellow || isRowRed) {
            // Allow yellow highlighting even if not mapped
            existing.color = isRowYellow ? 'yellow' : 'red'
          }
          updatedFieldsMap.set(key, existing)
        } else {
          updatedFieldsMap.set(key, {
            id: `excel-imported-${updatedFieldsMap.size + 1}`,
            name: sourceName || `Field_${updatedFieldsMap.size + 1}`,
            fieldType: sourceType || '',
            fieldEssence: essence || '',
            dgh: dgh || '',
            always: always || '',
            notes: notes || '',
            expanded: false,
            isMapped: !!(targetName || mappingDetails || outputs),
            mappedTargetLabel: (targetName || mappingDetails || outputs) ? (getFullHierarchyLabel({ id: '', name: targetName, path: targetPath }) || '') : undefined,
            color: isRowYellow ? 'yellow' : (isRowRed ? 'red' : ((targetName || mappingDetails || outputs) ? 'green' : 'default'))
          })
        }

        // Build a mapping record compatible with App's savedMappings
        importedMappings.push({
          targetNode: {
            id: `import-${r}`,
            name: targetName,
            type: targetType,
            rules: rules ? rules.split(',').map(s => s.trim()).filter(Boolean) : [],
            // Store extracted path to enable exact path matching and round-trip export
            ...(targetPath ? { path: targetPath } : {})
          },
          field: {
            name: sourceName,
            fieldType: sourceType,
            fieldEssence: essence,
            dgh,
            always,
            notes
          },
          mappingDetails,
          outputs,
          timestamp: Date.now()
        })
      }

      const updatedFields = Array.from(updatedFieldsMap.values())
      setExcelFields(updatedFields)

      // Announce for App to persist mappings
      window.dispatchEvent(new CustomEvent('excel:mappings-imported', { detail: { mappings: importedMappings } }))

      // If a schema key was embedded, ask App to apply and visualize it
      if (importedSchemaKey) {
        window.dispatchEvent(new CustomEvent('excel:apply-selected-schema', { detail: { key: importedSchemaKey } }))
      }

      window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: `Mapping file loaded. ${updatedFields.length} fields refreshed`, type: 'ok', durationMs: 4000 } }))
    } catch (err) {
      console.error('Failed to parse mapping Excel:', err)
      window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: 'Failed to parse mapping Excel', type: 'error', durationMs: 5000 } }))
    }
  }, [excelFields])

  const onUploadFilled = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer()
      const wb = new Workbook()
      await wb.xlsx.load(buffer)
      const ws = wb.worksheets[0]
      if (!ws) throw new Error('No worksheet found in uploaded file')

      // Expect headers in row 1 matching the template
      const rows: Array<{ name: string; type: string; essence: string; dgh: string; always: string; notes: string }> = []
      const rowCount = ws.rowCount
      for (let r = 2; r <= rowCount; r++) {
        const name = String(ws.getRow(r).getCell(1).value ?? '').trim()
        const type = String(ws.getRow(r).getCell(2).value ?? '').trim()
        const essence = String(ws.getRow(r).getCell(3).value ?? '').trim()
        const dgh = String(ws.getRow(r).getCell(4).value ?? '').trim()
        const always = String(ws.getRow(r).getCell(5).value ?? '').trim()
        const notes = String(ws.getRow(r).getCell(6).value ?? '').trim()
        if (!name && !type && !essence && !dgh && !always && !notes) continue
        rows.push({ name, type, essence, dgh, always, notes })
      }

      // Local excel fields list for the extractor panel
      const localFields: Array<{ id: string; name: string; fieldType: string; fieldEssence: string; dgh: string; always: string; notes: string; expanded?: boolean; color?: keyof typeof CUBE_COLORS }> = []
      rows.forEach((row, idx) => {
        localFields.push({
          id: `excel-${idx + 1}`,
          name: row.name || `Field_${idx + 1}`,
          fieldType: row.type || '',
          fieldEssence: row.essence || '',
          dgh: row.dgh || '',
          always: row.always || '',
          notes: row.notes || '',
          expanded: false,
          color: 'default'
        })
      })
      setExcelFields(localFields)

      // Count only non-empty data rows (at least one value)
      const totalRows = rows.length
      const fieldsExtracted = localFields.length

      // Build message and type for global toast
      let toastMessage = ''
      let toastType: 'ok' | 'warn' | 'error' = 'ok'
      if (totalRows === 0) {
        toastMessage = "האקסל ריק או שלא הצלחתי לקרוא אותו :("
        toastType = 'error'
      } else if (fieldsExtracted === totalRows) {
        toastMessage = `אקסל הועלה בהצלחה! ${fieldsExtracted} שדות חולצו מתוך ${totalRows} שורות באקסל.`
        toastType = 'ok'
      } else {
        toastMessage = `אקסל הועלה בהצלחה! ${fieldsExtracted} שדות חולצו מתוך ${totalRows} שורות באקסל.`
        toastType = 'warn'
      }

      // Emit global status toast
      window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: toastMessage, type: toastType, durationMs: 5000 } }))

      // Show header actions only if at least one field was extracted
      if (fieldsExtracted > 0) {
        window.dispatchEvent(new CustomEvent('excel:uploaded'))
      }

      // Do not visualize in the main tree; excel fields are separate cubes only
    } catch (err) {
      console.error('Failed to parse uploaded Excel:', err)
      window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: "Excel is empty or couldn't read it", type: 'error', durationMs: 5000 } }))
    }
  }, [])

  // Clear all Excel cubes and any local editing/context state
  const clearExtractor = useCallback(() => {
    try {
      setExcelFields([])
      setEditingField(null)
      setEditValue('')
      setContextMenu(null)
      if (dragImageRef.current) {
        try { dragImageRef.current.remove() } catch {}
        dragImageRef.current = null
      }
      // Ask the main app to clear all mappings from the tree as well
      window.dispatchEvent(new Event('excel:clear-all-mappings'))
      // Announce clear action
      window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: 'נוקה ממשק הדג"ח', type: 'ok', durationMs: 2500 } }))
    } catch (err) {
      console.error('Failed to clear Excel extractor:', err)
      window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: `ניקוי נכשל: ${err}`, type: 'error', durationMs: 4000 } }))
    }
  }, [])

  // Listen for header button requests (relay from App header)
  useEffect(() => {
    const onDownloadReq = () => { onDownloadTemplate() }
    const onDownloadMappingReq = () => { onDownloadMapping() }
    const onUploadReq = () => { fileInputRef.current?.click() }
    const onUploadMappingReq = () => { mappingFileInputRef.current?.click() }
    const onSaveMappingReq = async (e: CustomEvent) => {
      try {
        const { data, filename = 'mapping.xlsx' } = e.detail || {}
        // Request currently selected schema from the main app
        let selectedSchemaKey: string = ''
        const schemaEvent = new CustomEvent('excel:request-selected-schema', {
          detail: { callback: (key: string) => { selectedSchemaKey = key } }
        })
        window.dispatchEvent(schemaEvent)
        await new Promise(resolve => setTimeout(resolve, 50))

        const workbook = await generateMappingWorkbook(data, undefined, selectedSchemaKey)
        const buffer = await workbook.xlsx.writeBuffer()
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      } catch (err) {
        console.error('Failed to save mapping excel:', err)
        alert('Failed to save mapping excel. Check console for details.')
      }
    }

    const onMappingSaved = (e: CustomEvent) => {
      const { field, targetNode } = e.detail || {}
      if (field) {
        setExcelFields(prev => prev.map(f => {
          if (f.name === field.name && f.fieldType === field.fieldType) {
            const label = getFullHierarchyLabel(targetNode)
            return { ...f, isMapped: true, mappedTargetLabel: label || undefined, color: f.color || 'default' }
          }
          return f
        }))
      }
    }
    
    window.addEventListener('excel:download-template-request', onDownloadReq as EventListener)
    window.addEventListener('excel:download-mapping-request', onDownloadMappingReq as EventListener)
    window.addEventListener('excel:upload-request', onUploadReq as EventListener)
    window.addEventListener('excel:upload-mapping-request', onUploadMappingReq as EventListener)
    window.addEventListener('excel:save-mapping-request', onSaveMappingReq as unknown as EventListener)
    window.addEventListener('excel:mapping-saved', onMappingSaved as EventListener)
    return () => {
      window.removeEventListener('excel:download-template-request', onDownloadReq as EventListener)
      window.removeEventListener('excel:download-mapping-request', onDownloadMappingReq as EventListener)
      window.removeEventListener('excel:upload-request', onUploadReq as EventListener)
      window.removeEventListener('excel:upload-mapping-request', onUploadMappingReq as EventListener)
      window.removeEventListener('excel:save-mapping-request', onSaveMappingReq as unknown as EventListener)
      window.removeEventListener('excel:mapping-saved', onMappingSaved as EventListener)
    }
  }, [onDownloadTemplate, onDownloadMapping, generateMappingWorkbook])

  return (
    <aside className="fridge-panel">
              <div className="fridge-door">
          <div className="fridge-handle" />
          <div className="fridge-title">פרק תדג"ח</div>
          <div className="fridge-subtitle">שדות מהדג"ח</div>
          <div className="fridge-divider" />
          
          {/* Excel Fields displayed at the top */}
          {excelFields.length > 0 && (
            <div className="excel-fields" onDragOver={(e) => { e.preventDefault() }}>
              <div className="excel-fields-list">
                {excelFields.map((f, idx) => (
                  <div
                    key={f.id}
                    data-field-id={f.id}
                    data-color={f.color}
                    className={`excel-cube ${f.expanded ? 'open' : ''} ${f.isMapped ? 'mapped' : ''} ${editingField?.id === f.id ? 'editing' : ''}`}
                    draggable
                    title="Right-click to change color"
                    style={{
                      background: f.isMapped ? undefined : (f.color ? CUBE_COLORS[f.color].bg : CUBE_COLORS.default.bg),
                      boxShadow: f.isMapped ? undefined : '0 4px 12px rgba(0,0,0,0.2)'
                    }}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/json', JSON.stringify({ kind: 'excelField', field: f }))
                      e.dataTransfer.setData('application/vnd.excel-field', '1')
                      e.dataTransfer.effectAllowed = 'copy'
                      ;(window as any).__excelDragging = true
                      window.dispatchEvent(new CustomEvent('excel:drag-start', { detail: f }))

                      // Create a custom drag image that follows the cursor (Chrome-compatible)
                      try {
                        if (dragImageRef.current) {
                          dragImageRef.current.remove()
                          dragImageRef.current = null
                        }
                        const srcEl = e.currentTarget as HTMLElement
                        const clone = srcEl.cloneNode(true) as HTMLDivElement
                        clone.style.position = 'absolute'
                        clone.style.top = '-1000px'
                        clone.style.left = '-1000px'
                        clone.style.pointerEvents = 'none'
                        clone.style.transform = 'none'
                        clone.style.boxShadow = '0 10px 28px rgba(0,0,0,0.36)'
                        clone.style.color = '#ffffff'
                        clone.style.filter = 'saturate(1.1) brightness(1.05)'
                        clone.style.opacity = '0.95'
                        document.body.appendChild(clone)
                        dragImageRef.current = clone
                        const rect = clone.getBoundingClientRect()
                        const offsetX = rect.width / 2
                        const offsetY = rect.height / 2
                        if (e.dataTransfer.setDragImage) {
                          e.dataTransfer.setDragImage(clone, offsetX, offsetY)
                        }
                      } catch (err) {
                        console.debug('Failed to set custom drag image', err)
                      }
                    }}
                    onDragEnd={() => {
                      ;(window as any).__excelDragging = false
                      window.dispatchEvent(new Event('excel:drag-end'))
                      if (dragImageRef.current) {
                        try { dragImageRef.current.remove() } catch {}
                        dragImageRef.current = null
                      }
                    }}
                    onClick={(e) => {
                      // Check if the click is on an editable field
                      const target = e.target as HTMLElement
                      const isEditableField = target.closest('.editable-field') || target.closest('input') || target.closest('textarea')
                      
                      // If clicking on an editable field, don't toggle the cube
                      if (isEditableField) {
                        e.stopPropagation()
                        return
                      }
                      
                      setExcelFields((prev) => prev.map((x, i) => i === idx ? { ...x, expanded: !x.expanded } : x))
                    }}
                    onContextMenu={(e) => {
                      handleCubeRightClick(e, f.id)
                    }}
                  >
                    <div className="excel-cube-head" style={{ position: 'relative' }}>
                      <div className="excel-cube-name">{f.name}</div>
                      {f.fieldType && <div className="excel-cube-sub">{f.fieldType}</div>}
                      {f.isMapped && (
                        <div 
                          className="mapping-checkmark"
                          title="Field is mapped"
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            backgroundColor: '#4CAF50',
                            border: '2px solid #000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#000',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            zIndex: 1
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                    <div className="excel-cube-desc" dir="rtl" style={{ display: f.expanded ? 'grid' : 'none' }}>
                      <div className="row">
                        <span className="k">מהות השדה:</span>
                        {editingField?.id === f.id && editingField.field === 'fieldEssence' ? (
                          <textarea
                            className="editable-field"
                            value={editValue}
                            onChange={(e) => { setEditValue(e.target.value); const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
                            onFocus={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.shiftKey) {
                                e.preventDefault()
                                const el = e.currentTarget
                                const start = el.selectionStart ?? editValue.length
                                const end = el.selectionEnd ?? editValue.length
                                const next = editValue.slice(0, start) + '\n' + editValue.slice(end)
                                setEditValue(next)
                                setTimeout(() => {
                                  try { el.selectionStart = el.selectionEnd = start + 1 } catch {}
                                }, 0)
                                return
                              }
                              if (e.key === 'Enter') {
                                handleSaveFieldValue(f.id, 'fieldEssence', editValue)
                              } else if (e.key === 'Escape') {
                                handleCancelEditing()
                              }
                            }}
                            onBlur={() => {
                              // Only save on blur if the value has actually changed
                              if (editValue.trim() !== (f.fieldEssence || '')) {
                                handleSaveFieldValue(f.id, 'fieldEssence', editValue)
                              } else {
                                handleCancelEditing()
                              }
                            }}
                            autoFocus
                            style={{
                              border: '1px solid #7cc0ff',
                              borderRadius: '4px',
                              padding: '6px 8px',
                              fontSize: '14px',
                              width: '100%',
                              minHeight: '64px',
                              resize: 'none',
                              overflow: 'hidden',
                              backgroundColor: 'rgba(124, 192, 255, 0.1)',
                              color: '#e6f1ff',
                              outline: 'none',
                              boxShadow: '0 0 0 2px rgba(124, 192, 255, 0.2)'
                            }}
                          />
                        ) : (
                          <span 
                            className="v editable-field" 
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              setEditingField({ id: f.id, field: 'fieldEssence' })
                              setEditValue(f.fieldEssence || '')
                            }}
                            style={{ cursor: 'pointer', whiteSpace: 'pre-wrap' }}
                            title="Double-click to edit"
                          >
                            {f.fieldEssence || '-'}
                            <span className={`edit-icon ${!f.fieldEssence ? 'empty' : ''}`}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '18px',
                                height: '18px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.1)',
                                marginLeft: '6px'
                              }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#000000"/>
                                </svg>
                              </div>
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="row">
                        <span className="k">דג"ח:</span>
                        {editingField?.id === f.id && editingField.field === 'dgh' ? (
                          <textarea
                            className="editable-field"
                            value={editValue}
                            onChange={(e) => { setEditValue(e.target.value); const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
                            onFocus={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.shiftKey) {
                                e.preventDefault()
                                const el = e.currentTarget
                                const start = el.selectionStart ?? editValue.length
                                const end = el.selectionEnd ?? editValue.length
                                const next = editValue.slice(0, start) + '\n' + editValue.slice(end)
                                setEditValue(next)
                                setTimeout(() => { try { el.selectionStart = el.selectionEnd = start + 1 } catch {} }, 0)
                                return
                              }
                              if (e.key === 'Enter') {
                                handleSaveFieldValue(f.id, 'dgh', editValue)
                              } else if (e.key === 'Escape') {
                                handleCancelEditing()
                              }
                            }}
                            onBlur={() => {
                              if (editValue.trim() !== (f.dgh || '')) {
                                handleSaveFieldValue(f.id, 'dgh', editValue)
                              } else {
                                handleCancelEditing()
                              }
                            }}
                            autoFocus
                            style={{
                              border: '1px solid #7cc0ff',
                              borderRadius: '4px',
                              padding: '6px 8px',
                              fontSize: '14px',
                              width: '100%',
                              minHeight: '64px',
                              resize: 'none',
                              overflow: 'hidden',
                              backgroundColor: 'rgba(124, 192, 255, 0.1)',
                              color: '#e6f1ff',
                              outline: 'none',
                              boxShadow: '0 0 0 2px rgba(124, 192, 255, 0.2)'
                            }}
                          />
                        ) : (
                          <span 
                            className="v editable-field" 
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              setEditingField({ id: f.id, field: 'dgh' })
                              setEditValue(f.dgh || '')
                            }}
                            title="Double-click to edit"
                            style={{ whiteSpace: 'pre-wrap' }}
                          >
                            {f.dgh || '-'}
                            <span className={`edit-icon ${!f.dgh ? 'empty' : ''}`}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '18px',
                                height: '18px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.1)',
                                marginLeft: '6px'
                              }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#000000"/>
                                </svg>
                              </div>
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="row">
                        <span className="k">האם יחזור תמיד?</span>
                        {editingField?.id === f.id && editingField.field === 'always' ? (
                          <textarea
                            className="editable-field"
                            value={editValue}
                            onChange={(e) => { setEditValue(e.target.value); const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
                            onFocus={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.shiftKey) {
                                e.preventDefault()
                                const el = e.currentTarget
                                const start = el.selectionStart ?? editValue.length
                                const end = el.selectionEnd ?? editValue.length
                                const next = editValue.slice(0, start) + '\n' + editValue.slice(end)
                                setEditValue(next)
                                setTimeout(() => { try { el.selectionStart = el.selectionEnd = start + 1 } catch {} }, 0)
                                return
                              }
                              if (e.key === 'Enter') {
                                handleSaveFieldValue(f.id, 'always', editValue)
                              } else if (e.key === 'Escape') {
                                handleCancelEditing()
                              }
                            }}
                            onBlur={() => {
                              if (editValue.trim() !== (f.always || '')) {
                                handleSaveFieldValue(f.id, 'always', editValue)
                              } else {
                                handleCancelEditing()
                              }
                            }}
                            autoFocus
                            style={{
                              border: '1px solid #7cc0ff',
                              borderRadius: '4px',
                              padding: '6px 8px',
                              fontSize: '14px',
                              width: '100%',
                              minHeight: '64px',
                              resize: 'none',
                              overflow: 'hidden',
                              backgroundColor: 'rgba(124, 192, 255, 0.1)',
                              color: '#e6f1ff',
                              outline: 'none',
                              boxShadow: '0 0 0 2px rgba(124, 192, 255, 0.2)'
                            }}
                          />
                        ) : (
                          <span 
                            className="v editable-field" 
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              setEditingField({ id: f.id, field: 'always' })
                              setEditValue(f.always || '')
                            }}
                            title="Double-click to edit"
                            style={{ whiteSpace: 'pre-wrap' }}
                          >
                            {f.always || '-'}
                            <span className={`edit-icon ${!f.always ? 'empty' : ''}`}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '18px',
                                height: '18px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.1)',
                                marginLeft: '6px'
                              }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#000000"/>
                                </svg>
                              </div>
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="row">
                        <span className="k">הערות:</span>
                        {editingField?.id === f.id && editingField.field === 'notes' ? (
                          <textarea
                            className="editable-field"
                            value={editValue}
                            onChange={(e) => { setEditValue(e.target.value); const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
                            onFocus={(e) => { const el = e.currentTarget; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && e.shiftKey) {
                                e.preventDefault()
                                const el = e.currentTarget
                                const start = el.selectionStart ?? editValue.length
                                const end = el.selectionEnd ?? editValue.length
                                const next = editValue.slice(0, start) + '\n' + editValue.slice(end)
                                setEditValue(next)
                                setTimeout(() => { try { el.selectionStart = el.selectionEnd = start + 1 } catch {} }, 0)
                                return
                              }
                              if (e.key === 'Enter') {
                                handleSaveFieldValue(f.id, 'notes', editValue)
                              } else if (e.key === 'Escape') {
                                handleCancelEditing()
                              }
                            }}
                            onBlur={() => {
                              if (editValue.trim() !== (f.notes || '')) {
                                handleSaveFieldValue(f.id, 'notes', editValue)
                              } else {
                                handleCancelEditing()
                              }
                            }}
                            autoFocus
                            style={{
                              border: '1px solid #7cc0ff',
                              borderRadius: '4px',
                              padding: '6px 8px',
                              fontSize: '14px',
                              width: '100%',
                              minHeight: '64px',
                              resize: 'none',
                              overflow: 'hidden',
                              backgroundColor: 'rgba(124, 192, 255, 0.1)',
                              color: '#e6f1ff',
                              outline: 'none',
                              boxShadow: '0 0 0 2px rgba(124, 192, 255, 0.2)'
                            }}
                          />
                        ) : (
                          <span 
                            className="v editable-field" 
                            onDoubleClick={(e) => {
                              e.stopPropagation()
                              setEditingField({ id: f.id, field: 'notes' })
                              setEditValue(f.notes || '')
                            }}
                            style={{ cursor: 'pointer' }}
                            title="Double-click to edit"
                          >
                            <span style={{ whiteSpace: 'pre-wrap' }}>{f.notes || '-'}</span>
                            <span className={`edit-icon ${!f.notes ? 'empty' : ''}`}>
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '18px',
                                height: '18px',
                                borderRadius: '6px',
                                border: '1px solid rgba(255,255,255,0.2)',
                                background: 'rgba(255,255,255,0.1)',
                                marginLeft: '6px'
                              }}>
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="#000000"/>
                                </svg>
                              </div>
                            </span>
                          </span>
                        )}
                      </div>
                      {f.isMapped && f.mappedTargetLabel && (
                        <div className="row">
                          <span className="k">שדה בתקן:</span>
                          <span className="v" style={{ fontSize: '8px' }}>{f.mappedTargetLabel}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Context Menu for Cube Color Selection */}
          {contextMenu && (
            <div 
              className="cube-context-menu"
              style={{
                position: 'fixed',
                top: contextMenu.y,
                left: contextMenu.x,
                zIndex: 1000,
                backgroundColor: '#2a2a2a',
                border: '1px solid #444',
                borderRadius: '8px',
                padding: '8px 0',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                minWidth: '120px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="context-menu-title" style={{ padding: '8px 16px', fontSize: '12px', color: '#888', borderBottom: '1px solid #444', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Change Cube Color</span>
                <button
                  onClick={closeContextMenu}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px',
                    borderRadius: '3px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#444'
                    e.currentTarget.style.color = '#fff'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                    e.currentTarget.style.color = '#888'
                  }}
                  title="Close"
                >
                  ✕
                </button>
              </div>
              {Object.entries(CUBE_COLORS).filter(([colorKey]) => colorKey !== 'green').map(([colorKey, colorData]) => (
                <div
                  key={colorKey}
                  className="color-option"
                  onClick={() => handleColorChange(contextMenu.fieldId, colorKey as keyof typeof CUBE_COLORS)}
                  style={{
                    padding: '8px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: '#fff',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#444'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <div
                    className="color-preview"
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '3px',
                      background: colorKey === 'default' ? 'linear-gradient(180deg, rgba(124,192,255,0.6), rgba(124,192,255,0.3))' : colorData.bg
                    }}
                  />
                  <span style={{ textTransform: 'capitalize' }}>{colorKey}</span>
                </div>
              ))}
            </div>
          )}
          
        <div className="excel-actions">
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUploadFilled(f)
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
          />
          <input
            ref={mappingFileInputRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) onUploadMappingFile(f)
              if (mappingFileInputRef.current) mappingFileInputRef.current.value = ''
            }}
          />
          {excelFields.filter(f => f.isMapped).length > 0 && (
            <div className="mappings-count">
              {excelFields.filter(f => f.isMapped).length} mapping{excelFields.filter(f => f.isMapped).length !== 1 ? 's' : ''} saved
            </div>
          )}
        </div>
        <div className="fridge-note">
          {excelFields.length === 0 
            ? 'הורידו את הפורמט, מלאו אותו בדג"ח מהספק והעלו אותו לפירוק!'
            : 'גררו שדה מהדג"ח לשדה שמתאים לו מהתקן, הכניסו את הפרסר הרצוי ולחצו שמור. לאחר שסיימתם למפות את כל השדות הרלוונטים - לחצו על כפתור הורדת המאפינג ותיהנו!'
          }
        </div>
        {excelFields.length === 0 && (
          <div className="excel-cta"></div>
        )}
        {/* Bottom-left clear button (trash) */}
        {excelFields.length > 0 && (
          <button
            className="btn ghost extractor-clear-btn"
            aria-label={'נקה את הדג"ח'}
            title={'נקה את הדג"ח'}
            onClick={(e: React.MouseEvent<HTMLButtonElement>) => { e.stopPropagation(); clearExtractor() }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 3c-.55 0-1 .45-1 1v1H5.5c-.28 0-.5.22-.5.5s.22.5.5.5H6v13c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V6h.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5H16V4c0-.55-.45-1-1-1H9zm1 2V4h4v1h-4zm-2 2h10v12c0 .55-.45 1-1 1H8c-.55 0-1-.45-1-1V7zm3 2c-.28 0-.5.22-.5.5v7c0 .28.22.5.5.5s.5-.22.5-.5v-7c0-.28-.22-.5-.5-.5zm4 0c-.28 0-.5.22-.5.5v7c0 .28.22.5.5.5s.5-.22.5-.5v-7c0-.28-.22-.5-.5-.5z"/>
            </svg>
          </button>
        )}
      </div>
    </aside>
  )
}

