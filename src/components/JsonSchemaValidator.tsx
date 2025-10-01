import React, { useState, useMemo } from 'react'
import { useSagachData } from '../contexts/SagachDataContext'

interface ValidationResult {
  isValid: boolean
  errors: Array<{
    path: string
    message: string
    value?: any
    suggestion?: string
  }>
  warnings: Array<{
    path: string
    message: string
  }>
}

interface JsonSchemaValidatorProps {
  onBack?: () => void
}

export const JsonSchemaValidator: React.FC<JsonSchemaValidatorProps> = ({ onBack }) => {
  const { isLoading } = useSagachData()
  const [jsonInput, setJsonInput] = useState<string>('')
  const [selectedSchema, setSelectedSchema] = useState<string>('')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [isSchemaDropdownOpen, setIsSchemaDropdownOpen] = useState<boolean>(false)

  // Extract available schemas from the hardcoded data in App.tsx
  const availableSchemas = useMemo(() => ({
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
            properties: {
              latitude: { type: 'number', description: 'Detection latitude', minimum: -90, maximum: 90 },
              longitude: { type: 'number', description: 'Detection longitude', minimum: -180, maximum: 180 },
              address: { type: 'string', description: 'Approximate address of detection location' }
            }
          },
          cameraInfo: {
            type: 'object',
            description: 'Camera system that captured the image',
            required: ['cameraId', 'location'],
            properties: {
              cameraId: { type: 'string', description: 'Unique camera identifier', minLength: 1 },
              location: { type: 'string', description: 'Camera installation location', minLength: 1 },
              angle: { type: 'number', description: 'Camera angle in degrees', minimum: 0, maximum: 360 },
              height: { type: 'number', description: 'Camera height in meters', minimum: 0, maximum: 100 }
            }
          }
        }
      }
    },
    'user_management': {
      title: 'User Management System',
      schema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        title: 'UserManagement',
        type: 'object',
        required: ['userId', 'profile', 'account'],
        properties: {
          userId: { type: 'string', description: 'Unique identifier for the user', minLength: 1 },
          profile: {
            type: 'object',
            description: 'User profile information',
            required: ['firstName', 'lastName', 'email', 'gender', 'preferredLanguage'],
            properties: {
              firstName: { type: 'string', description: 'User first name', minLength: 1 },
              lastName: { type: 'string', description: 'User last name', minLength: 1 },
              email: { type: 'string', description: 'User email address', format: 'email' },
              phoneNumber: { type: 'string', description: 'User phone number', pattern: '^\\+[1-9]\\d{1,14}$' },
              dateOfBirth: { type: 'string', description: 'User date of birth', format: 'date' },
              gender: {
                type: 'string',
                description: 'User gender identity',
                enum: ['male', 'female', 'non-binary', 'prefer-not-to-say', 'other']
              },
              preferredLanguage: {
                type: 'string',
                description: 'User preferred language for communication',
                enum: ['hebrew', 'english', 'arabic', 'russian', 'french', 'spanish']
              },
              nationality: { type: 'string', description: 'User nationality', minLength: 1 },
              timezone: {
                type: 'string',
                description: 'User preferred timezone',
                enum: ['Asia/Jerusalem', 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney']
              }
            }
          },
          account: {
            type: 'object',
            description: 'User account settings and status',
            required: ['username', 'status', 'role', 'registrationDate'],
            properties: {
              username: { type: 'string', description: 'Unique username', pattern: '^[a-zA-Z0-9_]{3,20}$' },
              status: {
                type: 'string',
                description: 'Current account status',
                enum: ['active', 'inactive', 'suspended', 'pending_verification', 'blocked']
              },
              role: {
                type: 'string',
                description: 'User role in the system',
                enum: ['admin', 'moderator', 'user', 'premium_user', 'guest']
              },
              registrationDate: { type: 'string', description: 'Account creation date', format: 'date-time' },
              lastLogin: { type: 'string', description: 'Last login timestamp', format: 'date-time' },
              emailVerified: { type: 'boolean', description: 'Whether email address is verified' },
              twoFactorEnabled: { type: 'boolean', description: 'Whether two-factor authentication is enabled' },
              subscriptionType: {
                type: 'string',
                description: 'User subscription plan',
                enum: ['free', 'basic', 'premium', 'enterprise']
              },
              subscriptionStatus: {
                type: 'string',
                description: 'Current subscription status',
                enum: ['trial', 'active', 'expired', 'cancelled', 'past_due']
              }
            }
          },
          preferences: {
            type: 'object',
            description: 'User preferences and settings',
            properties: {
              theme: {
                type: 'string',
                description: 'Preferred UI theme',
                enum: ['light', 'dark', 'auto', 'high_contrast']
              },
              notificationSettings: {
                type: 'object',
                description: 'Notification preferences',
                properties: {
                  emailNotifications: { type: 'boolean', description: 'Receive email notifications' },
                  pushNotifications: { type: 'boolean', description: 'Receive push notifications' },
                  smsNotifications: { type: 'boolean', description: 'Receive SMS notifications' },
                  marketingEmails: { type: 'boolean', description: 'Receive marketing emails' },
                  notificationFrequency: {
                    type: 'string',
                    description: 'How often to receive notifications',
                    enum: ['real-time', 'daily_digest', 'weekly_summary', 'never']
                  }
                }
              },
              privacySettings: {
                type: 'object',
                description: 'Privacy and data sharing preferences',
                properties: {
                  profileVisibility: {
                    type: 'string',
                    description: 'Who can see user profile',
                    enum: ['public', 'friends_only', 'private']
                  },
                  dataSharing: {
                    type: 'string',
                    description: 'Data sharing preferences',
                    enum: ['share_all', 'share_necessary', 'share_none']
                  },
                  cookieConsent: {
                    type: 'string',
                    description: 'Cookie usage consent',
                    enum: ['all_cookies', 'essential_only', 'no_cookies']
                  }
                }
              },
              languageAndRegion: {
                type: 'object',
                description: 'Language and regional preferences',
                properties: {
                  displayLanguage: {
                    type: 'string',
                    description: 'Language for UI display',
                    enum: ['he', 'en', 'ar', 'ru', 'fr', 'es']
                  },
                  dateFormat: {
                    type: 'string',
                    description: 'Preferred date format',
                    enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']
                  },
                  timeFormat: {
                    type: 'string',
                    description: 'Preferred time format',
                    enum: ['12h', '24h']
                  },
                  currency: {
                    type: 'string',
                    description: 'Preferred currency',
                    enum: ['ILS', 'USD', 'EUR', 'GBP', 'JPY']
                  }
                }
              }
            }
          },
          security: {
            type: 'object',
            description: 'Security-related information',
            properties: {
              passwordLastChanged: { type: 'string', description: 'When password was last changed', format: 'date-time' },
              failedLoginAttempts: { type: 'integer', description: 'Number of failed login attempts', minimum: 0 },
              accountLocked: { type: 'boolean', description: 'Whether account is currently locked' },
              securityQuestions: {
                type: 'array',
                description: 'Security questions for account recovery',
                items: {
                  type: 'object',
                  required: ['question', 'answer'],
                  properties: {
                    question: {
                      type: 'string',
                      description: 'Security question',
                      enum: [
                        'What was your first pet\'s name?',
                        'What is your mother\'s maiden name?',
                        'What was the name of your elementary school?',
                        'What is your favorite childhood memory?',
                        'What city were you born in?'
                      ]
                    },
                    answer: { type: 'string', description: 'Answer to security question', minLength: 1 }
                  }
                }
              },
              loginDevices: {
                type: 'array',
                description: 'Authorized devices for login',
                items: {
                  type: 'object',
                  required: ['deviceId', 'deviceType', 'lastAccess'],
                  properties: {
                    deviceId: { type: 'string', description: 'Unique device identifier', minLength: 1 },
                    deviceType: {
                      type: 'string',
                      description: 'Type of device',
                      enum: ['desktop', 'laptop', 'tablet', 'mobile', 'smart_tv', 'gaming_console']
                    },
                    lastAccess: { type: 'string', description: 'Last access timestamp', format: 'date-time' },
                    trustedDevice: { type: 'boolean', description: 'Whether this is a trusted device' }
                  }
                }
              }
            }
          },
          activity: {
            type: 'object',
            description: 'User activity and engagement data',
            properties: {
              totalLogins: { type: 'integer', description: 'Total number of logins', minimum: 0 },
              lastActivityDate: { type: 'string', description: 'Date of last activity', format: 'date' },
              sessionDuration: { type: 'integer', description: 'Average session duration in minutes', minimum: 0 },
              featuresUsed: {
                type: 'array',
                description: 'List of features used by the user',
                items: {
                  type: 'string',
                  enum: [
                    'dashboard',
                    'profile_management',
                    'data_export',
                    'reports',
                    'settings',
                    'support',
                    'notifications',
                    'search',
                    'file_upload',
                    'data_analysis'
                  ]
                }
              },
              engagementLevel: {
                type: 'string',
                description: 'User engagement level',
                enum: ['very_low', 'low', 'medium', 'high', 'very_high']
              }
            }
          }
        }
      }
    }
  }), [])

  // Enhanced JSON schema validator with detailed error reporting
  const validateJson = (jsonData: any, schema: any): ValidationResult => {
    const errors: Array<{path: string, message: string, value?: any, suggestion?: string}> = []
    const warnings: Array<{path: string, message: string}> = []

    const validateObject = (data: any, schema: any, currentPath: string = '', parentContext?: string) => {
      // Check if this is an object/array validation in the wrong context
      if (parentContext && schema.type) {
        if (schema.type === 'object' && typeof data !== 'object') {
          errors.push({
            path: currentPath,
            message: `שדה "${currentPath}" צריך להיות אובייקט אבל קיבלנו ${typeof data}`,
            value: data,
            suggestion: `שדה "${currentPath}" צריך להיות אובייקט עם מאפיינים, לא ${typeof data}`
          })
          return
        }
        if (schema.type === 'array' && !Array.isArray(data)) {
          errors.push({
            path: currentPath,
            message: `שדה "${currentPath}" צריך להיות מערך אבל קיבלנו ${typeof data}`,
            value: data,
            suggestion: `שדה "${currentPath}" צריך להיות מערך של פריטים, לא ${typeof data}`
          })
          return
        }
      }

      // Check required fields
      if (schema.required && Array.isArray(schema.required)) {
        for (const requiredField of schema.required) {
          if (!(requiredField in data)) {
            const fieldPath = currentPath ? `${currentPath}.${requiredField}` : requiredField
            const parentInfo = parentContext ? ` תחת "${parentContext}"` : ''
            errors.push({
              path: fieldPath,
              message: `שדה חובה חסר: ${requiredField}${parentInfo}`,
              value: data[requiredField],
              suggestion: `הוסף את השדה "${requiredField}" עם ערך מתאים${parentInfo}`
            })
          }
        }
      }

      // Check properties
      if (schema.properties && typeof schema.properties === 'object') {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          const fieldPath = currentPath ? `${currentPath}.${key}` : key
          const value = data[key]

          if (value !== undefined) {
            // Type validation with context
            if (propSchema && typeof propSchema === 'object' && 'type' in propSchema) {
              const expectedType = (propSchema as any).type
              const actualType = Array.isArray(value) ? 'array' : typeof value

              if (expectedType !== actualType) {
                const typeNames: {[key: string]: string} = {
                  'string': 'מחרוזת',
                  'number': 'מספר',
                  'integer': 'מספר שלם',
                  'boolean': 'בוליאני',
                  'object': 'אובייקט',
                  'array': 'מערך'
                }

                errors.push({
                  path: fieldPath,
                  message: `סוג שגוי בשדה "${key}": מצופה ${typeNames[expectedType] || expectedType}, התקבל ${typeNames[actualType] || actualType}`,
                  value: value,
                  suggestion: `שנה את "${fieldPath}" ל${typeNames[expectedType] || expectedType}`
                })
              }
            }

            // String validations
            if (propSchema && typeof propSchema === 'object' && 'minLength' in propSchema && typeof value === 'string') {
              if (value.length < (propSchema as any).minLength) {
                errors.push({
                  path: fieldPath,
                  message: `אורך מחרוזת קצר מדי בשדה "${key}": מינימום ${(propSchema as any).minLength} תווים, התקבל ${value.length}`,
                  value: value,
                  suggestion: `הוסף עוד ${(propSchema as any).minLength - value.length} תווים לשדה "${key}"`
                })
              }
            }

            if (propSchema && typeof propSchema === 'object' && 'pattern' in propSchema && typeof value === 'string') {
              const regex = new RegExp((propSchema as any).pattern)
              if (!regex.test(value)) {
                errors.push({
                  path: fieldPath,
                  message: `פורמט לא תקין בשדה "${key}": לא תואם לתבנית ${(propSchema as any).pattern}`,
                  value: value,
                  suggestion: `שנה את "${key}" כך שיתאים לתבנית ${(propSchema as any).pattern}`
                })
              }
            }

            // Number validations
            if (propSchema && typeof propSchema === 'object' && 'minimum' in propSchema && typeof value === 'number') {
              if (value < (propSchema as any).minimum) {
                errors.push({
                  path: fieldPath,
                  message: `ערך נמוך מדי בשדה "${key}": מינימום ${(propSchema as any).minimum}, התקבל ${value}`,
                  value: value,
                  suggestion: `הגדל את "${key}" ל${(propSchema as any).minimum} או יותר`
                })
              }
            }

            if (propSchema && typeof propSchema === 'object' && 'maximum' in propSchema && typeof value === 'number') {
              if (value > (propSchema as any).maximum) {
                errors.push({
                  path: fieldPath,
                  message: `ערך גבוה מדי בשדה "${key}": מקסימום ${(propSchema as any).maximum}, התקבל ${value}`,
                  value: value,
                  suggestion: `הקטן את "${key}" ל${(propSchema as any).maximum} או פחות`
                })
              }
            }

            // Enum validations
            if (propSchema && typeof propSchema === 'object' && 'enum' in propSchema && Array.isArray((propSchema as any).enum)) {
              if (!(propSchema as any).enum.includes(value)) {
                errors.push({
                  path: fieldPath,
                  message: `ערך לא חוקי בשדה "${key}": "${value}" לא נמצא ברשימת הערכים המותרים`,
                  value: value,
                  suggestion: `בחר ערך מתוך: ${(propSchema as any).enum.join(', ')} עבור "${key}"`
                })
              }
            }

            // Recursively validate nested objects and arrays
            if (propSchema && typeof propSchema === 'object' && 'properties' in propSchema && typeof value === 'object' && value !== null) {
              validateObject(value, propSchema, fieldPath, key)
            }

            if (propSchema && typeof propSchema === 'object' && 'items' in propSchema && Array.isArray(value)) {
              value.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                  validateObject(item, (propSchema as any).items, `${fieldPath}[${index}]`, `${key}[${index}]`)
                }
              })
            }
          } else {
            // Check if this field is in the wrong place
            if (schema.properties && !(key in schema.properties)) {
              const availableFields = Object.keys(schema.properties).join(', ')
              errors.push({
                path: fieldPath,
                message: `שדה לא צפוי "${key}" מחוץ למבנה התקין`,
                value: value,
                suggestion: `הסר את "${key}" או הזז אותו למקום הנכון. שדות זמינים: ${availableFields}`
              })
            }
          }
        }

        // Check for extra fields that shouldn't be there
        for (const key of Object.keys(data)) {
          if (!(key in schema.properties)) {
            const fieldPath = currentPath ? `${currentPath}.${key}` : key
            const availableFields = Object.keys(schema.properties).join(', ')
            errors.push({
              path: fieldPath,
              message: `שדה לא צפוי "${key}" - אינו מוגדר בתקן`,
              value: data[key],
              suggestion: `הסר את "${key}" או הוסף אותו לתקן. שדות זמינים: ${availableFields}`
            })
          }
        }
      }
    }

    try {
      validateObject(jsonData, schema)
    } catch (error) {
      errors.push({
        path: 'root',
        message: `שגיאה קריטית במהלך בדיקת התקינות: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`,
        value: jsonData,
        suggestion: 'בדוק שה-JSON תקין מבחינה תחבירית'
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  }

  const handleValidate = () => {
    if (!selectedSchema || !jsonInput.trim()) {
      setValidationResult(null)
      return
    }

    setIsValidating(true)

    try {
      const jsonData = JSON.parse(jsonInput)
      const schema = availableSchemas[selectedSchema as keyof typeof availableSchemas]?.schema

      if (!schema) {
        setValidationResult({
          isValid: false,
          errors: [{ path: 'schema', message: 'סכמה לא נמצאה' }],
          warnings: []
        })
        return
      }

      const result = validateJson(jsonData, schema)
      setValidationResult(result)
    } catch (error) {
      setValidationResult({
        isValid: false,
        errors: [{
          path: 'json',
          message: `JSON לא תקין: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`
        }],
        warnings: []
      })
    } finally {
      setIsValidating(false)
    }
  }

  const handleClear = () => {
    setJsonInput('')
    setSelectedSchema('')
    setValidationResult(null)
  }

  const getValidationIcon = (isValid: boolean) => {
    return isValid ? '✅' : '❌'
  }

  const getValidationColor = (isValid: boolean) => {
    return isValid ? '#4caf50' : '#f44336'
  }

  return (
    <div style={{
      width: '100vw',
      minHeight: '100vh',
      height: '100vh',
      overflow: 'auto',
      background: 'transparent',
      color: 'var(--text)',
      fontFamily: 'Segoe UI, sans-serif',
      padding: '40px 60px 80px 60px',
      position: 'fixed',
      top: '80px',
      left: 0,
      direction: 'rtl',
      scrollbarWidth: 'thin',
      scrollbarColor: 'var(--accent) var(--panel)',
      boxSizing: 'border-box',
      display: 'flex',
      flexDirection: 'column',
      gap: '32px'
    }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '20px',
          position: 'relative',
          width: '100%'
        }}>
          {/* Back Button - Far Left */}
          {onBack && (
            <button
              onClick={onBack}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                color: 'var(--text)',
                padding: '12px 20px',
                cursor: 'pointer',
                fontSize: '14px',
                fontFamily: 'Segoe UI, sans-serif',
                position: 'absolute',
                left: 0,
                zIndex: 1
              }}
            >
              ← חזור
            </button>
          )}
          
          {/* Centered Title */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%'
          }}>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: 'var(--accent)',
              margin: '0 0 8px 0',
              textAlign: 'center'
            }}>
              בודק תקינות JSON
            </h1>
            <p style={{
              fontSize: '16px',
              color: 'var(--muted)',
              margin: 0,
              textAlign: 'center'
            }}>
              בדוק אם הדג"ח שלך עובר את התקן של הענק
            </p>
          </div>
        </div>

        {/* Controls */}
        <div style={{
          display: 'flex',
          gap: '24px',
          alignItems: 'end',
          justifyContent: 'flex-start',
          width: '100%',
          margin: '0'
        }}>
          {/* Schema Selector */}
          <div style={{ position: 'relative' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: '600',
              marginBottom: '8px',
              color: 'var(--text)'
            }}>
            </label>
            <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()} data-dropdown-container>
              <button
                onClick={() => setIsSchemaDropdownOpen(!isSchemaDropdownOpen)}
                style={{
                  appearance: 'none' as const,
                  border: '1px solid rgba(255,255,255,0.14)',
                  background: 'transparent',
                  color: 'var(--text)',
                  borderRadius: '12px',
                  padding: '8px 14px',
                  cursor: 'pointer',
                  transition: 'transform 120ms ease',
                  fontSize: '14px',
                  direction: 'rtl' as const,
                  outline: 'none',
                  fontFamily: 'Segoe UI, sans-serif',
                  width: '100%',
                  minWidth: '500px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  textAlign: 'center' as const,
                  alignSelf: 'center',
                  boxShadow: 'none',
                  justifySelf: 'center'

                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(-1px)'
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.transform = 'translateY(0px)'
                }}
              >
                <span>{selectedSchema ? availableSchemas[selectedSchema as keyof typeof availableSchemas]?.title : 'בחר תקן...'}</span>
                <span style={{ marginLeft: '8px' }}>▼</span>
              </button>
              {isSchemaDropdownOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'var(--panel)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '12px',
                  marginTop: '4px',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                  backdropFilter: 'blur(8px)'
                }}>
                  <div
                    onClick={() => {
                      setSelectedSchema('')
                      setIsSchemaDropdownOpen(false)
                    }}
                    style={{
                      padding: '8px 12px',
                      cursor: 'pointer',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      transition: 'background 0.2s ease',
                      fontSize: '14px',
                      color: '#ffffff',
                      textAlign: 'center',
                      direction: 'rtl',
                      justifyContent: 'right',
                      display: 'absolute'
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLDivElement).style.background = 'transparent'
                    }}
                  >
                    בחר תקן...
                  </div>
                  {Object.entries(availableSchemas).map(([key, schema]) => (
                    <div
                      key={key}
                      onClick={() => {
                        setSelectedSchema(key)
                        setIsSchemaDropdownOpen(false)
                      }}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                        transition: 'background 0.2s ease',
                        fontSize: '14px',
                        color: '#ffffff',
                        textAlign: 'center',
                        direction: 'rtl',
                        background: selectedSchema === key ? 'rgba(124,192,255,0.15)' : 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedSchema !== key) {
                          (e.target as HTMLDivElement).style.background = 'rgba(255,255,255,0.08)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedSchema !== key) {
                          (e.target as HTMLDivElement).style.background = 'transparent'
                        }
                      }}
                    >
                      {schema.title}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Validate Button */}
          <button
            onClick={handleValidate}
            disabled={!selectedSchema || !jsonInput.trim() || isValidating}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              color: 'var(--text)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'Segoe UI, sans-serif',
              width: '120px',
              height: '44.89px',
              textAlign: 'center'
            }}
          >
            {isValidating ? 'בודק...' : 'בדוק תקינות'}
          </button>

          {/* Clear Button */}
          <button
            onClick={handleClear}
            style={{
              padding: '12px 24px',
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              color: 'var(--text)',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'Segoe UI, sans-serif',
              width: '120px',
              height: '44.89px',
              textAlign: 'center'
            }}
          >
            נקה הכל
          </button>
        </div>

        {/* JSON Input */}
        <div style={{ 
          width: '100%',
          margin: '0'
        }}>
          <label style={{
            display: 'block',
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '8px',
            color: 'var(--text)'
          }}>
            הדבק JSON כאן
          </label>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder="הדבק כאן את קובץ ה-JSON שברצונך לבדוק..."
            style={{
              width: '100%',
              minHeight: '400px',
              padding: '16px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '12px',
              color: 'var(--text)',
              fontSize: '14px',
              fontFamily: 'Monaco, Menlo, "DejaVu Sans Mono", monospace',
              outline: 'none',
              resize: 'vertical',
              lineHeight: '1.5',
              height: '700px'
            }}
          />
        </div>

        {/* Validation Results */}
          {validationResult && (
            <div style={{
              background: 'rgba(255,255,255,0.08)',
              border: `1px solid ${validationResult.isValid ? 'rgba(76,175,80,0.4)' : 'rgba(244,67,54,0.4)'}`,
              borderRadius: '12px',
              width: '100%',
              margin: '32px 0 0 0',
              padding: '32px'
            }}>
            {/* Result Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.1)'
            }}>
              <span style={{
                fontSize: '24px',
                color: getValidationColor(validationResult.isValid)
              }}>
                {getValidationIcon(validationResult.isValid)}
              </span>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: 'var(--text)',
                margin: 0
              }}>
                תוצאת בדיקת תקינות
              </h3>
            </div>

            {/* Errors */}
            {validationResult.errors.length > 0 && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#f44336',
                  margin: '0 0 12px 0'
                }}>
                  שגיאות ({validationResult.errors.length})
                </h4>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '300px',
                  overflowY: 'auto'
                }}>
                  {validationResult.errors.map((error, index) => (
                    <div key={index} style={{
                      background: 'rgba(244,67,54,0.1)',
                      border: '1px solid rgba(244,67,54,0.3)',
                      borderRadius: '8px',
                      padding: '12px',
                      fontSize: '14px'
                    }}>
                      <div style={{
                        fontWeight: '600',
                        color: '#f44336',
                        marginBottom: '4px'
                      }}>
                        {error.path}
                      </div>
                      <div style={{
                        color: 'var(--text)',
                        marginBottom: '4px'
                      }}>
                        {error.message}
                      </div>
                      {error.suggestion && (
                        <div style={{
                          fontSize: '13px',
                          color: '#4caf50',
                          background: 'rgba(76, 175, 80, 0.1)',
                          border: '1px solid rgba(76, 175, 80, 0.3)',
                          borderRadius: '4px',
                          padding: '6px 8px',
                          marginBottom: '6px',
                          fontFamily: 'Segoe UI, sans-serif'
                        }}>
                          💡 {error.suggestion}
                        </div>
                      )}
                      {error.value !== undefined && (
                        <div style={{
                          fontFamily: 'Monaco, monospace',
                          fontSize: '12px',
                          color: 'var(--muted)',
                          background: 'rgba(0,0,0,0.3)',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          marginTop: '4px',
                          wordBreak: 'break-all'
                        }}>
                          ערך: {JSON.stringify(error.value)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Success Message */}
            {validationResult.isValid && (
              <div style={{
                background: 'rgba(76,175,80,0.1)',
                border: '1px solid rgba(76,175,80,0.3)',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#4caf50',
                  marginBottom: '8px'
                }}>
                  ✅ JSON תקין!
                </div>
                <div style={{
                  color: 'var(--text)',
                  fontSize: '14px'
                }}>
                  כל השדות הנדרשים קיימים והערכים תקינים לפי התקן שנבחר.
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '12px',
          width: '100%',
          margin: '32px 0 0 0',
          padding: '32px'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: 'var(--accent)',
            margin: '0 0 12px 0'
          }}>
            הוראות שימוש
          </h4>
          <div style={{
            fontSize: '14px',
            color: 'var(--text)',
            lineHeight: '1.6'
          }}>
            <p style={{ margin: '0 0 8px 0' }}>
              1. בחר תקן (סכמה) מהרשימה למעלה
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              2. הדבק את קובץ ה-JSON שלך בתיבת הטקסט
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              3. לחץ על "בדוק תקינות" כדי לבדוק את הקובץ
            </p>
            <p style={{ margin: '0 0 8px 0' }}>
              4. אם יש שגיאות, הן יוצגו עם פירוט מדויק של הבעיה ומיקומה
            </p>
            <p style={{ margin: '0' }}>
              5. אם הכל תקין, תקבל אישור שה-JSON עובר את הבדיקה בהצלחה
            </p>
          </div>
        </div>

      {/* Custom Scrollbar Styling */}
      <style>
        {`
          /* Webkit scrollbar styling */
          ::-webkit-scrollbar {
            width: 8px;
          }

          ::-webkit-scrollbar-track {
            background: #2d3748;
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb {
            background: #7cc0ff;
            border-radius: 4px;
          }

          ::-webkit-scrollbar-thumb:hover {
            background: #5da3e6;
          }
        `}
      </style>
    </div>
  )
}
