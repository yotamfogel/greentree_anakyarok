export interface SchemaDefinition {
  title: string
  schema: {
    $schema: string
    title: string
    type: string
    required?: string[]
    properties: Record<string, any>
  }
}

export interface AvailableSchemas {
  [key: string]: SchemaDefinition
}

// Single source of truth for all available schemas
export const availableSchemas: AvailableSchemas = {
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
}
