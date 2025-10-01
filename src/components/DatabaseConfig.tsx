import React, { useState } from 'react'
import { injectEnvironmentVariables, validateDatabaseConfig, getDatabaseConfig } from '../config/databaseConfig'
import { getDatabaseService } from '../services/postgreSQLService'

interface DatabaseConfigProps {
  onConfigChange?: (isValid: boolean) => void
}

export const DatabaseConfig: React.FC<DatabaseConfigProps> = ({ onConfigChange }) => {
  const [config, setConfig] = useState(() => {
    const currentConfig = getDatabaseConfig()
    return {
      host: currentConfig.host,
      port: currentConfig.port.toString(),
      database: currentConfig.database,
      user: currentConfig.user,
      password: currentConfig.password,
      ssl: currentConfig.ssl ? 'true' : 'false'
    }
  })

  const [errors, setErrors] = useState<string[]>([])
  const [isTesting, setIsTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleInputChange = (field: string, value: string) => {
    const newConfig = { ...config, [field]: value }
    setConfig(newConfig)

    // Validate configuration
    const validationErrors = validateDatabaseConfig({
      host: newConfig.host,
      port: parseInt(newConfig.port),
      database: newConfig.database,
      user: newConfig.user,
      password: newConfig.password,
      ssl: newConfig.ssl === 'true'
    })

    setErrors(validationErrors)
    onConfigChange?.(validationErrors.length === 0)
  }

  const handleApplyConfig = () => {
    if (errors.length > 0) return

    // Inject environment variables for browser
    injectEnvironmentVariables({
      DB_HOST: config.host,
      DB_PORT: config.port,
      DB_NAME: config.database,
      DB_USER: config.user,
      DB_PASSWORD: config.password,
      DB_SSL: config.ssl
    })

    // Update database service configuration
    getDatabaseService().updateConfig({
      host: config.host,
      port: parseInt(config.port),
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl === 'true'
    })

    alert('Database configuration applied! Please refresh the page for changes to take effect.')
  }

  const handleTestConnection = async () => {
    if (errors.length > 0) return

    setIsTesting(true)
    setTestResult(null)

    try {
      const testConfig = {
        host: config.host,
        port: parseInt(config.port),
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl === 'true'
      }

      const result = await import('../config/databaseConfig').then(module =>
        module.testDatabaseConnection(testConfig)
      )

      setTestResult(result)
    } catch (error) {
      setTestResult({
        success: false,
        message: `Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      })
    } finally {
      setIsTesting(false)
    }
  }

  return (
    <div style={{
      padding: '20px',
      border: '1px solid #ddd',
      borderRadius: '8px',
      margin: '20px 0',
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif'
    }}>
      <h3 style={{ marginTop: 0, color: '#333' }}>PostgreSQL Database Configuration</h3>
      <p style={{ color: '#666', fontSize: '14px' }}>
        Configure database connection for enhanced data persistence. Leave blank to use localStorage only.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Host:
          </label>
          <input
            type="text"
            value={config.host}
            onChange={(e) => handleInputChange('host', e.target.value)}
            placeholder="localhost"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Port:
          </label>
          <input
            type="number"
            value={config.port}
            onChange={(e) => handleInputChange('port', e.target.value)}
            placeholder="5432"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Database:
          </label>
          <input
            type="text"
            value={config.database}
            onChange={(e) => handleInputChange('database', e.target.value)}
            placeholder="thegreentree"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            User:
          </label>
          <input
            type="text"
            value={config.user}
            onChange={(e) => handleInputChange('user', e.target.value)}
            placeholder="postgres"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Password:
          </label>
          <input
            type="password"
            value={config.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Enter password"
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            SSL:
          </label>
          <select
            value={config.ssl}
            onChange={(e) => handleInputChange('ssl', e.target.value)}
            style={{ width: '100%', padding: '8px', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="false">Disabled</option>
            <option value="true">Enabled</option>
          </select>
        </div>
      </div>

      {errors.length > 0 && (
        <div style={{
          background: '#f8d7da',
          border: '1px solid #f5c6cb',
          color: '#721c24',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          <strong>Configuration Errors:</strong>
          <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      {testResult && (
        <div style={{
          background: testResult.success ? '#d4edda' : '#f8d7da',
          border: `1px solid ${testResult.success ? '#c3e6cb' : '#f5c6cb'}`,
          color: testResult.success ? '#155724' : '#721c24',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '15px'
        }}>
          <strong>Test Result:</strong> {testResult.message}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={handleTestConnection}
          disabled={errors.length > 0 || isTesting}
          style={{
            padding: '10px 20px',
            background: errors.length > 0 ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: errors.length > 0 ? 'not-allowed' : 'pointer'
          }}
        >
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>

        <button
          onClick={handleApplyConfig}
          disabled={errors.length > 0}
          style={{
            padding: '10px 20px',
            background: errors.length > 0 ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: errors.length > 0 ? 'not-allowed' : 'pointer'
          }}
        >
          Apply Configuration
        </button>
      </div>
    </div>
  )
}

export default DatabaseConfig
