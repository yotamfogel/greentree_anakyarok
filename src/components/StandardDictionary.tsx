import React, { useState, useEffect, useRef } from 'react'

// Import the available schemas from App.tsx
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
                      keys: { type: 'string', description: 'Keyboard combination', pattern: '^[A-Z]+\\+[A-Z]+$' }
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
              mimeType: { type: 'string', description: 'MIME type of the document', pattern: '^[-\\w.]+/[-\\w.]+$' },
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
  }
}

export function StandardDictionary() {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [selectedSchema, setSelectedSchema] = useState<string>('')
  const [isSchemaDropdownOpen, setIsSchemaDropdownOpen] = useState<boolean>(false)
  const [fields] = useState([
    { id: 1, name: 'שם השדה', description: 'תיאור השדה הראשון' },
    { id: 2, name: 'שדה נוסף', description: 'תיאור השדה השני' },
    { id: 3, name: 'שדה שלישי', description: 'תיאור השדה השלישי' },
    { id: 4, name: 'שדה רביעי', description: 'תיאור השדה הרביעי' },
    { id: 5, name: 'שדה חמישי', description: 'תיאור השדה החמישי' },
    { id: 6, name: 'שדה שישי', description: 'תיאור השדה השישי' },
    { id: 7, name: 'שדה שביעי', description: 'תיאור השדה השביעי' },
    { id: 8, name: 'שדה שמיני', description: 'תיאור השדה השמיני' },
    { id: 9, name: 'שדה תשיעי', description: 'תיאור השדה התשיעי' },
    { id: 10, name: 'שדה עשירי', description: 'תיאור השדה העשירי' }
  ])
  
  const containerRef = useRef<HTMLDivElement>(null)
  const selectedFieldRef = useRef<HTMLDivElement>(null)
  const schemaDropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (schemaDropdownRef.current && !schemaDropdownRef.current.contains(event.target as Node)) {
        setIsSchemaDropdownOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, fields.length - 1))
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
        setSelectedIndex(fields.length - 1)
        break
    }
  }

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [fields.length])

  useEffect(() => {
    if (selectedFieldRef.current) {
      selectedFieldRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [selectedIndex])

  return (
    <main className="app-main full-screen has-extractor">
      {/* Navbar with schema selector */}
      <header className="app-header floating" style={{ marginBottom: '20px' }}>
        <div className="brand">
          <img src="./images/logo.png" alt="העץ הירוק" style={{ height: '80px', width: '80px', objectFit: 'contain', marginRight: '8px', marginTop: '-12px', marginBottom: '-12px' }} />
        </div>
        <div className="header-actions">
          <div className="schema-group" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className="schema-selector" ref={schemaDropdownRef}>
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
        </div>
      </header>

      <section style={{ display: 'grid', placeItems: 'start center', width: '100%' }}>
        <div className="panel" style={{ width: 'min(100%, 960px)' }} dir="rtl">
          <div className="panel-title">מילון התקן</div>
          <div style={{ padding: '16px' }}>
            {selectedSchema ? (
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                backgroundColor: 'rgba(0, 120, 212, 0.1)', 
                borderRadius: '8px',
                border: '1px solid rgba(0, 120, 212, 0.3)',
                fontSize: '14px',
                color: 'var(--text)',
                fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
              }}>
                <strong>נבחר תקן:</strong> {availableSchemas[selectedSchema as keyof typeof availableSchemas]?.title}
              </div>
            ) : (
              <div style={{ 
                marginBottom: '16px', 
                padding: '12px', 
                backgroundColor: 'rgba(255, 193, 7, 0.1)', 
                borderRadius: '8px',
                border: '1px solid rgba(255, 193, 7, 0.3)',
                fontSize: '14px',
                color: 'var(--text)',
                fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
              }}>
                <strong>שים לב:</strong> בחר תקן מהרשימה למעלה כדי לצפות בשדות הספציפיים
              </div>
            )}
            
            <div 
              ref={containerRef}
              style={{ 
                maxHeight: '400px', 
                overflowY: 'auto',
                display: 'grid',
                gap: '8px',
                scrollbarWidth: 'thin',
                scrollbarColor: '#0078d4 #f0f0f0'
              }}
              className="custom-scrollbar"
            >
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  ref={index === selectedIndex ? selectedFieldRef : null}
                  style={{
                    padding: '12px 16px',
                    border: index === selectedIndex ? '2px solid #0078d4' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    backgroundColor: index === selectedIndex ? 'rgba(0, 120, 212, 0.1)' : 'var(--panel)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
                    boxShadow: index === selectedIndex ? '0 0 20px rgba(0, 120, 212, 0.6), 0 0 40px rgba(0, 120, 212, 0.3)' : 'none'
                  }}
                  onClick={() => setSelectedIndex(index)}
                >
                  <div style={{ 
                    fontWeight: 'bold', 
                    marginBottom: '4px',
                    color: index === selectedIndex ? '#0078d4' : 'var(--text)'
                  }}>
                    {field.name}
                  </div>
                  <div style={{ 
                    fontSize: '14px',
                    color: index === selectedIndex ? '#005a9e' : 'var(--muted)'
                  }}>
                    {field.description}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ 
              marginTop: '16px', 
              padding: '12px', 
              backgroundColor: 'rgba(255,255,255,0.04)', 
              borderRadius: '8px',
              fontSize: '14px',
              color: 'var(--muted)',
              fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
            }}>
              <strong>הוראות ניווט:</strong> השתמש במקשי החצים למעלה/למטה לניווט בין השדות, או לחץ על שדה לבחירה
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default StandardDictionary



