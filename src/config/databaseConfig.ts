import { DatabaseConfig } from '../services/postgreSQLService'

// Safe environment variable access for browser compatibility
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // Check if we're in a browser environment
  if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    // In browser, try to get from window object or return default
    return (window as any).__ENV__?.[key] || defaultValue
  }
  return process.env[key] || defaultValue
}

// Function to inject environment variables (useful for browser-based configuration)
export const injectEnvironmentVariables = (envVars: Record<string, string>) => {
  if (typeof window !== 'undefined') {
    (window as any).__ENV__ = { ...(window as any).__ENV__, ...envVars }
  }
}

// Environment-based configuration
export const databaseConfig: DatabaseConfig = {
  host: getEnvVar('DB_HOST', 'localhost'),
  port: parseInt(getEnvVar('DB_PORT', '5432')),
  database: getEnvVar('DB_NAME', 'thegreentree'),
  user: getEnvVar('DB_USER', 'postgres'),
  password: getEnvVar('DB_PASSWORD', ''),
  ssl: getEnvVar('DB_SSL', 'false') === 'true' ? true : false,
  connectionTimeoutMillis: 60000,
  idleTimeoutMillis: 30000,
  max: 20
}

// Configuration for local development (fallback)
export const localConfig: DatabaseConfig = {
  host: 'localhost',
  port: 5432,
  database: 'thegreentree',
  user: 'postgres',
  password: '',
  ssl: false,
  connectionTimeoutMillis: 60000,
  idleTimeoutMillis: 30000,
  max: 20
}

// Configuration for production/staging
export const productionConfig: DatabaseConfig = {
  host: getEnvVar('DB_HOST', ''),
  port: parseInt(getEnvVar('DB_PORT', '5432')),
  database: getEnvVar('DB_NAME', ''),
  user: getEnvVar('DB_USER', ''),
  password: getEnvVar('DB_PASSWORD', ''),
  ssl: getEnvVar('DB_SSL', 'false') === 'true' ? true : { rejectUnauthorized: false },
  connectionTimeoutMillis: 60000,
  idleTimeoutMillis: 30000,
  max: 20
}

// Function to get configuration based on environment
export const getDatabaseConfig = (environment?: 'local' | 'production' | 'staging'): DatabaseConfig => {
  switch (environment) {
    case 'production':
      return productionConfig
    case 'staging':
      return { ...productionConfig, database: 'thegreentree_staging' }
    case 'local':
    default:
      return databaseConfig
  }
}

// Function to validate configuration
export const validateDatabaseConfig = (config: DatabaseConfig): string[] => {
  const errors: string[] = []

  if (!config.host) errors.push('Database host is required')
  if (!config.port || config.port < 1 || config.port > 65535) errors.push('Valid database port is required (1-65535)')
  if (!config.database) errors.push('Database name is required')
  if (!config.user) errors.push('Database user is required')
  if (!config.password) errors.push('Database password is required')

  return errors
}

// Function to test database connection
export const testDatabaseConnection = async (config: DatabaseConfig): Promise<{ success: boolean; message: string }> => {
  try {
    const { getDatabaseService } = await import('../services/postgreSQLService')
    const dbService = getDatabaseService()

    // 🐘 Temporarily update config and test PostgreSQL connection
    await dbService.updateConfig(config)

    return { success: true, message: '🐘 PostgreSQL connection successful' }
  } catch (error) {
    return {
      success: false,
      message: `🐘 PostgreSQL connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}

// Export default configuration
export default databaseConfig
