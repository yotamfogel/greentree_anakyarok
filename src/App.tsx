import { useMemo, useState, useEffect, useRef } from 'react'
import { buildTree, TreeNodeData } from './utils/parser'
import { TreeView } from './components/TreeView'
import { DynamicConnectors } from './components/DynamicConnectors'
import { ExcelExtractor } from './components/ExcelExtractor'

const sampleJson = `{
  "person": {
    "id": "GILI-2025-001",
    "basic_info": {
      "first_name": "Gili",
      "last_name": "Levi",
      "gender": "Male",
      "date_of_birth": "1992-05-14",
      "nationality": "Israeli",
      "description": "Gili is a 33-year-old software engineer who enjoys hiking, photography, and playing the guitar."
    },
    "contact_details": {
      "phone_numbers": [
        {
          "type": "mobile",
          "country_code": "+972",
          "number": "54-123-4567",
          "description": "Primary contact number"
        },
        {
          "type": "home",
          "country_code": "+972",
          "number": "3-987-6543",
          "description": "Landline at home"
        }
      ],
      "email": "gili.levi@example.com"
    },
    "address": {
      "primary_residence": {
        "street": "HaPalmach Street",
        "house_number": 17,
        "city": "Tel Aviv",
        "postal_code": "6329204",
        "country": "Israel",
        "coordinates": {
          "latitude": 32.0853,
          "longitude": 34.7818
        },
        "description": "Main apartment located in the heart of Tel Aviv, close to cafes and the beach."
      },
      "secondary_residence": {
        "street": "Herzl Avenue",
        "house_number": 45,
        "city": "Haifa",
        "postal_code": "3200000",
        "country": "Israel",
        "description": "Vacation apartment in Haifa with a view of the Mediterranean Sea."
      }
    },
    "employment": {
      "current_job": {
        "position": "Senior Software Engineer",
        "company": "TechNova Ltd.",
        "department": "AI Research & Development",
        "start_date": "2018-09-01",
        "description": "Leads a team of 6 engineers developing machine learning models for predictive analytics."
      },
      "previous_jobs": [
        {
          "position": "Backend Developer",
          "company": "CodeWorks",
          "start_date": "2015-06-15",
          "end_date": "2018-08-31",
          "description": "Worked on API development and database optimization."
        },
        {
          "position": "Junior Web Developer",
          "company": "Creative Web Studio",
          "start_date": "2013-02-01",
          "end_date": "2015-05-30",
          "description": "Built responsive websites for small businesses."
        }
      ]
    },
    "personal_interests": {
      "hobbies": [
        {
          "name": "Hiking",
          "description": "Explores nature trails around Israel and abroad."
        },
        {
          "name": "Photography",
          "description": "Specializes in landscape and street photography."
        },
        {
          "name": "Music",
          "description": "Plays acoustic guitar and writes original songs."
        }
      ],
      "sports": [
        {
          "name": "Basketball",
          "description": "Plays in a local amateur league every weekend."
        }
      ]
    },
    "identifiers": {
      "passport_number": "IL9876543",
      "national_id": "203456789",
      "driver_license": {
        "number": "DL-IL-456789",
        "category": "B",
        "expiry_date": "2030-12-31"
      }
    },
    "emergency_contacts": [
      {
        "name": "Maya Levi",
        "relationship": "Sister",
        "phone": {
          "country_code": "+972",
          "number": "52-765-4321"
        }
      },
      {
        "name": "David Cohen",
        "relationship": "Friend",
        "phone": {
          "country_code": "+972",
          "number": "50-987-6543"
        }
      }
    ]
  }
}`

interface MappingData {
  targetNode: TreeNodeData
  field: any
}

type ToastType = 'ok' | 'warn' | 'error'

export default function App() {
  const [rawInput, setRawInput] = useState<string>(sampleJson)
  const [tree, setTree] = useState<TreeNodeData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showInput, setShowInput] = useState<boolean>(false)
  const [zoom, setZoom] = useState<number>(1)
  const [pan, setPan] = useState<{x:number;y:number}>({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState<boolean>(false)
  const [panStart, setPanStart] = useState<{x:number;y:number}>({ x: 0, y: 0 })
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [searchResults, setSearchResults] = useState<Array<{id:string; path:string; name:string; description?: string; rulesText?: string; snippet?: string}>>([])
  const [isResultsOpen, setIsResultsOpen] = useState<boolean>(false)
  const [isSearchVisible, setIsSearchVisible] = useState<boolean>(false)
  const [mappingData, setMappingData] = useState<MappingData | null>(null)
  const [rightText, setRightText] = useState<string>('')
  const [middleText, setMiddleText] = useState<string>('')
  const [leftText, setLeftText] = useState<string>('')
  const [isSpecificOutputs, setIsSpecificOutputs] = useState<boolean>(false)
  const [outputsText, setOutputsText] = useState<string>('')
  const [showExcelHeaderActions, setShowExcelHeaderActions] = useState<boolean>(false)
  const [requiredPanelOpen, setRequiredPanelOpen] = useState<boolean>(true)
  const [showMissingRequiredModal, setShowMissingRequiredModal] = useState<boolean>(false)
  const [savedMappings, setSavedMappings] = useState<Array<{
    targetNode: TreeNodeData
    field: any
    mappingDetails: string
    outputs: string
    timestamp: number
  }>>([])
  const [selectedSchema, setSelectedSchema] = useState<string>('')
  const [isSchemaDropdownOpen, setIsSchemaDropdownOpen] = useState<boolean>(false)
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState<boolean>(false)
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState<boolean>(false)
  // Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<ToastType>('ok')
  const [toastLeaving, setToastLeaving] = useState<boolean>(false)
  const [toastShown, setToastShown] = useState<boolean>(false)
  const toastHideTimerRef = useRef<number | null>(null)
  const toastRemoveTimerRef = useRef<number | null>(null)
  // Duplicate target mapping confirmation
  const [showDuplicateMappingModal, setShowDuplicateMappingModal] = useState<boolean>(false)
  const [pendingMapping, setPendingMapping] = useState<any | null>(null)
  const [pendingDropData, setPendingDropData] = useState<MappingData | null>(null)
  const [duplicateContext, setDuplicateContext] = useState<'drop' | 'save' | null>(null)

  const vizWrapperRef = useRef<HTMLDivElement>(null)
  // Keep latest zoom/pan for global wheel handler during drag
  const zoomRef = useRef<number>(1)
  const panRef = useRef<{x:number;y:number}>({ x: 0, y: 0 })
  const inputDropdownRef = useRef<HTMLDivElement>(null)
  const jsonButtonRef = useRef<HTMLButtonElement>(null)
  const uploadMenuRef = useRef<HTMLDivElement>(null)
  const downloadMenuRef = useRef<HTMLDivElement>(null)
  const lastImportedMappingsRef = useRef<any[] | null>(null)
  const savedMappingsRef = useRef<typeof savedMappings>([])

  const parsedPreview = useMemo(() => {
    try {
      const v = JSON.parse(rawInput)
      return typeof v
    } catch {
      return null
    }
  }, [rawInput])

  // Compute list of unmapped mandatory leaf fields (required or conditional)
  const unmappedMandatoryLeaves = useMemo(() => {
    if (!tree) return [] as Array<{ id: string; path: string; requiredState: 'required' | 'conditional' }>
    const results: Array<{ id: string; path: string; requiredState: 'required' | 'conditional' }> = []
    const walk = (n: TreeNodeData, ancestors: string[]) => {
      const children = n.children ?? []
      const isLeaf = children.length === 0
      const isMapped = !!(n.excelMeta && Object.keys(n.excelMeta).length > 0)
      const isMandatory = n.requiredState === 'required' || n.requiredState === 'conditional'
      const pathNames = [...ancestors, n.name]
      if (isLeaf && isMandatory && !isMapped) {
        // Remove the root cube's name from the displayed path
        const displayPath = pathNames.slice(1).join(' -> ')
        results.push({ id: n.id, path: displayPath, requiredState: n.requiredState as 'required' | 'conditional' })
      }
      children.forEach((c) => walk(c, pathNames))
    }
    walk(tree, [])
    return results
  }, [tree])

  // Show only truly mandatory (red) fields in the right-side panel
  const unmappedRequiredLeaves = useMemo(() => {
    return unmappedMandatoryLeaves.filter((x) => x.requiredState === 'required')
  }, [unmappedMandatoryLeaves])

  const onVisualize = () => {
    try {
      // Guard: require schema selection
      if (!selectedSchema) {
        window.dispatchEvent(new CustomEvent('excel:status', { 
          detail: { 
            message: 'בחר סכמה לויזואליזציה בעץ', 
            type: 'error', 
            durationMs: 4000 
          } 
        }))
        return
      }
      // Load the selected schema
      const selectedSchemaData = availableSchemas[selectedSchema as keyof typeof availableSchemas]
      if (selectedSchemaData) {
        setRawInput(JSON.stringify(selectedSchemaData.schema, null, 2))
        setError(null)
        const built = buildTree(selectedSchemaData.schema)
        const updated = applyMappingsToTree(built, savedMappings)
        setTree(updated)
      } else {
        setError('Selected schema not found')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse JSON')
    }
  }
  /*let the tree visualize a json schema instead of a json file while performing the following tasks:
  1. Give cubes a tint color by the following rules:
  a. if a field is required, tint the cube red
  b. if a field is not required, don't tint it
  c. if there's a field that is required ONLY IF its parent is filled up (the parent is not required), tint the cube orange
  
  2. When opening a cube with no children, display its description, and if there's a regex or validation for it - display it under text "Rules:" under the description.*/ 
  const onClear = () => {
    setRawInput('')
    setTree(null)
    setError(null)
  }

  // Available schemas for users to pick from
  const availableSchemas = {
    'person': {
      title: 'Person',
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'Person',
        type: 'object',
        required: ['firstName', 'lastName', 'address'],
        properties: {
          firstName: { type: 'string', description: 'Given name', minLength: 1 },
          lastName: { type: 'string', description: 'Family name', minLength: 1 },
          email: { type: 'string', format: 'email', description: 'Contact email' },
          phone: { type: 'string', pattern: '^\\+?[0-9\n\r\-\s]{7,15}$', description: 'Phone number with optional country code' },
          account: {
            type: 'object',
            description: 'Account and preferences',
            properties: {
              username: { type: 'string', minLength: 3, maxLength: 16 },
              password: { type: 'string', minLength: 8, description: 'At least 8 chars' },
              preferences: {
                type: 'object',
                properties: {
                  notifications: { type: 'boolean', description: 'Enable notifications' },
                  theme: { type: 'string', enum: ['light', 'dark', 'system'] },
                  shortcuts: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string' },
                        keys: { type: 'string', pattern: '^[A-Z]+\+[A-Z]+$' }
                      }
                    }
                  }
                }
              }
            }
          },
          address: {
            type: 'object',
            description: 'Primary address',
            required: ['street', 'city'],
            properties: {
              street: { type: 'string', minLength: 1 },
              city: { type: 'string', minLength: 1 },
              state: { type: 'string' },
              zip: { type: 'string', pattern: '^[0-9]{5}(?:-[0-9]{4})?$', description: 'US ZIP or ZIP+4' }
            }
          },
          secondary_residence: {
            type: 'object',
            description: 'Optional secondary residence; if present, street and city are required',
            // This hierarchy is optional, but if used, its inner fields are mandatory (will show as orange)
            required: ['street', 'city'],
            properties: {
              street: { type: 'string' },
              city: { type: 'string' },
              coordinates: {
                type: 'object',
                properties: {
                  lat: { type: 'number', minimum: -90, maximum: 90 },
                  lng: { type: 'number', minimum: -180, maximum: 180 }
                }
              }
            }
          },
          documents: {
            type: 'array',
            description: 'Uploaded documents',
            items: {
              type: 'object',
              // The array itself is optional; if used, these item fields are mandatory (conditional/orange)
              required: ['fileName', 'mimeType'],
              properties: {
                fileName: { type: 'string' },
                mimeType: { type: 'string', pattern: '^[-\w.]+/[-\w.]+$' },
                sizeKb: { type: 'integer', minimum: 1, maximum: 10240 }
              }
            }
          },
          age: { type: 'integer', minimum: 0, maximum: 120 },
          tags: { type: 'array', description: 'User tags', items: { type: 'string', maxLength: 20 } }
        }
      }
    },
    'product': {
      title: 'Product',
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'Product',
        type: 'object',
        required: ['name', 'price', 'category'],
        properties: {
          name: { type: 'string', description: 'Product name', minLength: 1 },
          price: { type: 'number', minimum: 0, description: 'Product price' },
          category: { type: 'string', description: 'Product category' },
          description: { type: 'string', description: 'Product description' },
          inStock: { type: 'boolean', description: 'Product availability' },
          tags: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    'order': {
      title: 'Order',
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'Order',
        type: 'object',
        required: ['orderId', 'customer', 'items'],
        properties: {
          orderId: { type: 'string', description: 'Unique order identifier' },
          customer: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              email: { type: 'string', format: 'email' }
            }
          },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'string' },
                quantity: { type: 'integer', minimum: 1 },
                price: { type: 'number', minimum: 0 }
              }
            }
          }
        }
      }
    }
    ,
    'optional_hierarchy_demo': {
      title: 'Optional hierarchy demo',
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'OptionalHierarchyDemo',
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string', description: 'Unique user identifier', minLength: 1 },
          profile: {
            type: 'object',
            description: 'Optional profile. If present, name and email are mandatory',
            // profile itself is not in root.required → optional
            required: ['name', 'email'],
            properties: {
              name: { type: 'string', description: 'Full name', minLength: 1 },
              email: { type: 'string', description: 'Email', format: 'email' },
              bio: { type: 'string', description: 'Short biography', maxLength: 200 },
              address: {
                type: 'object',
                description: 'Optional address. If present, street and city are mandatory',
                // address is optional within profile, but its inner fields are mandatory when used
                required: ['street', 'city'],
                properties: {
                  street: { type: 'string', minLength: 1 },
                  city: { type: 'string', minLength: 1 },
                  country: { type: 'string' },
                  zip: { type: 'string', pattern: '^[0-9]{5}(?:-[0-9]{4})?$' }
                }
              }
            }
          },
          attachments: {
            type: 'array',
            description: 'Optional attachments. If used, fileName is mandatory',
            items: {
              type: 'object',
              required: ['fileName'],
              properties: {
                fileName: { type: 'string', minLength: 1 },
                mimeType: { type: 'string', pattern: '^[-\w.]+/[-\w.]+$' },
                sizeKb: { type: 'integer', minimum: 1 }
              }
            }
          }
        }
      }
    }
  }

  const onLoadSample = () => {
    // Load the currently selected schema
    const selectedSchemaData = availableSchemas[selectedSchema as keyof typeof availableSchemas]
    if (selectedSchemaData) {
      setRawInput(JSON.stringify(selectedSchemaData.schema, null, 2))
      setError(null)
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault()
        setIsSearchVisible(true)
        setTimeout(() => {
          const searchInput = document.getElementById('tree-search') as HTMLInputElement
          searchInput?.focus()
        }, 50)
      }
      if (e.key === 'Escape') {
        setIsSearchVisible(false)
        setSearchQuery('')
        setShowInput(false)
        setMappingData(null)
        setIsSchemaDropdownOpen(false)
        setIsUploadMenuOpen(false)
        setIsDownloadMenuOpen(false)
      }
    }

    const handleExcelDrop = (e: CustomEvent) => {
      const { targetNode, field } = e.detail
      // Detect if target node already mapped to another field
      const conflict = savedMappings.find((m) => {
        const sameTarget = (m?.targetNode?.name === targetNode?.name && m?.targetNode?.type === targetNode?.type)
        const differentField = (m?.field?.name !== field?.name || m?.field?.fieldType !== field?.fieldType)
        return sameTarget && differentField
      })
      if (conflict) {
        setPendingDropData({ targetNode, field })
        setDuplicateContext('drop')
        setShowDuplicateMappingModal(true)
        return
      }
      // No conflict → proceed to open mapping modal
      setMappingData({ targetNode, field })
      // Initialize textboxes with some default values
      setRightText(field.name || '')
      setMiddleText('')
      setLeftText(targetNode.name || '')
      setIsSpecificOutputs(false)
      setOutputsText('')
    }

    const handleRequestMappings = (e: CustomEvent) => {
      console.log('Sending saved mappings to ExcelExtractor:', savedMappingsRef.current)
      const callback = e.detail?.callback
      if (callback && typeof callback === 'function') {
        callback(savedMappingsRef.current)
      }
    }

    // Respond to Excel extractor requests and actions
    const handleRequestSelectedSchema = (e: CustomEvent) => {
      const callback = e.detail?.callback
      if (callback && typeof callback === 'function') callback(selectedSchema)
    }
    const handleApplySelectedSchema = (e: CustomEvent) => {
      const key = e.detail?.key as string
      if (key && typeof key === 'string') {
        setSelectedSchema(key)
        const selectedSchemaData = availableSchemas[key as keyof typeof availableSchemas]
        if (selectedSchemaData) {
          setRawInput(JSON.stringify(selectedSchemaData.schema, null, 2))
          setError(null)
          const builtTree = buildTree(selectedSchemaData.schema)
          // Prefer mappings just imported from Excel (avoids race with async state update)
          const mappingsToApply = (lastImportedMappingsRef.current && lastImportedMappingsRef.current.length > 0)
            ? lastImportedMappingsRef.current
            : savedMappings
          const updatedTree = applyMappingsToTree(builtTree, mappingsToApply)
          setTree(updatedTree)
          // Clear the cache after use to avoid stale preference later
          lastImportedMappingsRef.current = null
          window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: `נטענה סכמה: ${selectedSchemaData.title}`, type: 'ok', durationMs: 2500 } }))
        } else {
          window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: 'סכמה שהוטענה מהאקסל לא נמצאה', type: 'error', durationMs: 4000 } }))
        }
      }
    }
    const handleMappingsImported = (e: CustomEvent) => {
      const imported = (e.detail?.mappings as any[]) || []
      if (!imported.length) return
      // Cache the last imported mappings to apply immediately when schema is switched
      lastImportedMappingsRef.current = imported
      // Merge into savedMappings with simple de-duplication by target name + type + field name + fieldType
      setSavedMappings((prev) => {
        const keyOf = (m: any) => `${m?.targetNode?.name}__${m?.targetNode?.type}__${m?.field?.name}__${m?.field?.fieldType}`
        const map = new Map<string, any>()
        prev.forEach((m) => map.set(keyOf(m), m))
        imported.forEach((m) => map.set(keyOf(m), m))
        const merged = Array.from(map.values())
        savedMappingsRef.current = merged
        return merged
      })
      // If a tree is already present, apply mappings immediately to tint nodes
      if (tree) setTree(applyMappingsToTree(tree, imported))
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('excel:drop-on-node', handleExcelDrop as EventListener)
    window.addEventListener('excel:request-mappings', handleRequestMappings as EventListener)
    window.addEventListener('excel:request-selected-schema', handleRequestSelectedSchema as EventListener)
    window.addEventListener('excel:apply-selected-schema', handleApplySelectedSchema as EventListener)
    window.addEventListener('excel:mappings-imported', handleMappingsImported as EventListener)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('excel:drop-on-node', handleExcelDrop as EventListener)
      window.removeEventListener('excel:request-mappings', handleRequestMappings as EventListener)
      window.removeEventListener('excel:request-selected-schema', handleRequestSelectedSchema as EventListener)
      window.removeEventListener('excel:apply-selected-schema', handleApplySelectedSchema as EventListener)
      window.removeEventListener('excel:mappings-imported', handleMappingsImported as EventListener)
    }
  }, [savedMappings, selectedSchema, tree])

  // Close Upload/Download dropdowns when clicking outside
  useEffect(() => {
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(target)) {
        setIsUploadMenuOpen(false)
      }
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(target)) {
        setIsDownloadMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown, true)
    return () => document.removeEventListener('mousedown', onDocMouseDown, true)
  }, [])

  // Show Excel header actions after an Excel has been uploaded
  useEffect(() => {
    const onExcelUploaded = () => setShowExcelHeaderActions(true)
    window.addEventListener('excel:uploaded', onExcelUploaded as EventListener)
    return () => window.removeEventListener('excel:uploaded', onExcelUploaded as EventListener)
  }, [])

  // Do not auto-load a schema; wait for user selection

  // Close JSON dropdown when clicking outside
  useEffect(() => {
    if (!showInput) return
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      const isInsideDropdown = inputDropdownRef.current?.contains(target)
      const isOnButton = jsonButtonRef.current?.contains(target)
      if (!isInsideDropdown && !isOnButton) {
        setShowInput(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown, true)
    return () => document.removeEventListener('mousedown', onDocMouseDown, true)
  }, [showInput])

  // Close schema dropdown when clicking outside
  useEffect(() => {
    if (!isSchemaDropdownOpen) return
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      const isInsideSelector = document.querySelector('.schema-selector')?.contains(target)
      if (!isInsideSelector) {
        setIsSchemaDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onDocMouseDown, true)
    return () => document.removeEventListener('mousedown', onDocMouseDown, true)
  }, [isSchemaDropdownOpen])

  useEffect(() => {
    // Highlight matching text in cubes and descriptions
    const highlightText = () => {
      // Remove existing highlights
      document.querySelectorAll('.search-highlight').forEach(el => {
        const parent = el.parentNode!
        parent.replaceChild(document.createTextNode(el.textContent || ''), el)
        parent.normalize()
      })

      if (!searchQuery.trim()) return

      const walker = document.createTreeWalker(
        document.querySelector('.tree-view') || document.body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: (node) => {
            const parent = node.parentElement
            return parent && !parent.classList.contains('search-highlight') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT
          }
        }
      )

      const textNodes: Text[] = []
      let node: Node | null
      while (node = walker.nextNode()) {
        textNodes.push(node as Text)
      }

      const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
      
      textNodes.forEach(textNode => {
        const text = textNode.textContent || ''
        if (regex.test(text)) {
          const parent = textNode.parentElement!
          const highlightedHTML = text.replace(regex, '<span class="search-highlight">$1</span>')
          const wrapper = document.createElement('div')
          wrapper.innerHTML = highlightedHTML
          parent.replaceChild(wrapper, textNode)
          // Unwrap the div but keep highlighted spans
          while (wrapper.firstChild) {
            parent.insertBefore(wrapper.firstChild, wrapper)
          }
          parent.removeChild(wrapper)
        }
      })
    }

    highlightText()
  }, [searchQuery, tree])

  // Build a flat index of fields for search results
  const flattenTree = (n: TreeNodeData, acc: Array<{id:string; path:string; name:string; description?: string; rulesText?: string}> = [], currentPath: string[] = []): Array<{id:string; path:string; name:string; description?: string; rulesText?: string}> => {
    const rulesText = Array.isArray(n.rules) && n.rules.length ? n.rules.join(' ') : undefined
    const names = [...currentPath, n.name]
    const displayPath = names.slice(1).join(' -> ')
    acc.push({ id: n.id, path: displayPath, name: n.name, description: n.description, rulesText })
    n.children?.forEach(c => flattenTree(c, acc, [...currentPath, n.name]))
    return acc
  }

  // Apply mappings to a tree by preferring explicit dot-path matching, with name+type as fallback
  const applyMappingsToTree = (root: TreeNodeData, mappings: Array<any>): TreeNodeData => {
    if (!mappings || mappings.length === 0) return root
    const pathKeyOf = (node: TreeNodeData) => (node.id || '').split(':')[0]
    const buildMetaFrom = (m: any) => ({
      fieldEssence: m?.field?.fieldEssence || '',
      dgh: m?.field?.dgh || '',
      always: m?.field?.always || '',
      mappingDetails: m?.mappingDetails || '',
      outputs: m?.outputs || ''
    })
    const pathToMapping = new Map<string, any>()
    const nameTypeToMapping = new Map<string, any>()
    for (const m of mappings) {
      const p = (m?.targetNode?.path || '').trim()
      if (p) pathToMapping.set(p, m)
      const k = `${m?.targetNode?.name || ''}__${m?.targetNode?.type || ''}`
      nameTypeToMapping.set(k, m)
    }
    const visit = (node: TreeNodeData): TreeNodeData => {
      const nodePath = pathKeyOf(node)
      const byPath = pathToMapping.get(nodePath)
      const byNameType = nameTypeToMapping.get(`${node.name}__${node.type}`)
      const match = byPath || byNameType
      const withMeta = match ? { ...node, excelMeta: buildMetaFrom(match) } : node
      if (withMeta.children && withMeta.children.length > 0) {
        return {
          ...withMeta,
          children: withMeta.children.map(c => visit(c))
        }
      }
      return withMeta
    }
    return visit(root)
  }

  // Excel fields are not included in search results - only tree nodes are searchable

  useEffect(() => {
    if (!searchQuery.trim()) { 
      setSearchResults([]); 
      setIsResultsOpen(false); 
      // Clear all search highlights when search is cleared
      document.querySelectorAll('.search-highlight').forEach(el => {
        el.classList.remove('search-highlight')
      })
      return 
    }
    
    const all = tree ? flattenTree(tree) : []
    
    const q = searchQuery.trim().toLowerCase()
    const filtered = all.reduce<Array<{id:string; path:string; name:string; description?: string; rulesText?: string; snippet?: string}>>((acc, x) => {
      const pathMatch = x.path.toLowerCase().includes(q)
      const desc = (x.description || '')
      const dLower = desc.toLowerCase()
      const dIndex = dLower.indexOf(q)
      const rules = (x.rulesText || '')
      const rLower = rules.toLowerCase()
      const rIndex = rLower.indexOf(q)
      if (pathMatch || dIndex !== -1 || rIndex !== -1) {
        let snippet: string | undefined
        if (dIndex !== -1) {
          const contextBefore = 40
          const contextAfter = 60
          const start = Math.max(0, dIndex - contextBefore)
          const end = Math.min(desc.length, dIndex + q.length + contextAfter)
          const prefix = start > 0 ? '…' : ''
          const suffix = end < desc.length ? '…' : ''
          snippet = `${prefix}${desc.slice(start, end)}${suffix}`
        } else if (rIndex !== -1) {
          const contextBefore = 40
          const contextAfter = 60
          const start = Math.max(0, rIndex - contextBefore)
          const end = Math.min(rules.length, rIndex + q.length + contextAfter)
          const prefix = start > 0 ? '…' : ''
          const suffix = end < rules.length ? '…' : ''
          snippet = `${prefix}${rules.slice(start, end)}${suffix}`
        }
        acc.push({ ...x, snippet })
      }
      return acc
    }, []).slice(0, 20)
    setSearchResults(filtered)
    setIsResultsOpen(filtered.length > 0)
    
    // Note: Tree nodes are automatically highlighted by the revealNodeById function
    // when they match the search query, so no additional highlighting logic is needed here
  }, [tree, searchQuery])

  const revealNodeById = (id: string) => {
    // Clear any existing highlights first
    document.querySelectorAll('.search-highlight').forEach(el => {
      el.classList.remove('search-highlight')
    })
    
    // Handle tree node expansion
    const parts = id.split(':')[0].split('.')
    const openAncestors = () => {
      // Root trunk center for side decision
      const rootTile = document.querySelector('.tree-root .node-tile') as HTMLElement | null
      const rootRect = rootTile?.getBoundingClientRect()
      const rootCenterX = rootRect ? rootRect.left + rootRect.width / 2 : window.innerWidth / 2
      
      // Process ancestors from root to target to ensure proper expansion order
      for (let i = 1; i <= parts.length; i++) {
        const prefix = parts.slice(0, i).join('.')
        const el = document.querySelector(`[data-node-id^="${prefix}:"]`) as HTMLElement | null
        if (el) {
          const li = el.closest('.tree-li') as HTMLElement | null
          const toggleParent = li?.querySelector('.node-tile') as HTMLElement | null
          const binaryChildren = li?.querySelector('.binary-children') as HTMLElement | null
          
          if (toggleParent && binaryChildren) {
            // More robust state detection: check both class and visibility
            const isOpen = binaryChildren.classList.contains('open') && 
                          (binaryChildren.style.overflow !== 'hidden' || binaryChildren.offsetHeight > 0)
            
            if (!isOpen) {
              // Set preferred side hint based on position relative to root center
              const r = toggleParent.getBoundingClientRect()
              const centerX = r.left + r.width / 2
              const side = centerX < rootCenterX ? 'left' : 'right'
              if (li) (li as any).dataset.forceSide = side
              
              // Force click and wait for expansion to complete
              toggleParent.click()
              
              // Wait a frame for React state update and DOM changes
              requestAnimationFrame(() => {
                // Trigger layout-update event for forced side preference
                const layoutEvent = new CustomEvent('search:layout-update', { 
                  detail: { forceSide: side } 
                })
                toggleParent.dispatchEvent(layoutEvent)
              })
            }
          }
        }
      }
    }
    
    openAncestors()
    
    // Scroll into view and focus with more time for expansion animations
    const target = document.querySelector(`[data-node-id="${id}"]`) as HTMLElement | null
    if (target) {
      // Wait longer for expansion animations and layout to settle
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' })
            target.classList.add('search-highlight')
            // Remove the highlight after 3 seconds (3000ms) to match the CSS animation
            setTimeout(() => target.classList.remove('search-highlight'), 3000)
          })
        })
      }, 100) // Extra delay to ensure all expansions complete
    }
  }

  const clampZoom = (z: number) => Math.min(2.5, Math.max(0.5, Math.round(z * 100) / 100))
  const zoomIn = () => setZoom((z) => clampZoom(z + 0.1))
  const zoomOut = () => setZoom((z) => clampZoom(z - 0.1))
  const onWheelZoom: React.WheelEventHandler<HTMLDivElement> = (e) => {
    // During excel drag, global wheel handler will handle zoom to avoid double-processing
    if ((window as any).__excelDragging) return
    e.preventDefault()
    const delta = e.deltaY > 0 ? -0.08 : 0.08
    const newZoom = clampZoom(zoom + delta)
    
    if (newZoom !== zoom) {
      // Get mouse position relative to the wrapper that actually transforms
      const rect = (vizWrapperRef.current ?? e.currentTarget).getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      // Get current transform values
      const currentX = pan.x
      const currentY = pan.y
      
      // Calculate the point under the mouse in the scaled coordinate system
      const zoomRatio = newZoom / zoom
      
      // Adjust pan to keep the point under the mouse stationary
      const newX = mouseX - (mouseX - currentX) * zoomRatio
      const newY = mouseY - (mouseY - currentY) * zoomRatio
      
      setZoom(newZoom)
      setPan({ x: newX, y: newY })
    }
  }

  // Allow zooming with mouse wheel while dragging an excelCube anywhere on the page
  useEffect(() => {
    const onWheelWhileDragging = (e: WheelEvent | any) => {
      if (!(window as any).__excelDragging) return
      const wrapper = vizWrapperRef.current
      if (!wrapper) return
      const rect = wrapper.getBoundingClientRect()
      // Proceed even if cursor is not over wrapper; use viewport point relative to wrapper
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.08 : 0.08
      const currentZoom = zoomRef.current
      const newZoom = clampZoom(currentZoom + delta)
      if (newZoom === currentZoom) return
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      const zoomRatio = newZoom / currentZoom
      const currentPan = panRef.current
      const newX = mouseX - (mouseX - currentPan.x) * zoomRatio
      const newY = mouseY - (mouseY - currentPan.y) * zoomRatio
      setZoom(newZoom)
      setPan({ x: newX, y: newY })
    }
    // Attach to multiple targets/events for Chrome during HTML5 drag
    const opts: AddEventListenerOptions | boolean = { passive: false }
    window.addEventListener('wheel', onWheelWhileDragging, opts)
    document.addEventListener('wheel', onWheelWhileDragging, opts)
    document.body.addEventListener('wheel', onWheelWhileDragging, opts)
    // Legacy events for broader compatibility
    window.addEventListener('mousewheel', onWheelWhileDragging as EventListener, opts)
    document.addEventListener('mousewheel', onWheelWhileDragging as EventListener, opts)
    // Firefox legacy
    document.addEventListener('DOMMouseScroll', onWheelWhileDragging as EventListener, opts)
    return () => {
      window.removeEventListener('wheel', onWheelWhileDragging as EventListener)
      document.removeEventListener('wheel', onWheelWhileDragging as EventListener)
      document.body.removeEventListener('wheel', onWheelWhileDragging as EventListener)
      window.removeEventListener('mousewheel', onWheelWhileDragging as EventListener)
      document.removeEventListener('mousewheel', onWheelWhileDragging as EventListener)
      document.removeEventListener('DOMMouseScroll', onWheelWhileDragging as EventListener)
    }
  }, [])

  // Keep refs in sync with latest state
  useEffect(() => { savedMappingsRef.current = savedMappings }, [savedMappings])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { panRef.current = pan }, [pan])

  // Commit a mapping to state and update the tree
  const commitMapping = (mapping: any) => {
    try {
      // Upsert by field identity so latest mapping overwrites previous for same field
      setSavedMappings(prev => {
        const keyOf = (m: any) => `${m?.field?.name}__${m?.field?.fieldType}`
        const map = new Map<string, any>()
        prev.forEach((m) => map.set(keyOf(m), m))
        map.set(keyOf(mapping), mapping)
        const updated = Array.from(map.values())
        savedMappingsRef.current = updated
        return updated
      })

      // Update the tree to mark this node as mapped
      const updateTreeWithMapping = (node: TreeNodeData): TreeNodeData => {
        if (node.id === mapping.targetNode.id) {
          return {
            ...node,
            excelMeta: {
              fieldEssence: mapping.field.fieldEssence || '',
              dgh: mapping.field.dgh || '',
              always: mapping.field.always || '',
              mappingDetails: mapping.mappingDetails || '',
              outputs: mapping.outputs || ''
            }
          }
        }
        if (node.children) {
          return { ...node, children: node.children.map(child => updateTreeWithMapping(child)) }
        }
        return node
      }

      if (tree) {
        const updatedTree = updateTreeWithMapping(tree)
        setTree(updatedTree)
      }

      window.dispatchEvent(new CustomEvent('excel:status', { 
        detail: { 
          message: `Mapping saved for ${mapping.targetNode.name}`, 
          type: 'ok', 
          durationMs: 3000 
        } 
      }))

      // Notify ExcelExtractor that a field has been mapped (include target for label rendering)
      window.dispatchEvent(new CustomEvent('excel:mapping-saved', { 
        detail: { field: mapping.field, targetNode: mapping.targetNode } 
      }))

      setMappingData(null)
    } catch (err) {
      console.error('Failed to save mapping:', err)
      alert('Failed to save mapping. Check console for details.')
    }
  }

  const onMouseDown: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (e.button !== 0) return
    setIsPanning(true)
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }
  const onMouseMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!isPanning) return
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y })
  }
  const onMouseUp: React.MouseEventHandler<HTMLDivElement> = () => setIsPanning(false)
  const onMouseLeave: React.MouseEventHandler<HTMLDivElement> = () => setIsPanning(false)

  // Excel status toast listener
  useEffect(() => {
    const clearToastTimers = () => {
      if (toastHideTimerRef.current) { window.clearTimeout(toastHideTimerRef.current); toastHideTimerRef.current = null }
      if (toastRemoveTimerRef.current) { window.clearTimeout(toastRemoveTimerRef.current); toastRemoveTimerRef.current = null }
    }
    const onStatus = (e: any) => {
      const { message, type, durationMs } = e.detail || {}
      clearToastTimers()
      setToastLeaving(false)
      setToastShown(false)
      setToastMessage(message || '')
      setToastType(type || 'ok')
      requestAnimationFrame(() => setToastShown(true))
      const d = typeof durationMs === 'number' ? durationMs : 5000
      toastHideTimerRef.current = window.setTimeout(() => {
        setToastLeaving(true)
        toastRemoveTimerRef.current = window.setTimeout(() => {
          setToastMessage(null)
          setToastLeaving(false)
          setToastShown(false)
        }, 420)
      }, d)
    }
    window.addEventListener('excel:status', onStatus as EventListener)
    return () => {
      clearToastTimers()
      window.removeEventListener('excel:status', onStatus as EventListener)
    }
  }, [])

  // Clear all mappings and remove excelMeta from current tree when extractor requests a full clear
  useEffect(() => {
    const onClearAllMappings = () => {
      try {
        setSavedMappings([])
        savedMappingsRef.current = []
        if (tree) {
          const strip = (n: TreeNodeData): TreeNodeData => ({
            ...n,
            excelMeta: undefined,
            children: n.children ? n.children.map(strip) : n.children
          })
          setTree(strip(tree))
        }
        window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: 'נוקו כל המיפויים מהעץ', type: 'ok', durationMs: 2500 } }))
      } catch (err) {
        console.error('Failed to clear mappings:', err)
        window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: `ניקוי מיפויים נכשל: ${err}`, type: 'error', durationMs: 4000 } }))
      }
    }
    window.addEventListener('excel:clear-all-mappings', onClearAllMappings as EventListener)
    return () => window.removeEventListener('excel:clear-all-mappings', onClearAllMappings as EventListener)
  }, [tree])

  return (
    <div className="page-root">
      <div className="app-shell">
        <header className="app-header floating">
          <div className="brand">
            <img src="./images/logo.png" alt="העץ הירוק" style={{ height: '80px', width: '80px', objectFit: 'contain', marginRight: '8px', marginTop: '-12px', marginBottom: '-12px' }} />
            <div className="excel-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Upload dropdown */}
              <div className="action-dropdown" ref={uploadMenuRef} style={{ position: 'relative', width: 240 }}>
                <button 
                  className="btn glow-orange"
                  style={{ width: '100%' }}
                  onClick={() => { setIsUploadMenuOpen(!isUploadMenuOpen); setIsDownloadMenuOpen(false) }}
                >
                  העלאה <span style={{ marginLeft: 6 }}>▼</span>
                </button>
                {isUploadMenuOpen && (
                  <div className="schema-dropdown" style={{ right: 0, left: 'auto', width: '100%', minWidth: '100%' }}>
                    <div 
                      className="schema-option opt-orange"
                      onClick={() => { window.dispatchEvent(new Event('excel:upload-mapping-request')); setIsUploadMenuOpen(false) }}
                    >
                      העלה מאפינג
                    </div>
                    <div 
                      className="schema-option opt-orange"
                      onClick={() => { window.dispatchEvent(new Event('excel:upload-request')); setIsUploadMenuOpen(false) }}
                    >
                      העלה פס
                    </div>
                  </div>
                )}
              </div>

              {/* Download dropdown */}
              <div className="action-dropdown" ref={downloadMenuRef} style={{ position: 'relative', width: 240 }}>
                <button 
                  className="btn glow-green"
                  style={{ width: '100%' }}
                  onClick={() => { setIsDownloadMenuOpen(!isDownloadMenuOpen); setIsUploadMenuOpen(false) }}
                >
                  הורדה <span style={{ marginLeft: 6 }}>▼</span>
                </button>
                {isDownloadMenuOpen && (
                  <div className="schema-dropdown" style={{ right: 0, left: 'auto', width: '100%', minWidth: '100%' }}>
                    <div 
                      className="schema-option opt-green"
                      onClick={() => { 
                        if (savedMappings.length === 0) {
                          window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: 'No mappings to download yet', type: 'warn', durationMs: 2500 } }))
                          setIsDownloadMenuOpen(false)
                          return
                        }
                        if (unmappedRequiredLeaves.length > 0) {
                          setShowMissingRequiredModal(true)
                          setIsDownloadMenuOpen(false)
                          return
                        }
                        window.dispatchEvent(new Event('excel:download-mapping-request'))
                        setIsDownloadMenuOpen(false)
                      }}
                    >
                      הורד מאפינג
                    </div>
                    <div 
                      className="schema-option opt-green"
                      onClick={() => { window.dispatchEvent(new Event('excel:download-template-request')); setIsDownloadMenuOpen(false) }}
                    >
                      הורד פורמט פס
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="header-actions">
            <div className="schema-group" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div className="schema-selector">
                <button 
                  className={`btn ghost ${selectedSchema ? '' : 'is-placeholder'}`} 
                  onClick={() => setIsSchemaDropdownOpen(!isSchemaDropdownOpen)}
                >
                  {selectedSchema && availableSchemas[selectedSchema as keyof typeof availableSchemas]
                    ? availableSchemas[selectedSchema as keyof typeof availableSchemas].title
                    : (
                      <span className="schema-placeholder" dir="rtl">בחר תקן</span>
                    )}
                  <span style={{ marginLeft: '8px' }}>▼</span>
                </button>
                {isSchemaDropdownOpen && (
                  <div className="schema-dropdown">
                    {Object.entries(availableSchemas).map(([key, schema]) => (
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
            </div>
            <button className="btn ghost" onClick={onClear}>נקה</button>
            <button className="btn primary" onClick={onVisualize}>ויזואליזציה</button>
            <div className="zoom-controls">
              <div className="zoom-readout">{Math.round(zoom * 100)}%</div>
            </div>
            {/* Dropdown anchored to the actions area */}
            <div ref={inputDropdownRef} className={`input-dropdown anchored ${showInput ? 'open' : ''}`}>
              <div className="panel input dropdown">
                <div className="panel-title">קלט JSON</div>
                                  <textarea
                    className="json-input"
                    spellCheck={false}
                    placeholder="הדבק JSON כאן..."
                    value={rawInput}
                    onChange={(e) => setRawInput(e.target.value)}
                  />
                <div className="panel-footer">
                  {error ? (
                    <div className="notice error">{error}</div>
                  ) : (
                    <div className="notice ok">{parsedPreview ? `זוהה: ${parsedPreview}` : 'ממתין ל-JSON תקין...'}</div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn primary" onClick={onVisualize}>ויזואליזציה</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="app-main full-screen has-extractor">
          <ExcelExtractor />
          {isSearchVisible && (
            <div className="search-overlay">
              <div className="search-box">
                <input
                  id="tree-search"
                  type="text"
                  placeholder="Search cubes and descriptions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button 
                  onClick={() => {setIsSearchVisible(false); setSearchQuery('')}}
                  className="search-close"
                >×</button>
              </div>
              {isResultsOpen && (
                <div className="search-results">
                  {searchResults.map((res) => {
                    const escapeHtml = (s: string) => s
                      .replace(/&/g, '&amp;')
                      .replace(/</g, '&lt;')
                      .replace(/>/g, '&gt;')
                    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                    const highlightSnippet = (text: string) => {
                      const safe = escapeHtml(text)
                      const rx = new RegExp(`(${escapeRegExp(searchQuery)})`, 'gi')
                      return safe.replace(rx, '<span class="search-snippet-highlight">$1</span>')
                    }
                    return (
                      <div
                        key={res.id}
                        className="search-result-item"
                        onClick={() => { revealNodeById(res.id); setIsResultsOpen(false) }}
                      >
                        <div className="search-result-path">{res.path}</div>
                        {res.snippet && (
                          <div
                            className="search-snippet"
                            dangerouslySetInnerHTML={{ __html: highlightSnippet(res.snippet) }}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
          <section className="viz-section" onWheel={onWheelZoom}>
            <div className="full-viz" onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseLeave={onMouseLeave}>
              <div className="viz-wrapper" ref={vizWrapperRef} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
                {tree ? (
                  <TreeView root={tree} />
                ) : (
                  <div className="placeholder">בחר סכמה ולחץ על ויזואליזציה</div>
                )}
                {tree && <DynamicConnectors containerRef={vizWrapperRef} />}
              </div>
            </div>
          </section>
        </main>

        {/* Required fields floating panel */}
        {tree && (
          <div className={`required-panel ${requiredPanelOpen ? 'open' : 'collapsed'}`}>
            <div className="required-header" dir="rtl" onClick={() => setRequiredPanelOpen(o => !o)}>
              <div className="required-title">שדות חובה בתקן:</div>
              <button className="required-toggle" aria-label={requiredPanelOpen ? 'סגור' : 'פתח'}>{requiredPanelOpen ? '▲' : '▼'}</button>
            </div>
            {requiredPanelOpen && (
              <div className="required-body" dir="rtl">
                {unmappedRequiredLeaves.length === 0 ? (
                  <div className="required-empty">אין שדות חובה חסרים</div>
                ) : (
                  <ul className="required-list">
                    {unmappedRequiredLeaves.map(item => (
                      <li key={item.id} className="req-item" data-state={'required'} title={item.path}>
                        <span className="req-dot" aria-hidden="true" />
                        <span className="req-text">{item.path}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Bottom-center toast */}
        {toastMessage && (
          <div className={`toast-bottom ${toastType} ${toastLeaving ? 'leaving' : ''} ${toastShown ? 'show' : ''}`} dir="rtl">
            {toastMessage}
          </div>
        )}

        {/* Mapping Modal */}
        {mappingData && (
          <div className="modal-overlay" onClick={() => setMappingData(null)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '24px' }}>
                <h2 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>
                  Field Mapping
                </h2>
                
                <div className="mapping-grid" style={{ 
                  gridTemplateColumns: isSpecificOutputs ? '1fr auto 1fr auto 1fr auto 1fr' : '1fr auto 1fr auto 1fr',
                  alignItems: 'center'
                }}>
                  {/* Far Right: Tree Node */}
                  <div className="map-col">
                    <div className="small-h" dir="rtl" style={{ textAlign: 'center' }}>שדה בתקן</div>
                    <div className="map-card" style={{ textAlign: 'center' }}>
                      <div className="map-main">{mappingData.targetNode.name}</div>
                      <div className="map-sub">{mappingData.targetNode.type}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                        <div><strong>Description:</strong> {mappingData.targetNode.description || 'No description'}</div>
                        {mappingData.targetNode.rules && mappingData.targetNode.rules.length > 0 && (
                          <div><strong>Rules:</strong> {mappingData.targetNode.rules.join(', ')}</div>
                        )}
                        {mappingData.targetNode.valuePreview && (
                          <div><strong>Preview:</strong> {mappingData.targetNode.valuePreview}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
                    <span style={{ fontSize: '24px', color: 'var(--muted)' }}>←</span>
                  </div>
                  
                  {/* Conditional: רק בOUTPUTS */}
                  {isSpecificOutputs && (
                    <>
                      <div className="map-col">
                        <div className="small-h" dir="rtl" style={{ textAlign: 'center' }}>רק בOUTPUTS</div>
                        <div className="map-card">
                          <textarea
                            className="map-notes"
                            placeholder="Specify outputs..."
                            value={outputsText}
                            onChange={(e) => setOutputsText(e.target.value)}
                            style={{ minHeight: '120px', textAlign: 'center' }}
                          />
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
                        <span style={{ fontSize: '24px', color: 'var(--muted)' }}>←</span>
                      </div>
                    </>
                  )}
                  
                  {/* Middle: Mapping */}
                  <div className="map-col">
                    <div className="small-h" dir="rtl" style={{ textAlign: 'center' }}>פירוט הפרסר</div>
                    <div className="map-card">
                      <textarea
                        className="map-notes"
                        placeholder="Define mapping logic..."
                        value={middleText}
                        onChange={(e) => setMiddleText(e.target.value)}
                        style={{ minHeight: '120px', textAlign: 'center' }}
                      />
                    </div>
                  </div>
                  
                  {/* Arrow */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
                    <span style={{ fontSize: '24px', color: 'var(--muted)' }}>←</span>
                  </div>
                  
                  {/* Far Left: Excel Field */}
                  <div className="map-col">
                    <div className="small-h" dir="rtl" style={{ textAlign: 'center' }}>שדה מהדג"ח</div>
                    <div className="map-card" style={{ textAlign: 'center' }}>
                      <div className="map-main">{mappingData.field.name}</div>
                      <div className="map-sub">{mappingData.field.fieldType}</div>
                      <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '8px' }}>
                        <div><strong>מהות השדה:</strong> {mappingData.field.fieldEssence || '-'}</div>
                        <div><strong>דג"ח:</strong> {mappingData.field.dgh || '-'}</div>
                        <div><strong>האם יחזור תמיד:</strong> {mappingData.field.always || '-'}</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                    <input
                      type="checkbox"
                      checked={isSpecificOutputs}
                      onChange={(e) => setIsSpecificOutputs(e.target.checked)}
                      style={{ 
                        width: '16px', 
                        height: '16px', 
                        accentColor: 'var(--accent)',
                        cursor: 'pointer'
                      }}
                    />
                    <span dir="rtl">הפרסור יתבצע רק בoutputs ספציפיים</span>
                  </label>
                </div>
                
                <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    className="btn ghost" 
                    onClick={() => setMappingData(null)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn primary"
                    onClick={() => {
                      try {
                        // Build a new mapping from current modal state and commit immediately (no warning on save)
                        const newMapping = {
                          targetNode: mappingData.targetNode,
                          field: mappingData.field,
                          mappingDetails: middleText,
                          outputs: outputsText,
                          timestamp: Date.now()
                        }
                        commitMapping(newMapping)
                      } catch (err) {
                        console.error('Failed to prepare mapping:', err)
                        alert('Failed to save mapping. Check console for details.')
                      }
                    }}
                  >
                    Save Mapping
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Duplicate target mapping confirmation modal */}
        {showDuplicateMappingModal && (
          <div className="modal-overlay" onClick={() => { setShowDuplicateMappingModal(false); setPendingMapping(null) }}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '20px' }} dir="rtl">
                <h3 style={{ margin: '0 0 12px 0', textAlign: 'center' }}>זהירות!</h3>
                <p style={{ margin: '0 0 16px 0', textAlign: 'center' }}>
                  אתם משתמשים בשדה בתקן שכבר נמצא בשימוש עם שדה אחר בדג"ח! אתם בטוחים שאתם רוצים להמשיך?
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="btn ghost" onClick={() => { setShowDuplicateMappingModal(false); setPendingMapping(null); setPendingDropData(null); setDuplicateContext(null) }}>בטל</button>
                  <button className="btn primary" onClick={() => {
                    if (duplicateContext === 'drop' && pendingDropData) {
                      // Proceed to open mapping modal as if no conflict
                      const { targetNode, field } = pendingDropData
                      setMappingData({ targetNode, field })
                      setRightText(field.name || '')
                      setMiddleText('')
                      setLeftText(targetNode.name || '')
                      setIsSpecificOutputs(false)
                      setOutputsText('')
                    } else if (duplicateContext === 'save' && pendingMapping) {
                      commitMapping(pendingMapping)
                    }
                    setShowDuplicateMappingModal(false)
                    setPendingMapping(null)
                    setPendingDropData(null)
                    setDuplicateContext(null)
                  }}>המשך</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Missing required fields modal before download */}
        {showMissingRequiredModal && (
          <div className="modal-overlay" onClick={() => setShowMissingRequiredModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div style={{ padding: '20px' }} dir="rtl">
                <h3 style={{ margin: '0 0 12px 0', textAlign: 'center' }}>חסרים שדות חובה</h3>
                <p style={{ margin: '0 0 16px 0', textAlign: 'center' }}>
                  ישנם {unmappedRequiredLeaves.length} שדות חובה שעדיין לא מולאו.
                </p>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button className="btn ghost" onClick={() => setShowMissingRequiredModal(false)}>בטל</button>
                  <button className="btn primary" onClick={() => { window.dispatchEvent(new Event('excel:download-mapping-request')); setShowMissingRequiredModal(false) }}>הורד בכל זאת</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

