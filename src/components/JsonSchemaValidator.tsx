import React, { useState, useMemo } from 'react'
import { useSagachData } from '../contexts/SagachDataContext'
import { availableSchemas } from '../config/schemas'

// Hook to get SagachData with fallback for non-authenticated users
const useOptionalSagachData = () => {
  try {
    return useSagachData()
  } catch {
    // Return default values when not authenticated
    return { isLoading: false }
  }
}

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
  const { isLoading } = useOptionalSagachData()
  const [jsonInput, setJsonInput] = useState<string>('')
  const [selectedSchema, setSelectedSchema] = useState<string>('')
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null)
  const [validationSnapshot, setValidationSnapshot] = useState<string>('')
  const [isValidating, setIsValidating] = useState<boolean>(false)
  const [isSchemaDropdownOpen, setIsSchemaDropdownOpen] = useState<boolean>(false)

  // Clear validation results when JSON input is cleared
  const handleJsonInputChange = (value: string) => {
    setJsonInput(value)
    // If input is cleared, also clear validation results
    if (!value.trim()) {
      setValidationResult(null)
      setValidationSnapshot('')
    }
  }


  // Build a map of all field names and their correct paths in the schema
  const buildFieldMap = (schema: any, currentPath: string = ''): Map<string, string[]> => {
    const fieldMap = new Map<string, string[]>()

    const processSchema = (obj: any, path: string) => {
      if (obj && typeof obj === 'object' && obj.properties) {
        for (const [key, propSchema] of Object.entries(obj.properties)) {
          const fullPath = path ? `${path}.${key}` : key

          if (!fieldMap.has(key)) {
            fieldMap.set(key, [])
          }
          fieldMap.get(key)!.push(fullPath)

          // Recursively process nested objects and arrays
          if (propSchema && typeof propSchema === 'object' && 'properties' in propSchema) {
            processSchema(propSchema, fullPath)
          }
          if (propSchema && typeof propSchema === 'object' && 'items' in propSchema && propSchema.items && typeof propSchema.items === 'object' && 'properties' in propSchema.items) {
            processSchema(propSchema.items, `${fullPath}[*]`)
          }
        }
      }
    }

    processSchema(schema, currentPath)
    return fieldMap
  }

  // Enhanced JSON schema validator with detailed error reporting
  const validateJson = (jsonData: any, schema: any): ValidationResult => {
    const errors: Array<{path: string, message: string, value?: any, suggestion?: string}> = []
    const warnings: Array<{path: string, message: string}> = []

    // Build field map for hierarchy checking
    const fieldMap = buildFieldMap(schema)

    const validateObject = (data: any, schema: any, currentPath: string = '', parentContext?: string, fieldMap?: Map<string, string[]>) => {
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
              validateObject(value, propSchema, fieldPath, key, fieldMap)
            }

            if (propSchema && typeof propSchema === 'object' && 'items' in propSchema && Array.isArray(value)) {
              value.forEach((item, index) => {
                if (typeof item === 'object' && item !== null) {
                  validateObject(item, (propSchema as any).items, `${fieldPath}[${index}]`, `${key}[${index}]`, fieldMap)
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

            // Check if this field exists in other parts of the schema
            const correctPaths = fieldMap?.get(key)
            let suggestion = `הסר את "${key}" או הוסף אותו לתקן. שדות זמינים: ${availableFields}`

            if (correctPaths && correctPaths.length > 0) {
              // Filter out the current path to avoid suggesting the same location
              const otherPaths = correctPaths.filter(path => path !== fieldPath)
              if (otherPaths.length > 0) {
                const correctPath = otherPaths[0] // Take the first correct path as suggestion
                const hierarchyParts = correctPath.split('.')
                const fieldName = hierarchyParts[hierarchyParts.length - 1]
                const parentObject = hierarchyParts.slice(0, -1).join(' → ')

                suggestion = `שדה "${key}" נמצא במקום שגוי. השדה צריך להיות תחת "${parentObject}" ולא תחת "${currentPath || 'השורש'}". השדה צריך להיות בנתיב: ${correctPath}`
              }
            }

            errors.push({
              path: fieldPath,
              message: `שדה לא צפוי "${key}" - אינו מוגדר בתקן`,
              value: data[key],
              suggestion: suggestion
            })
          }
        }
      }
    }

    try {
      validateObject(jsonData, schema, '', undefined, fieldMap)
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
      setValidationSnapshot('')
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
        setValidationSnapshot('')
        return
      }

      const result = validateJson(jsonData, schema)
      setValidationResult(result)
      // Save the current JSON input as a snapshot for display
      setValidationSnapshot(jsonInput)
    } catch (error) {
      setValidationResult({
        isValid: false,
        errors: [{
          path: 'json',
          message: `JSON לא תקין: ${error instanceof Error ? error.message : 'שגיאה לא ידועה'}`
        }],
        warnings: []
      })
      setValidationSnapshot('')
    } finally {
      setIsValidating(false)
    }
  }

  const handleClear = () => {
    setJsonInput('')
    setSelectedSchema('')
    setValidationResult(null)
    setValidationSnapshot('')
  }

  const getValidationIcon = (isValid: boolean) => {
    return isValid ? '✅' : '❌'
  }

  const getValidationColor = (isValid: boolean) => {
    return isValid ? '#4caf50' : '#f44336'
  }

  // Function to render JSON with color-coded fields using standard formatting
  const renderJsonWithHighlights = (jsonData: any, errors: any[], schema: any, path: string = ''): any => {
    try {
      // Recursively add missing fields to nested objects
      const addMissingFields = (data: any, currentSchema: any, currentPath: string = ''): any => {
        if (typeof data !== 'object' || data === null || Array.isArray(data)) {
          return data
        }
        
        const result = { ...data }
        const requiredFields = currentSchema?.required || []
        const schemaProperties = currentSchema?.properties || {}
        
        // Add missing required fields
        requiredFields.forEach((field: string) => {
          if (!(field in result)) {
            result[field] = '[שדה חסר]'
          } else if (typeof result[field] === 'object' && result[field] !== null && !Array.isArray(result[field])) {
            // Recursively process nested objects
            const fieldPath = currentPath ? `${currentPath}.${field}` : field
            const fieldSchema = schemaProperties[field]
            if (fieldSchema) {
              result[field] = addMissingFields(result[field], fieldSchema, fieldPath)
            }
          }
        })
        
        return result
      }
      
      // Add missing fields recursively
      const dataWithMissingFields = addMissingFields(jsonData, schema, path)
      
      // Format the enhanced data
      const enhancedFormattedJson = JSON.stringify(dataWithMissingFields, null, 2)
      
      return enhancedFormattedJson
    } catch (error) {
      return JSON.stringify(jsonData, null, 2)
    }
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
              fontSize: '40px',
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
              בדוק אם הדג"ח שלך עומד בתקן הענק
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
              fontWeight: '400',
              marginBottom: '8px',
              color: 'var(--text)'
            }}>
              בחר תקן, הכנס דג"ח JSON ולחץ על כפתור "בדוק תקינות" בשביל לבדוק האם הדג"ח שלך עומד בסכמה
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
                      setValidationResult(null)
                      setValidationSnapshot('')
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
                        setValidationResult(null)
                        setValidationSnapshot('')
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
              background: (!selectedSchema || !jsonInput.trim() || isValidating) 
                ? 'rgba(255,255,255,0.05)' 
                : 'linear-gradient(135deg, #4CAF50, #45a049)',
              border: (!selectedSchema || !jsonInput.trim() || isValidating)
                ? '1px solid rgba(255,255,255,0.1)'
                : '1px solid #4CAF50',
              borderRadius: '12px',
              color: (!selectedSchema || !jsonInput.trim() || isValidating)
                ? 'rgba(255,255,255,0.4)'
                : 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: (!selectedSchema || !jsonInput.trim() || isValidating) ? 'not-allowed' : 'pointer',
              fontFamily: 'Segoe UI, sans-serif',
              width: '160px',
              height: '44.89px',
              marginRight: 'auto',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              opacity: (!selectedSchema || !jsonInput.trim() || isValidating) ? 0.6 : 1
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
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            נקה הכל
          </button>
        </div>

        {/* JSON Input, Validation Results, and Errors Container */}
        <div style={{
          display: 'flex',
          gap: '24px',
          width: '100%',
          paddingBottom: '20px',
          margin: '0'
        }}>
          {/* JSON Input */}
          <div style={{ 
            width: '30%',
            margin: '0'
          }}>
            
            <textarea
              value={jsonInput}
              onChange={(e) => handleJsonInputChange(e.target.value)}
              onPaste={(e) => {
                const pastedText = e.clipboardData.getData('text');
                try {
                  // First try to parse as-is
                  const parsed = JSON.parse(pastedText);
                  const formatted = JSON.stringify(parsed, null, 2);
                  e.preventDefault();
                  handleJsonInputChange(formatted);
                } catch (error) {
                  // Try to fix common JSON issues and parse again
                  try {
                    let fixedJson = pastedText
                      // Remove leading/trailing commas
                      .replace(/,\s*}/g, '}')
                      .replace(/,\s*]/g, ']')
                      // Fix missing opening braces/brackets
                      .replace(/^,\s*{/g, '{')
                      .replace(/^,\s*\[/g, '[')
                      // Fix quotes around numbers
                      .replace(/"(\d+(?:\.\d+)?)"/g, '$1')
                      // Fix malformed key-value pairs
                      .replace(/}\s*:\s*"/g, ',"')
                      .replace(/}\s*:\s*{/g, ',{')
                      // Clean up multiple commas
                      .replace(/,,+/g, ',')
                      // Remove comma at start of line
                      .replace(/^\s*,/gm, '')
                      // Ensure proper structure
                      .trim();
                    
                    // If it doesn't start with { or [, try to wrap it
                    if (!fixedJson.startsWith('{') && !fixedJson.startsWith('[')) {
                      fixedJson = '{' + fixedJson + '}';
                    }
                    
                    const parsed = JSON.parse(fixedJson);
                    const formatted = JSON.stringify(parsed, null, 2);
                    e.preventDefault();
                    handleJsonInputChange(formatted);
                  } catch (secondError) {
                    // If still can't parse, let the default paste behavior happen
                  }
                }
              }}
              onKeyDown={(e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                  e.preventDefault();
                  try {
                    const parsed = JSON.parse(jsonInput);
                    const formatted = JSON.stringify(parsed, null, 2);
                    handleJsonInputChange(formatted);
                  } catch (error) {
                    // JSON is not valid, don't format
                  }
                }
              }}
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
                resize: 'none',
                lineHeight: '1.5',
                height: '800px',
                direction: 'ltr',
                textAlign: 'left',
              }}
            />
          </div>

          {/* Validation Results */}
          <div style={{ width: '40%' }}>
            {validationResult ? (
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                border: `1px solid ${validationResult.isValid ? 'rgba(76,175,80,0.4)' : 'rgba(244,67,54,0.4)'}`,
                borderRadius: '12px',
                width: '100%',
                margin: '0',
                padding: '32px',
                height: '800px',
                overflow: 'auto',
                direction: 'ltr',
                textAlign: 'left',
                willChange: 'transform',
                contain: 'layout style paint',
                transform: 'translateZ(0)',
                isolation: 'isolate',
                backfaceVisibility: 'hidden'
              }}>
            {/* Result Header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '16px',
              paddingBottom: '12px',
              borderBottom: '1px solid rgba(255,255,255,0.1)',
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
                margin: 0,
              }}>
                תוצאת בדיקת תקינות
              </h3>
            </div>

            {/* JSON with Color-coded Fields */}
            {validationResult && jsonInput.trim() && (
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: 'var(--text)',
                  margin: '0 0 12px 0',
                }}>
                  
                </h4>
                <div style={{
                  background: 'rgba(0,0,0,0.3)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  padding: '16px',
                  fontFamily: 'Monaco, Menlo, "DejaVu Sans Mono", monospace',
                  fontSize: '13px',
                  lineHeight: '1.6',
                  height: '600px',
                  overflowY: 'auto',
                  willChange: 'transform',
                  contain: 'layout style paint',
                  transform: 'translateZ(0)',
                  isolation: 'isolate',
                  backfaceVisibility: 'hidden'
                }}>
                  <pre key={`json-display-${validationSnapshot ? 'snapshot' : 'empty'}`} style={{
                    margin: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'Monaco, Menlo, "DejaVu Sans Mono", monospace',
                    fontSize: '13px',
                    lineHeight: '1.6'
                  }}>
                    {validationResult ? (() => {
                      try {
                        const jsonData = JSON.parse(validationSnapshot)
                        const schema = availableSchemas[selectedSchema as keyof typeof availableSchemas]?.schema
                        const formattedJson = renderJsonWithHighlights(jsonData, validationResult?.errors || [], schema)
                        
                        // Build a map of line numbers to their actual JSON paths
                        const buildLineToPathMap = (jsonData: any, lines: string[]) => {
                          const lineToPathMap = new Map<number, string>()
                          let currentPath: string[] = []
                          let braceStack: string[] = []
                          let bracketStack: string[] = []
                          
                          lines.forEach((line, index) => {
                            const trimmedLine = line.trim()
                            
                            // Track opening braces/brackets
                            if (trimmedLine.endsWith('{')) {
                              braceStack.push('{')
                            }
                            if (trimmedLine.endsWith('[')) {
                              bracketStack.push('[')
                            }
                            
                            // Track closing braces/brackets
                            if (trimmedLine === '}' || trimmedLine.endsWith('},')) {
                              if (braceStack.length > 0) braceStack.pop()
                              if (currentPath.length > 0) currentPath.pop()
                            }
                            if (trimmedLine === ']' || trimmedLine.endsWith('],')) {
                              if (bracketStack.length > 0) bracketStack.pop()
                              if (currentPath.length > 0) currentPath.pop()
                            }
                            
                            // Extract field name from lines like '"fieldName": value'
                            const fieldMatch = trimmedLine.match(/^"([^"]+)":/)
                            if (fieldMatch) {
                              const fieldName = fieldMatch[1]
                              const fullPath = currentPath.length > 0 ? [...currentPath, fieldName].join('.') : fieldName
                              lineToPathMap.set(index, fullPath)
                              
                              // If this field opens an object or array, add it to the path
                              if (trimmedLine.endsWith('{') || trimmedLine.endsWith('[')) {
                                currentPath.push(fieldName)
                              }
                            }
                            
                            // Handle array indices
                            if (bracketStack.length > 0 && trimmedLine.match(/^\d+:/)) {
                              const indexMatch = trimmedLine.match(/^(\d+):/)
                              if (indexMatch) {
                                const arrayIndex = indexMatch[1]
                                const fullPath = currentPath.length > 0 ? [...currentPath, `[${arrayIndex}]`].join('.') : `[${arrayIndex}]`
                                lineToPathMap.set(index, fullPath)
                              }
                            }
                          })
                          
                          return lineToPathMap
                        }

                        // Create a function to determine if a line should be highlighted based on error path
                        const shouldHighlightLine = (line: string, errorPath: string, lineIndex: number, lineToPathMap: Map<number, string>) => {
                          // Get the actual path for this line
                          const actualPath = lineToPathMap.get(lineIndex)
                          if (!actualPath) return false
                          
                          // Check if this line's path matches the error path
                          return actualPath === errorPath
                        }

                        // Build the line-to-path mapping
                        const lines = formattedJson.split('\n')
                        const lineToPathMap = buildLineToPathMap(jsonData, lines)

                        // Split into lines and add highlighting - limit to first 1000 lines for performance
                        const maxLines = 1000
                        const limitedLines = lines.slice(0, maxLines)
                        return limitedLines.map((line: string, lineIndex: number) => {
                          let highlightedLine = line
                          
                          // FIRST: Highlight missing fields (yellow background) - capture entire field including closing quote
                          if (line.includes('[שדה חסר]')) {
                            const originalLine = highlightedLine
                            
                            // Use the working pattern (Pattern 3)
                            const pattern = /("[^"]+"\s*:\s*"[^"]*\[שדה חסר\][^"]*")/g
                            
                            if (pattern.test(highlightedLine)) {
                              highlightedLine = highlightedLine.replace(
                                pattern,
                                '<span style="background: rgba(255,235,59,0.6); color: #333; padding: 2px 4px; border-radius: 4px; border: 1px solid rgba(255,235,59,0.8); font-weight: 500;">$1</span>'
                              )
                            }
                          }
                          
                          // SECOND: Highlight error fields (red background) - but skip if already highlighted as missing
                          validationResult?.errors?.forEach(error => {
                            if (shouldHighlightLine(line, error.path, lineIndex, lineToPathMap) && !line.includes('[שדה חסר]')) {
                              const fieldName = error.path.split('.').pop()
                              if (fieldName) {
                                // Only highlight if it's NOT a missing field
                                const keyValueRegex = new RegExp(`("${fieldName}"\\s*:\\s*[^,}\\]]*[",}])`, 'g')
                                highlightedLine = highlightedLine.replace(
                                  keyValueRegex,
                                  '<span style="background: rgba(244,67,54,0.4); color: white; padding: 2px 4px; border-radius: 4px; border: 1px solid rgba(244,67,54,0.6); font-weight: 500;">$1</span>'
                                )
                              }
                            }
                          })
                          
                          return (
                            <div key={lineIndex} dangerouslySetInnerHTML={{ __html: highlightedLine }} />
                          )
                        }).concat(
                          lines.length > maxLines ? [
                            <div key="truncated" style={{ 
                              padding: '8px', 
                              background: 'rgba(255,165,0,0.2)', 
                              border: '1px solid rgba(255,165,0,0.4)',
                              borderRadius: '4px',
                              marginTop: '8px',
                              fontSize: '12px',
                              color: '#ff9800'
                            }}>
                              ⚠️ JSON גדול מדי - מוצגות רק {maxLines} שורות ראשונות מתוך {lines.length}
                            </div>
                          ] : []
                        )
                      } catch (error) {
                        return (
                          <span style={{ color: '#f44336' }}>
                            JSON לא תקין: {error instanceof Error ? error.message : 'שגיאה לא ידועה'}
                          </span>
                        )
                      }
                    })() : (
                      // Placeholder when no validation has been performed
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        textAlign: 'center',
                        opacity: 0.6
                      }}>
                        <div style={{
                          fontSize: '48px',
                          marginBottom: '20px',
                          opacity: 0.6
                        }}>
                          🔍
                        </div>
                        <h3 style={{
                          fontSize: '20px',
                          fontWeight: '600',
                          color: 'var(--text)',
                          margin: '0 0 12px 0'
                        }}>
                          תוצאת בדיקת תקינות
                        </h3>
                        <p style={{
                          fontSize: '14px',
                          color: 'var(--muted)',
                          margin: '0',
                          lineHeight: '1.5',
                          direction: 'rtl'
                        }}>
                          לחץ על "בדוק תקינות" כדי לראות את תוצאות הבדיקה עם סימון השדות
                        </p>
                      </div>
                    )}
                  </pre>
                </div>
                <div style={{
                  marginTop: '18px',
                  fontSize: '12px',
                  color: 'var(--muted)',
                  display: 'flex',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      background: 'rgba(244,67,54,0.4)', 
                      borderRadius: '2px' 
                    }}></div>
                    <span>שדות עם שגיאות</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ 
                      width: '12px', 
                      height: '12px', 
                      background: 'rgba(255,235,59,0.6)', 
                      borderRadius: '2px' 
                    }}></div>
                    <span>שדות חסרים</span>
                  </div>
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
            ) : (
              /* Placeholder when no validation performed */
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                width: '100%',
                margin: '0',
                padding: '32px',
                height: '700px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                direction: 'ltr'
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '20px',
                  opacity: 0.6
                }}>
                  📋
                </div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: 'var(--text)',
                  margin: '0 0 12px 0'
                }}>
                  תוצאות הבדיקה 
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--muted)',
                  margin: '0 0 20px 0',
                  lineHeight: '1.5',
                  direction: 'rtl'
                }}>
                  הדבק קובץ JSON ולחץ על "בדוק תקינות" כדי לבדוק האם הדג"ח עומד בסכמה שנבחרה
                </p>
                
              </div>
            )}
          </div>

          {/* Errors Column */}
          <div style={{ width: '30%' }}>
            {validationResult && validationResult.errors.length > 0 ? (
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(244,67,54,0.4)',
                borderRadius: '12px',
                width: '100%',
                margin: '0',
                marginTop: '0',
                padding: '32px',
                height: '800px',
                overflow: 'auto',
                willChange: 'transform',
                contain: 'layout style paint',
                transform: 'translateZ(0)',
                isolation: 'isolate',
                backfaceVisibility: 'hidden'
              }}>
                {/* Errors Header */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px',
                  paddingBottom: '12px',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  justifyContent: 'center',
                }}>
                  
                  <h3 style={{
                    fontSize: '20px',
                    fontWeight: '600',
                    color: 'var(--text)',
                    justifyContent: 'center',
                    margin: 0
                  }}>
                    שגיאות ({validationResult.errors.length})
                  </h3>
                  <span style={{
                    fontSize: '24px',
                    color: '#f44336'
                  }}>
                    ❌
                  </span>
                </div>

                {/* Errors List */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}>
                  {validationResult.errors.slice(0, 50).map((error, index) => {
                    const isMissingField = error.message.includes('שדה חובה חסר')
                    const errorColor = isMissingField ? 'rgba(255,235,59,0.1)' : 'rgba(244,67,54,0.1)'
                    const borderColor = isMissingField ? 'rgba(255,235,59,0.3)' : 'rgba(244,67,54,0.3)'
                    const textColor = isMissingField ? '#ffc107' : '#f44336'
                    
                    return (
                      <div key={index} style={{
                        background: errorColor,
                        border: `1px solid ${borderColor}`,
                        borderRadius: '8px',
                        padding: '12px',
                        fontSize: '13px'
                      }}>
                        <div style={{
                          fontWeight: '600',
                          color: textColor,
                          marginBottom: '4px',
                          fontSize: '14px'
                        }}>
                          {error.path}
                        </div>
                        <div style={{
                          color: textColor,
                          fontSize: '12px',
                          lineHeight: '1.4'
                        }}>
                          {isMissingField ? 'missing required field' : error.message.replace(/^[^:]+:\s*/, '')}
                        </div>
                      </div>
                    )
                  })}
                  {validationResult.errors.length > 50 && (
                    <div style={{
                      padding: '12px',
                      background: 'rgba(255,165,0,0.1)',
                      border: '1px solid rgba(255,165,0,0.3)',
                      borderRadius: '8px',
                      fontSize: '12px',
                      color: '#ff9800',
                      textAlign: 'center'
                    }}>
                      ⚠️ מוצגות רק 50 שגיאות ראשונות מתוך {validationResult.errors.length}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Placeholder when no errors */
              <div style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                width: '100%',
                margin: '0',
                marginTop: '0',
                padding: '32px',
                height: '700px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '48px',
                  marginBottom: '20px',
                  opacity: 0.6
                }}>
                  ✅
                </div>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: 'var(--text)',
                  margin: '0 0 12px 0'
                }}>
                  שגיאות
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: 'var(--muted)',
                  margin: '0',
                  lineHeight: '1.5'
                }}>
                  {validationResult ? 'אין שגיאות' : 'בצע בדיקה כדי לראות שגיאות'}
                </p>
              </div>
            )}
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
