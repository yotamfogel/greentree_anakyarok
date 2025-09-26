import { useMemo, useState, useEffect, useRef, type CSSProperties } from 'react'
import { buildTree, TreeNodeData } from './utils/parser'
import { TreeView } from './components/TreeView'
import { DynamicConnectors } from './components/DynamicConnectors'
import { ExcelExtractor } from './components/ExcelExtractor'
import { ValueList } from './components/ValueList'
import { SagachimManager } from './components/SagachimManager'
import { SagachimStatus } from './components/SagachimStatus'
import { SagachimArchive } from './components/SagachimArchive'
import { PermissionProvider } from './contexts/PermissionContext'
import { SagachDataProvider } from './contexts/SagachDataContext'
import { LoginModal } from './components/LoginModal'
import { UserStatus } from './components/UserStatus'
import { PermissionManager } from './components/PermissionManager'
import { usePermissions } from './contexts/PermissionContext'
import ErrorBoundary from './components/ErrorBoundary'


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

function AppContent() {
  const { user, isLoading, canManageUsers } = usePermissions()

  // ----- GLOBAL APP STATE / מצב גלובלי המשפיע על כל המסכים -----
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showPermissionManager, setShowPermissionManager] = useState(false)
  const [activeScreen, setActiveScreen] = useState<'viz' | 'dictionary' | 'common' | 'status' | 'archive'>('status')
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [toastType, setToastType] = useState<ToastType>('ok')
  const [toastLeaving, setToastLeaving] = useState<boolean>(false)
  const [toastShown, setToastShown] = useState<boolean>(false)
  const toastHideTimerRef = useRef<number | null>(null)
  const toastRemoveTimerRef = useRef<number | null>(null)

  // ----- VIZ SCREEN STATE / מצבי מסך "ויזואליזציה" -----
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
  const [savedMappings, setSavedMappings] = useState<Array<{
    targetNode: TreeNodeData
    field: any
    mappingDetails: string
    outputs: string
    timestamp: number
  }>>([])
  const [selectedSchema, setSelectedSchema] = useState<string>('')
  const [isSchemaDropdownOpen, setIsSchemaDropdownOpen] = useState<boolean>(false)
  const [showExcelHeaderActions, setShowExcelHeaderActions] = useState<boolean>(false)
  const [requiredPanelOpen, setRequiredPanelOpen] = useState<boolean>(true)
  const [showMissingRequiredModal, setShowMissingRequiredModal] = useState<boolean>(false)
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState<boolean>(false)
  const [isDownloadMenuOpen, setIsDownloadMenuOpen] = useState<boolean>(false)
  const [isNavOpen, setIsNavOpen] = useState<boolean>(false)
  // Duplicate target mapping confirmation (viz)
  const [showDuplicateMappingModal, setShowDuplicateMappingModal] = useState<boolean>(false)
  const [pendingMapping, setPendingMapping] = useState<any | null>(null)
  const [pendingDropData, setPendingDropData] = useState<MappingData | null>(null)
  const [duplicateContext, setDuplicateContext] = useState<'drop' | 'save' | null>(null)

  // ----- VIZ SCREEN REFS / רפרנסים למסך הוויזואליזציה -----
  const vizWrapperRef = useRef<HTMLDivElement>(null)
  const zoomRef = useRef<number>(1)
  const panRef = useRef<{x:number;y:number}>({ x: 0, y: 0 })
  const inputDropdownRef = useRef<HTMLDivElement>(null)
  const jsonButtonRef = useRef<HTMLButtonElement>(null)
  const uploadMenuRef = useRef<HTMLDivElement>(null)
  const downloadMenuRef = useRef<HTMLDivElement>(null)
  const navMenuRef = useRef<HTMLDivElement>(null)
  const lastImportedMappingsRef = useRef<any[] | null>(null)
  const savedMappingsRef = useRef<typeof savedMappings>([])

  // ----- DICTIONARY SCREEN STATE / מצבי מסך "מילון" -----
  // ----- CROSS-SCREEN NAVIGATION EFFECTS / שמירה על מגבלות גישה למסכים -----
  useEffect(() => {
    if (user && user.role !== 'admin') {
      if (activeScreen === 'viz' || activeScreen === 'dictionary' || activeScreen === 'common') {
        setActiveScreen('status')
      }
    }
  }, [user, activeScreen])

  const parsedPreview = useMemo(() => {
    try {
      const v = JSON.parse(rawInput)
      return typeof v
    } catch {
      return null
    }
  }, [rawInput])

  // Compute list of unmapped mandatory leaf fields (required only)
  const unmappedMandatoryLeaves = useMemo(() => {
    if (!tree) return [] as Array<{ id: string; path: string; requiredState: 'required' }>
    const results: Array<{ id: string; path: string; requiredState: 'required' }> = []
    const walk = (n: TreeNodeData, ancestors: string[]) => {
      const children = n.children ?? []
      const isLeaf = children.length === 0
      const isMapped = !!(n.excelMeta && Object.keys(n.excelMeta).length > 0)
      const isMandatory = n.requiredState === 'required'
      const pathNames = [...ancestors, n.name]
      if (isLeaf && isMandatory && !isMapped) {
        // Remove the root cube's name from the displayed path
        const displayPath = pathNames.slice(1).join(' -> ')
        results.push({ id: n.id, path: displayPath, requiredState: n.requiredState as 'required' })
      }
      children.forEach((c) => walk(c, pathNames))
    }
    walk(tree, [])
    return results
  }, [tree])

  // Show only truly mandatory (red) fields in the right-side panel
  const unmappedRequiredLeaves = useMemo(() => {
    return unmappedMandatoryLeaves
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
          firstName: { type: 'string', description: 'Given name of the person', minLength: 1 },
          lastName: { type: 'string', description: 'Family name of the person', minLength: 1 },
          email: { type: 'string', format: 'email', description: 'Primary contact email address' },
          phone: { type: 'string', pattern: '^\\+?[0-9\n\r\-\s]{7,15}$', description: 'Phone number with optional country code' },
          account: {
            type: 'object',
            description: 'User account settings and preferences',
            properties: {
              username: { type: 'string', description: 'Unique username for login', minLength: 3, maxLength: 16 },
              password: { type: 'string', description: 'Secure password for account access', minLength: 8 },
              preferences: {
                type: 'object',
                description: 'User interface and notification preferences',
                properties: {
                  notifications: { type: 'boolean', description: 'Enable push notifications' },
                  theme: { type: 'string', description: 'Visual theme preference', enum: ['light', 'dark', 'system'] },
                  shortcuts: {
                    type: 'array',
                    description: 'Custom keyboard shortcuts',
                    items: {
                      type: 'object',
                      required: ['name', 'keys'],
                      properties: {
                        name: { type: 'string', description: 'Shortcut action name' },
                        keys: { type: 'string', description: 'Keyboard combination', pattern: '^[A-Z]+\+[A-Z]+$' }
                      }
                    }
                  }
                }
              }
            }
          },
          address: {
            type: 'object',
            description: 'Primary residential address',
            required: ['street', 'city'],
            properties: {
              street: { type: 'string', description: 'Street name and number', minLength: 1 },
              city: { type: 'string', description: 'City name', minLength: 1 },
              state: { type: 'string', description: 'State or province' },
              zip: { type: 'string', description: 'Postal code', pattern: '^[0-9]{5}(?:-[0-9]{4})?$' }
            }
          },
          secondary_residence: {
            type: 'object',
            description: 'Optional secondary residence; if present, street and city are required',
            required: ['street', 'city'],
            properties: {
              street: { type: 'string', description: 'Street name and number' },
              city: { type: 'string', description: 'City name' },
              coordinates: {
                type: 'object',
                description: 'Geographic coordinates of the residence',
                properties: {
                  lat: { type: 'number', description: 'Latitude coordinate', minimum: -90, maximum: 90 },
                  lng: { type: 'number', description: 'Longitude coordinate', minimum: -180, maximum: 180 }
                }
              }
            }
          },
          documents: {
            type: 'array',
            description: 'Collection of uploaded documents',
            items: {
              type: 'object',
              required: ['fileName', 'mimeType'],
              properties: {
                fileName: { type: 'string', description: 'Original filename of the document' },
                mimeType: { type: 'string', description: 'MIME type of the document', pattern: '^[-\w.]+/[-\w.]+$' },
                sizeKb: { type: 'integer', description: 'File size in kilobytes', minimum: 1, maximum: 10240 }
              }
            }
          },
          age: { type: 'integer', description: 'Age in years', minimum: 0, maximum: 120 },
          tags: { type: 'array', description: 'User-defined tags for categorization', items: { type: 'string', maxLength: 20 } }
        }
      }
    },
    'gps_location': {
      title: 'GPS Location Device',
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'GPSLocationDevice',
        type: 'object',
        required: ['deviceId', 'location', 'timestamp'],
        properties: {
          deviceId: { type: 'string', description: 'Unique identifier for the GPS device', minLength: 1 },
          deviceInfo: {
            type: 'object',
            description: 'Device hardware and software information',
            required: ['model', 'firmwareVersion'],
            properties: {
              model: { type: 'string', description: 'Device model name', minLength: 1 },
              manufacturer: { type: 'string', description: 'Device manufacturer', minLength: 1 },
              firmwareVersion: { type: 'string', description: 'Current firmware version', pattern: '^\\d+\\.\\d+\\.\\d+$' },
              serialNumber: { type: 'string', description: 'Device serial number', pattern: '^[A-Z0-9]{8,16}$' },
              batteryLevel: { type: 'number', description: 'Battery level percentage', minimum: 0, maximum: 100 },
              lastMaintenance: { type: 'string', description: 'Last maintenance date', format: 'date' }
            }
          },
          location: {
            type: 'object',
            description: 'Current GPS location data',
            required: ['latitude', 'longitude', 'accuracy'],
            properties: {
              latitude: { type: 'number', description: 'Latitude coordinate in decimal degrees', minimum: -90, maximum: 90 },
              longitude: { type: 'number', description: 'Longitude coordinate in decimal degrees', minimum: -180, maximum: 180 },
              accuracy: { type: 'number', description: 'GPS accuracy in meters', minimum: 0, maximum: 1000 },
              altitude: { type: 'number', description: 'Altitude above sea level in meters', minimum: -1000, maximum: 10000 },
              heading: { type: 'number', description: 'Direction of movement in degrees', minimum: 0, maximum: 360 },
              speed: { type: 'number', description: 'Speed in meters per second', minimum: 0, maximum: 100 },
              satellites: { type: 'integer', description: 'Number of GPS satellites in view', minimum: 0, maximum: 32 }
            }
          },
          timestamp: { type: 'string', description: 'ISO 8601 timestamp of location reading', format: 'date-time' },
          environmental: {
            type: 'object',
            description: 'Environmental sensor data if available',
            properties: {
              temperature: { type: 'number', description: 'Ambient temperature in Celsius', minimum: -50, maximum: 80 },
              humidity: { type: 'number', description: 'Relative humidity percentage', minimum: 0, maximum: 100 },
              pressure: { type: 'number', description: 'Atmospheric pressure in hPa', minimum: 800, maximum: 1200 }
            }
          },
          connectivity: {
            type: 'object',
            description: 'Communication and connectivity status',
            required: ['status'],
            properties: {
              status: { type: 'string', description: 'Connection status', enum: ['online', 'offline', 'error', 'maintenance'] },
              signalStrength: { type: 'number', description: 'Signal strength in dBm', minimum: -120, maximum: -30 },
              lastSync: { type: 'string', description: 'Last successful data sync timestamp', format: 'date-time' },
              protocol: { type: 'string', description: 'Communication protocol used', enum: ['4G', '5G', 'WiFi', 'Satellite'] }
            }
          },
          alerts: {
            type: 'array',
            description: 'Active alerts and notifications',
            items: {
              type: 'object',
              required: ['type', 'message', 'severity'],
              properties: {
                type: { type: 'string', description: 'Alert type', enum: ['low_battery', 'out_of_range', 'maintenance_due', 'error'] },
                message: { type: 'string', description: 'Alert description', minLength: 1 },
                severity: { type: 'string', description: 'Alert severity level', enum: ['low', 'medium', 'high', 'critical'] },
                timestamp: { type: 'string', description: 'When the alert was generated', format: 'date-time' }
              }
            }
          }
        }
      }
    },
    'cellular_tracking': {
      title: 'Cellular Mobile Tracking',
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'CellularMobileTracking',
        type: 'object',
        required: ['mobileNumber', 'trackingData', 'timestamp'],
        properties: {
          mobileNumber: { type: 'string', description: 'Mobile phone number being tracked', pattern: '^\\+[1-9]\\d{1,14}$' },
          subscriberInfo: {
            type: 'object',
            description: 'Mobile subscriber identification and details',
            required: ['imsi', 'msisdn'],
            properties: {
              imsi: { type: 'string', description: 'International Mobile Subscriber Identity', pattern: '^[0-9]{14,15}$' },
              msisdn: { type: 'string', description: 'Mobile Station International Subscriber Directory Number', pattern: '^[0-9]{12,15}$' },
              iccid: { type: 'string', description: 'Integrated Circuit Card Identifier', pattern: '^[0-9]{19,20}$' },
              carrier: { type: 'string', description: 'Mobile network operator name', minLength: 1 },
              planType: { type: 'string', description: 'Subscription plan type', enum: ['prepaid', 'postpaid', 'corporate'] }
            }
          },
          trackingData: {
            type: 'object',
            description: 'Real-time location and movement tracking information',
            required: ['cellTower', 'signalStrength'],
            properties: {
              cellTower: {
                type: 'object',
                description: 'Current serving cell tower information',
                required: ['cellId', 'lac', 'mcc', 'mnc'],
                properties: {
                  cellId: { type: 'integer', description: 'Cell tower identifier', minimum: 1, maximum: 65535 },
                  lac: { type: 'integer', description: 'Location Area Code', minimum: 1, maximum: 65535 },
                  mcc: { type: 'integer', description: 'Mobile Country Code', minimum: 100, maximum: 999 },
                  mnc: { type: 'integer', description: 'Mobile Network Code', minimum: 0, maximum: 999 },
                  coordinates: {
                    type: 'object',
                    description: 'Cell tower geographic coordinates',
                    properties: {
                      latitude: { type: 'number', description: 'Tower latitude', minimum: -90, maximum: 90 },
                      longitude: { type: 'number', description: 'Tower longitude', minimum: -180, maximum: 180 }
                    }
                  }
                }
              },
              signalStrength: { type: 'number', description: 'Signal strength in dBm', minimum: -120, maximum: -30 },
              networkType: { type: 'string', description: 'Current network technology', enum: ['2G', '3G', '4G', '5G'] },
              roaming: { type: 'boolean', description: 'Whether device is roaming' },
              estimatedLocation: {
                type: 'object',
                description: 'Estimated device location based on cell tower triangulation',
                properties: {
                  latitude: { type: 'number', description: 'Estimated latitude', minimum: -90, maximum: 90 },
                  longitude: { type: 'number', description: 'Estimated longitude', minimum: -180, maximum: 180 },
                  accuracy: { type: 'number', description: 'Location accuracy in meters', minimum: 100, maximum: 50000 }
                }
              }
            }
          },
          timestamp: { type: 'string', description: 'Tracking data timestamp', format: 'date-time' },
          movement: {
            type: 'object',
            description: 'Movement and velocity information',
            properties: {
              speed: { type: 'number', description: 'Movement speed in km/h', minimum: 0, maximum: 500 },
              direction: { type: 'number', description: 'Movement direction in degrees', minimum: 0, maximum: 360 },
              acceleration: { type: 'number', description: 'Acceleration in m/s²', minimum: -50, maximum: 50 },
              stationary: { type: 'boolean', description: 'Whether device is currently stationary' }
            }
          },
          callLog: {
            type: 'array',
            description: 'Recent call activity log',
            items: {
              type: 'object',
              required: ['type', 'timestamp', 'duration'],
              properties: {
                type: { type: 'string', description: 'Call type', enum: ['incoming', 'outgoing', 'missed'] },
                timestamp: { type: 'string', description: 'Call timestamp', format: 'date-time' },
                duration: { type: 'integer', description: 'Call duration in seconds', minimum: 0 },
                number: { type: 'string', description: 'Phone number involved in call', pattern: '^\\+[1-9]\\d{1,14}$' }
              }
            }
          },
          dataUsage: {
            type: 'object',
            description: 'Mobile data consumption statistics',
            properties: {
              currentPeriod: { type: 'integer', description: 'Data used in current billing period (MB)', minimum: 0 },
              totalLimit: { type: 'integer', description: 'Total data limit for period (MB)', minimum: 0 },
              lastReset: { type: 'string', description: 'Last data reset date', format: 'date' }
            }
          }
        }
      }
    },
    'license_plate': {
      title: 'License Plate Identification',
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'LicensePlateIdentification',
        type: 'object',
        required: ['plateNumber', 'detectionData', 'timestamp'],
        properties: {
          plateNumber: { type: 'string', description: 'Identified license plate number', pattern: '^[A-Z0-9\\-\\s]{2,12}$' },
          vehicleInfo: {
            type: 'object',
            description: 'Vehicle information associated with the license plate',
            required: ['make', 'model'],
            properties: {
              make: { type: 'string', description: 'Vehicle manufacturer brand', minLength: 1 },
              model: { type: 'string', description: 'Vehicle model name', minLength: 1 },
              year: { type: 'integer', description: 'Vehicle manufacturing year', minimum: 1900, maximum: 2030 },
              color: { type: 'string', description: 'Primary vehicle color', minLength: 1 },
              bodyType: { type: 'string', description: 'Vehicle body style', enum: ['sedan', 'suv', 'truck', 'motorcycle', 'bus', 'van'] },
              fuelType: { type: 'string', description: 'Vehicle fuel type', enum: ['gasoline', 'diesel', 'electric', 'hybrid', 'hydrogen'] }
            }
          },
          detectionData: {
            type: 'object',
            description: 'License plate detection and recognition details',
            required: ['confidence', 'imageQuality'],
            properties: {
              confidence: { type: 'number', description: 'Recognition confidence score (0-100)', minimum: 0, maximum: 100 },
              imageQuality: { type: 'string', description: 'Image quality assessment', enum: ['excellent', 'good', 'fair', 'poor'] },
              processingTime: { type: 'number', description: 'Processing time in milliseconds', minimum: 0, maximum: 10000 },
              algorithm: { type: 'string', description: 'Recognition algorithm used', minLength: 1 },
              ocrVersion: { type: 'string', description: 'OCR software version', pattern: '^\\d+\\.\\d+\\.\\d+$' }
            }
          },
          timestamp: { type: 'string', description: 'Detection timestamp', format: 'date-time' },
          location: {
            type: 'object',
            description: 'Location where the license plate was detected',
            required: ['cameraId', 'coordinates'],
            properties: {
              cameraId: { type: 'string', description: 'Unique camera identifier', minLength: 1 },
              coordinates: {
                type: 'object',
                description: 'Geographic coordinates of detection point',
                required: ['latitude', 'longitude'],
                properties: {
                  latitude: { type: 'number', description: 'Detection latitude', minimum: -90, maximum: 90 },
                  longitude: { type: 'number', description: 'Detection longitude', minimum: -180, maximum: 180 },
                  altitude: { type: 'number', description: 'Detection altitude in meters', minimum: -1000, maximum: 10000 }
                }
              },
              address: { type: 'string', description: 'Human-readable address of detection point' },
              zone: { type: 'string', description: 'Traffic zone or area designation' }
            }
          },
          imageData: {
            type: 'object',
            description: 'Captured image and processing information',
            required: ['imageUrl'],
            properties: {
              imageUrl: { type: 'string', description: 'URL to captured image', format: 'uri' },
              thumbnailUrl: { type: 'string', description: 'URL to thumbnail version', format: 'uri' },
              imageFormat: { type: 'string', description: 'Image file format', enum: ['JPEG', 'PNG', 'BMP', 'TIFF'] },
              resolution: { type: 'string', description: 'Image resolution (width x height)', pattern: '^\\d+x\\d+$' },
              fileSize: { type: 'integer', description: 'Image file size in bytes', minimum: 1 }
            }
          },
          trafficViolations: {
            type: 'array',
            description: 'Traffic violations associated with this vehicle',
            items: {
              type: 'object',
              required: ['type', 'timestamp', 'location'],
              properties: {
                type: { type: 'string', description: 'Violation type', enum: ['speeding', 'red_light', 'parking', 'toll_evasion', 'other'] },
                timestamp: { type: 'string', description: 'Violation timestamp', format: 'date-time' },
                location: { type: 'string', description: 'Violation location description' },
                fine: { type: 'number', description: 'Fine amount in local currency', minimum: 0 },
                status: { type: 'string', description: 'Violation status', enum: ['pending', 'paid', 'disputed', 'dismissed'] }
              }
            }
          },
          registration: {
            type: 'object',
            description: 'Vehicle registration and ownership information',
            properties: {
              ownerName: { type: 'string', description: 'Registered owner name', minLength: 1 },
              registrationDate: { type: 'string', description: 'Registration date', format: 'date' },
              expiryDate: { type: 'string', description: 'Registration expiry date', format: 'date' },
              insurance: {
                type: 'object',
                description: 'Insurance policy details',
                properties: {
                  provider: { type: 'string', description: 'Insurance company name' },
                  policyNumber: { type: 'string', description: 'Insurance policy number' },
                  expiryDate: { type: 'string', description: 'Insurance expiry date', format: 'date' }
                }
              }
            }
          }
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
    },
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
            required: ['name', 'email'],
            properties: {
              name: { type: 'string', description: 'Full name', minLength: 1 },
              email: { type: 'string', description: 'Email', format: 'email' },
              bio: { type: 'string', description: 'Short biography', maxLength: 200 },
              address: {
                type: 'object',
                description: 'Optional address. If present, street and city are mandatory',
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
      // For nav menu, also check if clicking on the fixed-position dropdown
      const isNavButton = navMenuRef.current && navMenuRef.current.contains(target)
      const isNavDropdown = (target as Element)?.closest?.('.schema-dropdown[role="menu"]')
      if (!isNavButton && !isNavDropdown) {
        setIsNavOpen(false)
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

  const setSagachTriggerHover = (target: HTMLButtonElement, hover: boolean) => {
    target.style.transform = hover ? 'translateY(-1px)' : 'translateY(0px)'
    target.style.boxShadow = hover ? '0 6px 20px rgba(0,0,0,0.35)' : 'none'
  }

  const setSagachOptionHover = (target: HTMLDivElement, hover: boolean, active: boolean) => {
    if (!target.dataset.baseBg) {
      target.dataset.baseBg = target.style.background || ''
    }

    if (target.classList.contains('opt-orange')) {
      if (hover) {
        target.style.background = 'rgba(228, 184, 27, 0.55)'
        return
      }

      if (active) {
        target.style.background = 'rgba(228, 184, 27, 0.55)'
        return
      }
    }
    else if (target.classList.contains('opt-green')) {
      if (hover) {
        target.style.background = 'rgba(38, 216, 56, 0.55)'
        return
      }

      if (active) {
        target.style.background = 'rgba(38, 216, 56, 0.55)'
        return
      }
    }
    const baseBg = target.dataset.baseBg
    if (typeof baseBg === 'string') {
      target.style.background = baseBg
    } else {
      target.style.removeProperty('background')
    }
  }

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
            
            {/* Archive Button - Only visible on status screen */}
            {activeScreen === 'status' && (
              <div className="archive-container" style={{ marginRight: '16px' }}>
                <button 
                  className="btn glow-blue"
                  onClick={() => setActiveScreen('archive')}
                  style={{
                    padding: '12px 16px',
                    maxHeight: '35px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    direction: 'rtl',
                    fontFamily: 'Segoe UI, sans-serif'
                  }}
                  title="ארכיון סגחים מובצעים"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style={{ marginLeft: '8px' }}>
                    <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 9.5l4 4h-2.5V16h-3v-2.5H8l4-4z"/>
                  </svg>
                  ארכיון
                </button>
              </div>
            )}
            
            {activeScreen === 'viz' && user?.role === 'admin' && (
            <div className="excel-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Upload dropdown */}
              <div className="action-dropdown" ref={uploadMenuRef} style={{ position: 'relative', width: 240 }}>
                <button 
                  className="btn glow-orange"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    minHeight: '35px',
                    maxHeight: '35px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    direction: 'rtl'
                  }}
                  onClick={() => { setIsUploadMenuOpen(!isUploadMenuOpen); setIsDownloadMenuOpen(false) }}
                  onMouseEnter={(e) => setSagachTriggerHover(e.currentTarget, true)}
                  onMouseLeave={(e) => setSagachTriggerHover(e.currentTarget, false)}
                >
                  <span style={{ marginLeft: 5,marginTop: '2px', fontSize: '10px' }}>▲</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>העלאה</span>
                  </span>
                </button>
                {isUploadMenuOpen && (
                  <div
                    className="schema-dropdown"
                    style={{
                      right: 0,
                      left: 'auto',
                      width: '100%',
                      minWidth: '100%',
                      border: '1px solid rgba(201, 168, 25, 0.17)',
                      borderRadius: '12px',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      background: 'rgba(182, 130, 32, 0.93)',
                      boxShadow: '0 18px 44px rgba(0,0,0,0.7)',
                      backdropFilter: 'blur(48px)',
                      overflow: 'hidden'
                    }}
                  >
                    <div 
                      className="schema-option opt-orange"
                      onClick={() => { window.dispatchEvent(new Event('excel:upload-mapping-request')); setIsUploadMenuOpen(false) }}
                      dir="rtl"
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        textAlign: 'center',
                        background: 'rgba(10,24,45,0.98)',
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => setSagachOptionHover(e.currentTarget, true, false)}
                      onMouseLeave={(e) => setSagachOptionHover(e.currentTarget, false, false)}
                    >
                      העלה Mapping
                    </div>
                    <div 
                      className="schema-option opt-orange"
                      onClick={() => { window.dispatchEvent(new Event('excel:upload-request')); setIsUploadMenuOpen(false) }}
                      style={{
                        padding: '10px 12px',
                        borderBottom: 'none',
                        textAlign: 'center',
                        background: 'rgba(10,24,45,0.98)',
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => setSagachOptionHover(e.currentTarget, true, false)}
                      onMouseLeave={(e) => setSagachOptionHover(e.currentTarget, false, false)}
                    >
                      העלה קובץ דג"ח
                    </div>
                  </div>
                )}
              </div>

              {/* Download dropdown */}
              <div className="action-dropdown" ref={downloadMenuRef} style={{ position: 'relative', width: 240 }}>
                <button 
                  className="btn glow-green"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    minHeight: '35px',
                    maxHeight: '35px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '14px',
                    direction: 'rtl'
                  }}
                  onClick={() => { setIsDownloadMenuOpen(!isDownloadMenuOpen); setIsUploadMenuOpen(false) }}
                  onMouseEnter={(e) => setSagachTriggerHover(e.currentTarget, true)}
                  onMouseLeave={(e) => setSagachTriggerHover(e.currentTarget, false)}
                >
                  <span style={{ marginLeft: 5,marginTop: '2px', fontSize: '10px' }}>▼</span>
                  <span style={{ display: 'flex', alignItems: 'center',textAlign: 'center', justifyContent: 'center', gap: 6 }}>
                    <span>הורדה</span>
                  </span>
                </button>
                {isDownloadMenuOpen && (
                  <div
                    className="schema-dropdown"
                    style={{
                      right: 0,
                      left: 'auto',
                      width: '100%',
                      minWidth: '100%',
                      border: '1px solid rgba(39, 228, 22, 0.76)',
                      borderRadius: '12px',
                      marginTop: '4px',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      background: 'rgba(10,24,45,0.98)',
                      boxShadow: '0 12px 32px rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(40px)',
                      overflow: 'hidden'
                    }}
                  >
                    <div 
                      className="schema-option opt-green"
                      onClick={() => { 
                        if (savedMappings.length === 0) {
                          window.dispatchEvent(new CustomEvent('excel:status', { detail: { message: 'No mappings to download yet', type: 'warn', durationMs: 2500 } }))
                          setIsDownloadMenuOpen(false)
                          return
                        }
                        if (unmappedRequiredLeaves.length > 0) {
                          window.dispatchEvent(new Event('excel:download-mapping-request'))
                          setIsDownloadMenuOpen(false)
                          return
                        }
                        window.dispatchEvent(new Event('excel:download-mapping-request'))
                        setIsDownloadMenuOpen(false)
                      }}
                      dir="rtl"
                      style={{
                        padding: '10px 12px',
                        borderBottom: '1px solid rgba(255,255,255,0.08)',
                        textAlign: 'center',
                        background: 'rgba(10,24,45,0.98)',
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => setSagachOptionHover(e.currentTarget, true, false)}
                      onMouseLeave={(e) => setSagachOptionHover(e.currentTarget, false, false)}
                    >
                      הורד Mapping
                    </div>
                    <div 
                      className="schema-option opt-green"
                      onClick={() => { window.dispatchEvent(new Event('excel:download-template-request')); setIsDownloadMenuOpen(false) }}
                      style={{
                        padding: '10px 12px',
                        borderBottom: 'none',
                        textAlign: 'center',
                        background: 'rgba(10,24,45,0.98)',
                        color: '#ffffff'
                      }}
                      onMouseEnter={(e) => setSagachOptionHover(e.currentTarget, true, false)}
                      onMouseLeave={(e) => setSagachOptionHover(e.currentTarget, false, false)}
                    >
                      הורד פורמט דג"ח
                    </div>
                  </div>
                )}
              </div>
            </div>
            )}

          </div>
          <div className="header-actions">
            {/* User authentication section */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {user ? (
                <>
                  <UserStatus />
                  {canManageUsers() && (
                    <button
                      onClick={() => setShowPermissionManager(true)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'rgba(255, 165, 0, 0.2)',
                        color: '#ffa500',
                        border: '1px solid rgba(255, 165, 0, 0.4)',
                        borderRadius: '8px',
                        fontSize: '12px',
                        maxHeight: '35px',
                        fontFamily: 'Segoe UI, Arial, sans-serif',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        direction: 'rtl',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 165, 0, 0.3)'
                        e.currentTarget.style.borderColor = 'rgba(255, 165, 0, 0.6)'
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(255, 165, 0, 0.2)'
                        e.currentTarget.style.borderColor = 'rgba(255, 165, 0, 0.4)'
                      }}
                    >
                      <span>⚙️</span>
                      ניהול הרשאות
                    </button>
                  )}
                </>
              ) : (
                <button
                  onClick={() => setShowLoginModal(true)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontFamily: 'Segoe UI, Arial, sans-serif',
                    cursor: 'pointer',
                    transition: 'background-color 0.2s',
                    direction: 'rtl'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--accent-hover)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
                >
                  התחבר
                </button>
              )}
            </div>

            {activeScreen === 'viz' && user?.role === 'admin' && (
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
            )}
            {activeScreen === 'viz' && user?.role === 'admin' && (
              <>
                <button className="btn ghost" onClick={onClear} style={{ display: 'flex', padding: '12px 14px', maxHeight: '35px', justifyContent: 'center',alignItems: 'center',alignSelf: 'center'}}>נקה</button>
                <button className="btn primary" onClick={onVisualize} style={{ display: 'flex', padding: '12px 14px', maxHeight: '35px', justifyContent: 'center',alignItems: 'center',alignSelf: 'center'}}>ויזואליזציה</button>
                <div className="zoom-controls">
                  <div className="zoom-readout">{Math.round(zoom * 100)}%</div>
                </div>
              </>
            )}

            {/* Dropdown anchored to the actions area - Admin only */}
            {user?.role === 'admin' && (
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
                      <button className="btn primary" onClick={onVisualize} style={{ padding: '12px 14px', minHeight: '48px' }}>ויזואליזציה</button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notification Button - Only visible on shared space screen for admins */}
            {activeScreen === 'common' && user?.role === 'admin' && (
              <div className="notification-container">
                <button className="notification-btn" onClick={() => console.log('Notifications clicked')}>
                  <svg className="notification-icon" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
                  </svg>
                  <span className="notification-count">3</span>
                </button>
              </div>
            )}


            {/* Navigation hamburger */}
            <div className="action-dropdown" ref={navMenuRef} style={{ position: 'relative' }}>
              <button
                className="btn ghost"
                aria-haspopup="menu"
                aria-expanded={isNavOpen ? 'true' : 'false'}
                onClick={() => {
                  console.log('Hamburger clicked, current isNavOpen:', isNavOpen, 'activeScreen:', activeScreen)
                  setIsNavOpen(!isNavOpen)
                }}
                title="ניווט"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                  <rect x="3" y="6" width="18" height="2" rx="1" />
                  <rect x="3" y="11" width="18" height="2" rx="1" />
                  <rect x="3" y="16" width="18" height="2" rx="1" />
                </svg>
              </button>
              {isNavOpen && (
                <div 
                  className="schema-dropdown" 
                  style={{ 
                    right: 0, 
                    left: 'auto', 
                    minWidth: 220,
                    position: 'absolute'
                  }} 
                  role="menu" 
                  dir="rtl"
                >
                  
                  {user?.role === 'admin' && (
                    <div
                      className="schema-option"
                      role="menuitem"
                      onClick={() => {
                        console.log('Clicking viz option')
                        setActiveScreen('viz')
                        setIsNavOpen(false)
                        setIsUploadMenuOpen(false)
                        setIsDownloadMenuOpen(false)
                        setIsSchemaDropdownOpen(false)
                      }}
                      onMouseEnter={() => console.log('Hovering over viz option')}
                      onMouseLeave={() => console.log('Leaving viz option')}
                      style={{ 
                        position: 'relative',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        transition: 'background 0.2s ease',
                        fontSize: '14px',
                        color: '#ffffff',
                        textAlign: 'center',
                        pointerEvents: 'auto',
                        zIndex: 9999999
                      }}
                    >
                      ויואליזציה + Mapping
                      <span style={{ position: 'absolute', right: '8px', fontSize: '10px', color: 'var(--muted)' }}>→</span>
                    </div>
                  )}
                  {user?.role === 'admin' && (
                    <div
                      className="schema-option"
                      role="menuitem"
                      onClick={() => {
                        console.log('Clicking dictionary option')
                        setActiveScreen('dictionary')
                        setIsNavOpen(false)
                        setIsUploadMenuOpen(false)
                        setIsDownloadMenuOpen(false)
                        setIsSchemaDropdownOpen(false)
                      }}
                      onMouseEnter={() => console.log('Hovering over dictionary option')}
                      onMouseLeave={() => console.log('Leaving dictionary option')}
                      style={{ 
                        position: 'relative',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        transition: 'background 0.2s ease',
                        fontSize: '14px',
                        color: '#ffffff',
                        textAlign: 'center',
                        pointerEvents: 'auto',
                        zIndex: 9999999
                      }}
                    >
                      מילון התקן
                      <span style={{ position: 'absolute', right: '8px', fontSize: '10px', color: 'var(--muted)' }}>→</span>
                    </div>
                  )}
                  {user?.role === 'admin' && (
                    <div
                      className="schema-option"
                      role="menuitem"
                      onClick={() => {
                        console.log('Clicking common option')
                        setActiveScreen('common')
                        setIsNavOpen(false)
                        setIsUploadMenuOpen(false)
                        setIsDownloadMenuOpen(false)
                        setIsSchemaDropdownOpen(false)
                      }}
                      onMouseEnter={() => console.log('Hovering over common option')}
                      onMouseLeave={() => console.log('Leaving common option')}
                      style={{ 
                        position: 'relative',
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        transition: 'background 0.2s ease',
                        fontSize: '14px',
                        color: '#ffffff',
                        textAlign: 'center',
                        pointerEvents: 'auto',
                        zIndex: 9999999
                      }}
                    >
                      המרחב המשותף
                      <span style={{ position: 'absolute', right: '8px', fontSize: '10px', color: 'var(--muted)' }}>→</span>
                    </div>
                  )}
                  <div
                    className="schema-option"
                    role="menuitem"
                    onClick={() => {
                      console.log('Clicking status option')
                      setActiveScreen('status')
                      setIsNavOpen(false)
                      setIsUploadMenuOpen(false)
                      setIsDownloadMenuOpen(false)
                      setIsSchemaDropdownOpen(false)
                    }}
                    onMouseEnter={() => console.log('Hovering over status option')}
                    onMouseLeave={() => console.log('Leaving status option')}
                    style={{ 
                      position: 'relative',
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      transition: 'background 0.2s ease',
                      fontSize: '14px',
                      color: '#ffffff',
                      textAlign: 'center',
                      pointerEvents: 'auto',
                      zIndex: 9999999
                    }}
                  >
                    סטטוס סג"חים
                    <span style={{ position: 'absolute', right: '8px', fontSize: '10px', color: 'var(--muted)' }}>→</span>
                  </div>

                </div>
              )}
            </div>
          </div>
        </header>

        {activeScreen === 'viz' && user?.role === 'admin' ? (
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
        ) : activeScreen === 'dictionary' && user?.role === 'admin' ? (
          <ValueList schemas={availableSchemas as any} />
        ) : activeScreen === 'common' && user?.role === 'admin' ? (
          <SagachimManager />
        ) : activeScreen === 'status' ? (
          <SagachimStatus />
        ) : activeScreen === 'archive' ? (
          <SagachimArchive onBack={() => setActiveScreen('status')} />
        ) : user && user.role !== 'admin' ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            padding: '40px',
            textAlign: 'center',
            direction: 'rtl'
          }}>
            <div style={{
              background: 'linear-gradient(135deg, rgba(255,165,0,0.1), rgba(255,165,0,0.05))',
              border: '1px solid rgba(255,165,0,0.3)',
              borderRadius: '16px',
              padding: '40px',
              maxWidth: '600px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
            }}>
              <div style={{
                fontSize: '48px',
                marginBottom: '20px',
                color: 'var(--accent)'
              }}>
                🔒
              </div>
              <h2 style={{
                color: 'var(--text)',
                fontSize: '24px',
                fontWeight: '600',
                marginBottom: '16px'
              }}>
                גישה מוגבלת
              </h2>
              <p style={{
                color: 'var(--muted)',
                fontSize: '16px',
                lineHeight: '1.6',
                marginBottom: '24px'
              }}>
                רק מנהלים יכולים לגשת למסכי העץ, הבנק והמרחב המשותף. 
                <br />
                אתה יכול לגשת למסך סטטוס הסג"חים בלבד.
              </p>
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  background: 'rgba(124,192,255,0.1)',
                  border: '1px solid rgba(124,192,255,0.3)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '14px',
                  color: 'var(--accent)'
                }}>
                  <strong>תפקיד נוכחי:</strong> {user.role === 'viewer' ? 'צופה' : user.role === 'editor' ? 'עורך' : 'מנהל'}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Required fields floating panel - Admin only */}
        {activeScreen === 'viz' && tree && user?.role === 'admin' && (
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

      {/* Login Modal */}
      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
      />

      {/* Permission Manager Modal */}
      <PermissionManager 
        isOpen={showPermissionManager} 
        onClose={() => setShowPermissionManager(false)} 
      />

    </div>
  )
}

export default function App() {
  return (
    <ErrorBoundary>
      <PermissionProvider>
        <SagachDataProvider>
          <AppContent />
        </SagachDataProvider>
      </PermissionProvider>
    </ErrorBoundary>
  )
}

