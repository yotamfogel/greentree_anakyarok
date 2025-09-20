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
                  <span className="value-hierarchy">{(() => {
                    const parts = item.path.split('.')
                    if (parts.length <= 2) return ''
                    return parts.slice(1, parts.length - 1).join('.')
                  })()}</span>
                  <span className="value-name">{item.name}</span>
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
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 20px 60px rgba(0,0,0,0.35)'
      }}>
        <div className="value-detail-headline">
          <div></div>
          <div className={`value-detail-path ${selected ? 'selected' : ''}`}>{selected ? (() => {
            const parts = selected.path.split('.')
            if (parts.length <= 2) return selected.name
            return `${parts.slice(1, parts.length - 1).join(' -> ')} -> ${selected.name}`
          })() : ''}</div>
        </div>
        <div className="value-detail-body">
          <div className="detail-row"><span className="k">מהות השדה:</span><span className="v">{selected?.description || '-'}</span></div>
          <div className="detail-row"><span className="k">סוג השדה:</span><span className="v">{selected?.type || '-'}</span></div>
          <div className="detail-row"><span className="k">האם שדה חובה:</span><span className="v">{selected?.rules?.some(r => r === 'required') ? 'כן' : 'לא'}</span></div>
          <div className="detail-row"><span className="k">דג"ח/רשימה סגורה:</span><span className="v">{selected?.rules?.find(r => r.startsWith('enum')) ? (() => {
            const enumRule = selected.rules.find(r => r.startsWith('enum'))
            if (enumRule) {
              const enumValues = enumRule.replace('enum: ', '').split(', ')
              return (
                <div className="enum-values">
                  {enumValues.map((value, index) => (
                    <div key={index} className="enum-value">{value}</div>
                  ))}
                </div>
              )
            }
            return '-'
          })() : '-'}</span></div>
          <div className="detail-row"><span className="k">חוקים:</span><span className="v">{selected?.rules && selected.rules.length ? selected.rules.join(' | ') : '-'}</span></div>
          <div className="detail-row"><span className="k">בשימוש במשפחות:</span><span className="v">{selected ? (() => {
            const schemas = new Set<string>()
            allFields.forEach(field => {
              if (field.name === selected.name && field.path.split('.').slice(1, -1).join('.') === selected.path.split('.').slice(1, -1).join('.')) {
                schemas.add(field.schemaTitle)
              }
            })
            return Array.from(schemas).sort().join(', ') || '-'
          })() : '-'}</span></div>
        </div>

      </section>
    </>
  )
}

export default ValueList


