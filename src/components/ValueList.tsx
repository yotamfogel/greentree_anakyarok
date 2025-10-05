import React, { useMemo, useState, useEffect, useRef } from 'react'

type AvailableSchemas = Record<string, { title: string; schema: any }>

interface ValueListProps {
  schemas: AvailableSchemas
}

interface FieldEntry {
  id: string
  schemaKey: string
  schemaTitle: string
  path: string
  name: string
  type?: string
  description?: string
  rules?: string[]
}

function flattenJsonSchema(schemaKey: string, schemaTitle: string, schema: any): FieldEntry[] {
  const results: FieldEntry[] = []

  const visit = (node: any, pathParts: string[], requiredHint: boolean) => {
    try {
      const nodeType = Array.isArray(node?.type) ? node.type[0] : node?.type
      if (nodeType === 'object' && node?.properties && typeof node.properties === 'object') {
        const requiredList: string[] = Array.isArray(node?.required) ? node.required : []
        const requiredSet = new Set<string>(requiredList)
        for (const [propName, child] of Object.entries<any>(node.properties)) {
          visit(child, [...pathParts, String(propName)], requiredSet.has(String(propName)))
        }
      } else if (nodeType === 'array' && node?.items) {
        // Traverse into array items
        visit(node.items, [...pathParts, 'item'], requiredHint)
      } else {
        const name = pathParts[pathParts.length - 1] || schemaTitle
        const path = pathParts.join('.')
        if (path) {
          const rules: string[] = []
          if (requiredHint) rules.push('required')
          if (typeof node?.pattern === 'string') rules.push(`pattern: ${node.pattern}`)
          if (typeof node?.format === 'string') rules.push(`format: ${node.format}`)
          if (typeof node?.minLength === 'number') rules.push(`minLength: ${node.minLength}`)
          if (typeof node?.maxLength === 'number') rules.push(`maxLength: ${node.maxLength}`)
          if (typeof node?.minimum === 'number') rules.push(`minimum: ${node.minimum}`)
          if (typeof node?.maximum === 'number') rules.push(`maximum: ${node.maximum}`)
          if (Array.isArray(node?.enum)) rules.push(`enum: ${node.enum.join(', ')}`)
          results.push({
            id: `${schemaKey}:${path}`,
            schemaKey,
            schemaTitle,
            path,
            name,
            type: nodeType || undefined,
            description: typeof node?.description === 'string' ? node.description : undefined,
            rules: rules.length ? rules : undefined
          })
        }
      }
    } catch (e) {
      // Fail gracefully and continue
      console.error('Failed to traverse schema at path:', pathParts.join('.'), e)
    }
  }

  visit(schema, [schemaTitle], false)
  return results
}

// Function to generate consistent colors for families
const generateFamilyColor = (familyName: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
    '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7DBDD'
  ]
  
  // Simple hash function to get consistent color for each family
  let hash = 0
  for (let i = 0; i < familyName.length; i++) {
    const char = familyName.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  
  return colors[Math.abs(hash) % colors.length]
}

export function ValueList({ schemas }: ValueListProps) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<FieldEntry | null>(null)
  const [filterType, setFilterType] = useState<'all' | 'fields' | 'hierarchies'>('all')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedSchema, setSelectedSchema] = useState<string | null>('all')
  const [isSchemaDropdownOpen, setIsSchemaDropdownOpen] = useState(false)
  const filterDropdownRef = useRef<HTMLDivElement>(null)
  const selectedFieldRef = useRef<HTMLButtonElement>(null)
  const schemaDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Don't interfere with navigation menu clicks
      const target = event.target as Element
      const isNavigationMenu = target.closest('.action-dropdown') || target.closest('.schema-dropdown')
      
      if (isNavigationMenu) {
        return // Don't process navigation menu clicks
      }
      
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(target)) {
        setIsFilterOpen(false)
      }
      if (schemaDropdownRef.current && !schemaDropdownRef.current.contains(target)) {
        setIsSchemaDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const allFields: FieldEntry[] = useMemo(() => {
    const acc: FieldEntry[] = []
    try {
      Object.entries(schemas).forEach(([key, entry]) => {
        acc.push(...flattenJsonSchema(key, entry.title || key, entry.schema))
      })
    } catch (e) {
      console.error('Failed to flatten schemas:', e)
    }
    // Sort by schema then by path for stable view
    return acc.sort((a, b) => (a.schemaTitle.localeCompare(b.schemaTitle) || a.path.localeCompare(b.path)))
  }, [schemas])

  const filtered = useMemo(() => {
    let filteredFields = allFields
    
    // Apply schema filter
    if (selectedSchema && selectedSchema !== 'all') {
      filteredFields = filteredFields.filter(f => f.schemaKey === selectedSchema)
    }
    
    // Apply type filter
    if (filterType === 'fields') {
      filteredFields = filteredFields.filter(f => {
        const parts = f.path.split('.')
        return parts.length > 2 // Only fields with children (hierarchies)
      })
    } else if (filterType === 'hierarchies') {
      filteredFields = filteredFields.filter(f => {
        const parts = f.path.split('.')
        return parts.length <= 2 // Only basic fields without children
      })
    }
    // If filterType is 'all' (default), show all fields
    
    // Apply duplicate field filtering - show identical field names with identical hierarchies 
    // only if they are from different sagach families (schemas)
    const fieldGroups = new Map<string, FieldEntry[]>()
    
    // Group fields by field name and hierarchy path
    filteredFields.forEach(field => {
      const hierarchyPath = field.path.split('.').slice(1, -1).join('.') // Remove schema name and field name
      const key = `${field.name}|${hierarchyPath}`
      
      if (!fieldGroups.has(key)) {
        fieldGroups.set(key, [])
      }
      fieldGroups.get(key)!.push(field)
    })
    
    // Filter to keep only groups with multiple schemas or single entries
    filteredFields = []
    fieldGroups.forEach(group => {
      if (group.length === 1) {
        // Single field - always include
        filteredFields.push(group[0])
      } else {
        // Multiple fields with same name and hierarchy - only include if from different schemas
        const uniqueSchemas = new Set(group.map(f => f.schemaKey))
        if (uniqueSchemas.size > 1) {
          // Different sagach families - include all
          filteredFields.push(...group)
        } else {
          // Same sagach family - include only the first one to avoid duplicates
          filteredFields.push(group[0])
        }
      }
    })
    
    // Apply search filter
    const q = query.trim().toLowerCase()
    if (!q) return filteredFields
    return filteredFields.filter(f => (
      f.path.toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q) ||
      f.schemaTitle.toLowerCase().includes(q) ||
      (f.type ? f.type.toLowerCase().includes(q) : false) ||
      (f.description ? f.description.toLowerCase().includes(q) : false)
    ))
  }, [allFields, query, filterType, selectedSchema])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (filtered.length === 0) return
      
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
          break
        case 'ArrowUp':
          event.preventDefault()
          setSelectedIndex(prev => Math.max(prev - 1, 0))
          break
        case 'Home':
          event.preventDefault()
          setSelectedIndex(0)
          break
        case 'End':
          event.preventDefault()
          setSelectedIndex(filtered.length - 1)
          break
        case 'Enter':
          event.preventDefault()
          if (filtered[selectedIndex]) {
            // Clear old selection first, then set new one
            console.log('Enter pressed - clearing old selection and setting new one')
            setSelected(null)
            // Force a re-render to clear old classes
            setTimeout(() => {
              setSelected(filtered[selectedIndex])
              // Move keyboard highlight to the newly selected field
              setSelectedIndex(selectedIndex)
            }, 10)
          }
          break
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [filtered, selectedIndex])

  // Auto-scroll selected field into view
  useEffect(() => {
    if (selectedFieldRef.current) {
      selectedFieldRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [selectedIndex])

  // Debug: Monitor selected state changes
  useEffect(() => {
    console.log('Selected state changed to:', selected?.id || 'null')
  }, [selected])

  return (
    <>
      <aside className="value-panel" dir="rtl" style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 20px 60px rgba(0,0,0,0.35)'
      }}>
        <div className="value-panel-inner">
          <div className="value-search">
            <div className="schema-selector" ref={schemaDropdownRef} style={{ marginBottom: '12px', width: '100%' }}>
              <button 
                className={`btn ghost ${selectedSchema ? '' : 'is-placeholder'}`} 
                onClick={() => setIsSchemaDropdownOpen(!isSchemaDropdownOpen)}
                style={{ width: '100%' }}
              >
                {selectedSchema === 'all' 
                  ? 'כל התקנים'
                  : selectedSchema && schemas[selectedSchema]
                    ? schemas[selectedSchema].title
                    : (
                      <span className="schema-placeholder" dir="rtl">בחר תקן</span>
                    )}
                <span style={{ marginLeft: '8px' }}>▼</span>
              </button>
              {isSchemaDropdownOpen && (
                <div className="schema-dropdown">
                  <div
                    className="schema-option"
                    onClick={() => {
                      setSelectedSchema('all')
                      setIsSchemaDropdownOpen(false)
                    }}
                  >
                    כל התקנים
                  </div>
                  {Object.entries(schemas).map(([key, schema]) => (
                    <div
                      key={key}
                      className="schema-option"
                      onClick={() => {
                        setSelectedSchema(key)
                        setIsSchemaDropdownOpen(false)
                      }}
                    >
                      {schema.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="value-search-row">
              <input
                type="text"
                placeholder="חפש לפי שם/תיאור/היררכיה..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="value-search-input"
              />
              <div className="value-filter-dropdown" ref={filterDropdownRef}>
                <button 
                  className="btn" 
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <span>⏷</span>
                  <span>{filterType === 'all' ? 'הכל' : filterType === 'fields' ? 'רק שדות בסיסיים' : 'רק היררכיות'}</span>
                </button>
                {isFilterOpen && (
                  <div className="value-filter-options">
                    <div 
                      className={`value-filter-option ${filterType === 'all' ? 'active' : ''}`}
                      onClick={() => {
                        setFilterType('all')
                        setIsFilterOpen(false)
                      }}
                    >
                      הכל
                    </div>
                    <div 
                      className={`value-filter-option ${filterType === 'fields' ? 'active' : ''}`}
                      onClick={() => {
                        setFilterType('fields')
                        setIsFilterOpen(false)
                      }}
                    >
                      רק שדות בסיסיים
                    </div>
                    <div 
                      className={`value-filter-option ${filterType === 'hierarchies' ? 'active' : ''}`}
                      onClick={() => {
                        setFilterType('hierarchies')
                        setIsFilterOpen(false)
                      }}
                    >
                      רק היררכיות
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="value-list custom-scrollbar" role="list">
            {filtered.map((item, index) => (
              <button
                key={item.id}
                ref={index === selectedIndex ? selectedFieldRef : null}
                className={`value-item ${index === selectedIndex ? 'selected' : ''} ${selected?.id === item.id ? 'clicked' : ''}`}
                role="listitem"
                title={`${item.schemaTitle} / ${item.path}`}
                onClick={() => {
                  setSelected(item)
                  // Clear keyboard navigation highlight when clicking with mouse
                  setSelectedIndex(-1)
                }}
              >
                <div className="value-row">
                  <span 
                    className="value-family" 
                    style={{ 
                      color: generateFamilyColor(item.schemaTitle),
                      fontWeight: 'bold',
                      fontSize: '12px',
                      flex: '0 0 auto',
                      minWidth: 'fit-content',
                      marginRight: '8px'
                    }}
                  >
                    {item.schemaTitle}
                  </span>
                  <span 
                    className="value-hierarchy" 
                    style={{
                      flex: '1 1 auto',
                      minWidth: '0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {(() => {
                      const parts = item.path.split('.')
                      if (parts.length <= 2) return ''
                      return parts.slice(1, parts.length - 1).join('.')
                    })()}
                  </span>
                  <span 
                    className="value-name" 
                    style={{
                      flex: '0 0 auto',
                      minWidth: 'fit-content'
                    }}
                  >
                    {item.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Always-visible details box, empty before selection */}
      <section className="value-detail-panel dictionary-box" dir="rtl" style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06))',
        border: '1px solid rgba(255,255,255,0.12)',
        overflow: 'auto',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 20px 60px rgba(0,0,0,0.35)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        textAlign: 'center',
        zIndex: 1
      }}>
        <div 
          className="value-detail-headline" 
          style={{ fontSize: '80px !important', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'flex-start', // This centers vertically at the top
            textAlign: 'center' 
          }}// This centers the text horizontally}}
        >
          <div></div>
          <div 
            className={`value-detail-path ${selected ? 'selected' : ''}`} 
            style={{ 
              fontSize: selected ? '40px !important' : '35px !important',
              fontWeight: selected ? '700' : '400',
              color: selected ? 'rgb(19, 124, 223)' : 'var(--muted)',
              textDecoration: selected ? 'underline' : 'none',
              borderBottom: 'none',
              paddingBottom: '0px'
            }}
          >
            {selected ? (() => {
              const parts = selected.path.split('.')
              if (parts.length <= 2) return selected.name
              return `${parts.slice(1, parts.length - 1).join('.')}.${selected.name}`
            })() : '-'}
          </div>
        </div>
        <hr style={{ width: '75%', marginBottom: '20px', height: '0px'}} />
        <div 
          className="value-detail-body" 
          style={{ 
            fontSize: '40px !important' ,
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'flex-start', // This centers vertically at the top
            textAlign: 'center' 
          }}
        >
          <div className="detail-row">
            <span 
              className="k" 
              style={{ 
                fontSize: '60px !important',
                color: 'var(--muted) !important' 
              }}
            >
              מהות השדה:
            </span>
            <span 
              className="v" 
              style={{ 
                fontSize: '2px !important',
                color: 'var(--text) !important' 
              }}
            >
              {selected?.description || '-'}
            </span>
          </div>
          <div className="detail-row">
            <span 
              className="k" 
              style={{ 
                color: 'var(--muted) !important' 
              }}
            >
              סוג השדה:
            </span>
            <span 
              className="v" 
              style={{ 
                fontSize: '26px !important',
                color: 'var(--text) !important' 
              }}
            >
              {selected?.type || '-'}
            </span>
          </div>
          <div className="detail-row">
            <span 
              className="k" 
              style={{ 
                fontSize: '26px !important',
                color: 'var(--muted) !important' 
              }}
            >
              האם שדה חובה:
            </span>
            <span 
              className="v" 
              style={{ 
                fontSize: '26px !important',
                color: 'var(--text) !important' 
              }}
            >
              {selected?.rules?.some(r => r === 'required') ? 'כן' : '-'}
            </span>
          </div>
          <div className="detail-row">
            <span 
              className="k" 
              style={{ 
                fontSize: '26px !important',
                color: 'var(--muted) !important' 
              }}
            >
              דג"ח/רשימה סגורה:
            </span>
            <span 
              className="v" 
              style={{ 
                fontSize: '26px !important',
                color: 'var(--text) !important' 
              }}
            >
              {selected?.rules?.find(r => r.startsWith('enum')) ? (() => {
                const enumRule = selected.rules.find(r => r.startsWith('enum'))
                if (enumRule) {
                  const enumValues = enumRule.replace('enum: ', '').split(', ')
                  return (
                    <div className="enum-values" style={{ fontSize: '26px !important' }}>
                      {enumValues.map((value, index) => (
                        <div 
                          key={index} 
                          className="enum-value" 
                          style={{ fontSize: '26px !important' }}
                        >
                          {value}
                        </div>
                      ))}
                    </div>
                  )
                }
                return '-'
              })() : '-'}
            </span>
          </div>
          <div className="detail-row">
            <span 
              className="k" 
              style={{ 
                fontSize: '26px !important',
                color: 'var(--muted) !important' 
              }}
            >
              חוקים:
            </span>
            <span 
              className="v" 
              style={{ 
                fontSize: '26px !important',
                color: 'var(--text) !important' 
              }}
            >
              {selected?.rules && selected.rules.length ? selected.rules.join(' | ') : '-'}
            </span>
          </div>
          <div className="detail-row">
            <span 
              className="k" 
              style={{ 
                fontSize: '26px !important',
                color: 'var(--muted) !important' 
              }}
            >
              בשימוש במשפחות:
            </span>
            <span 
              className="v" 
              style={{ 
                fontSize: '26px !important',
                color: 'var(--text) !important' 
              }}
            >
              {selected ? (() => {
                const schemas = new Set<string>()
                allFields.forEach(field => {
                  if (field.name === selected.name && field.path.split('.').slice(1, -1).join('.') === selected.path.split('.').slice(1, -1).join('.')) {
                    schemas.add(field.schemaTitle)
                  }
                })
                return Array.from(schemas).sort().join(', ') || '-'
              })() : '-'}
            </span>
          </div>
        </div>

      </section>
    </>
  )
}

export default ValueList


