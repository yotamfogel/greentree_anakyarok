import { SagachimStatusItem, SagachTable } from '../contexts/SagachDataContext'

// Database configuration interface
export interface DatabaseConfig {
  host: string
  port: number
  database: string
  user: string
  password: string
  ssl?: boolean | object
  connectionTimeoutMillis?: number
  idleTimeoutMillis?: number
  max?: number
}

// Dynamic imports for browser compatibility
let Client: any = null
let Pool: any = null
let QueryResult: any = null

// Try to load pg module, but handle browser environment gracefully
try {
  // Only attempt to load in Node.js environment
  if (typeof window === 'undefined') {
    const pg = require('pg')
    Client = pg.Client
    Pool = pg.Pool
    QueryResult = pg.QueryResult
  }
} catch (error) {
  console.warn('PostgreSQL module not available in browser environment')
}

// Safe environment variable access for browser compatibility
const getEnvVar = (key: string, defaultValue: string = ''): string => {
  // Check if we're in a browser environment
  if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    // In browser, try to get from window object or return default
    return (window as any).__ENV__?.[key] || defaultValue
  }
  return process.env[key] || defaultValue
}

// Default configuration - these will be overridden by environment variables or config file
const DEFAULT_CONFIG: DatabaseConfig = {
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

class PostgreSQLService {
  private pool: any = null
  private client: any = null
  private config: DatabaseConfig
  private isConnected: boolean = false

  constructor(config?: Partial<DatabaseConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Initialize database connection pool
   */
  async initialize(): Promise<void> {
    // Check if pg module is available
    if (!Pool || !Client) {
      throw new Error('PostgreSQL module not available in browser environment. Database features require a Node.js environment.')
    }

    try {
      if (this.pool) {
        await this.pool.end()
      }

      this.pool = new Pool(this.config)

      // Test the connection
      const client = await this.pool.connect()
      await client.query('SELECT 1')
      client.release()

      this.isConnected = true
      console.log('✅ PostgreSQL connected successfully')
    } catch (error) {
      console.error('❌ PostgreSQL connection failed:', error)
      this.isConnected = false
      throw error
    }
  }

  /**
   * Create database tables if they don't exist
   */
  async createTables(): Promise<void> {
    if (!Pool || !Client) {
      throw new Error('PostgreSQL module not available')
    }

    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected')
    }

    try {
      // Create sagachim_status table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS sagachim_status (
          id VARCHAR(255) PRIMARY KEY,
          name TEXT NOT NULL,
          description TEXT,
          provider VARCHAR(255),
          last_updated TIMESTAMP,
          arena TEXT[],
          priority VARCHAR(50),
          sagach_type TEXT,
          process_status INTEGER CHECK (process_status >= 1 AND process_status <= 7),
          process_start_date DATE,
          estimated_completion DATE,
          contact_person TEXT,
          notes TEXT,
          status_updates JSONB,
          phase_data JSONB,
          notifications BOOLEAN DEFAULT false,
          notification_method VARCHAR(20),
          notification_frequency VARCHAR(20),
          completion_date DATE,
          notification_subscribers JSONB,
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_modified_by VARCHAR(255),
          last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create sagachs table
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS sagachs (
          id VARCHAR(255) PRIMARY KEY,
          name TEXT NOT NULL,
          data JSONB,
          versions JSONB,
          current_version VARCHAR(255),
          created_by VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          last_modified_by VARCHAR(255),
          last_modified_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create data_changes table for audit trail
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS data_changes (
          id SERIAL PRIMARY KEY,
          event_type VARCHAR(50) NOT NULL,
          event_data JSONB,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_id VARCHAR(255),
          user_name VARCHAR(255)
        )
      `)

      console.log('✅ Database tables created/verified')
    } catch (error) {
      console.error('❌ Failed to create tables:', error)
      throw error
    }
  }

  /**
   * Load all sagachim status items from database
   */
  async loadSagachimStatus(): Promise<SagachimStatusItem[]> {
    if (!Pool || !Client) {
      throw new Error('PostgreSQL module not available')
    }

    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected')
    }

    try {
      const result = await this.pool.query('SELECT * FROM sagachim_status ORDER BY last_modified_at DESC')
      return result.rows as SagachimStatusItem[]
    } catch (error) {
      console.error('❌ Failed to load sagachim status:', error)
      throw error
    }
  }

  /**
   * Load all sagachs from database
   */
  async loadSagachs(): Promise<SagachTable[]> {
    if (!Pool || !Client) {
      throw new Error('PostgreSQL module not available')
    }

    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected')
    }

    try {
      const result = await this.pool.query('SELECT * FROM sagachs ORDER BY last_modified_at DESC')
      return result.rows as SagachTable[]
    } catch (error) {
      console.error('❌ Failed to load sagachs:', error)
      throw error
    }
  }

  /**
   * Save a new sagachim status item to database
   */
  async saveSagachimStatus(item: SagachimStatusItem): Promise<void> {
    if (!Pool || !Client) {
      throw new Error('PostgreSQL module not available')
    }

    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected')
    }

    try {
      const query = `
        INSERT INTO sagachim_status (
          id, name, description, provider, last_updated, arena, priority, sagach_type,
          process_status, process_start_date, estimated_completion, contact_person, notes,
          status_updates, phase_data, notifications, notification_method, notification_frequency,
          completion_date, notification_subscribers, created_by, created_at, last_modified_by, last_modified_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          description = EXCLUDED.description,
          provider = EXCLUDED.provider,
          last_updated = EXCLUDED.last_updated,
          arena = EXCLUDED.arena,
          priority = EXCLUDED.priority,
          sagach_type = EXCLUDED.sagach_type,
          process_status = EXCLUDED.process_status,
          process_start_date = EXCLUDED.process_start_date,
          estimated_completion = EXCLUDED.estimated_completion,
          contact_person = EXCLUDED.contact_person,
          notes = EXCLUDED.notes,
          status_updates = EXCLUDED.status_updates,
          phase_data = EXCLUDED.phase_data,
          notifications = EXCLUDED.notifications,
          notification_method = EXCLUDED.notification_method,
          notification_frequency = EXCLUDED.notification_frequency,
          completion_date = EXCLUDED.completion_date,
          notification_subscribers = EXCLUDED.notification_subscribers,
          last_modified_by = EXCLUDED.last_modified_by,
          last_modified_at = EXCLUDED.last_modified_at
      `

      const values = [
        item.id, item.name, item.description, item.provider, item.lastUpdated,
        item.arena, item.priority, item.sagachType, item.processStatus,
        item.processStartDate, item.estimatedCompletion, item.contactPerson, item.notes,
        JSON.stringify(item.statusUpdates || []), JSON.stringify(item.phaseData || {}),
        item.notifications || false, item.notificationMethod, item.notificationFrequency,
        item.completionDate, JSON.stringify(item.notificationSubscribers || []),
        item.createdBy, item.createdAt, item.lastModifiedBy, item.lastModifiedAt
      ]

      await this.pool.query(query, values)
    } catch (error) {
      console.error('❌ Failed to save sagachim status:', error)
      throw error
    }
  }

  /**
   * Save a new sagach to database
   */
  async saveSagach(sagach: SagachTable): Promise<void> {
    if (!Pool || !Client) {
      throw new Error('PostgreSQL module not available')
    }

    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected')
    }

    try {
      const query = `
        INSERT INTO sagachs (
          id, name, data, versions, current_version, created_by, created_at, last_modified_by, last_modified_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          data = EXCLUDED.data,
          versions = EXCLUDED.versions,
          current_version = EXCLUDED.current_version,
          last_modified_by = EXCLUDED.last_modified_by,
          last_modified_at = EXCLUDED.last_modified_at
      `

      await this.pool.query(query, [
        sagach.id, sagach.name, JSON.stringify(sagach.data),
        JSON.stringify(sagach.versions), sagach.currentVersion,
        sagach.createdBy, sagach.createdAt, sagach.lastModifiedBy, sagach.lastModifiedAt
      ])
    } catch (error) {
      console.error('❌ Failed to save sagach:', error)
      throw error
    }
  }

  /**
   * Delete a sagachim status item from database
   */
  async deleteSagachimStatus(id: string): Promise<void> {
    if (!Pool || !Client) {
      throw new Error('PostgreSQL module not available')
    }

    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected')
    }

    
    try {
      await this.pool.query('DELETE FROM sagachim_status WHERE id = $1', [id])
    } catch (error) {
      console.error('❌ Failed to delete sagachim status:', error)
      throw error
    }
  }

  /**
   * Delete a sagach from database
   */
  async deleteSagach(id: string): Promise<void> {
    if (!Pool || !Client) {
      throw new Error('PostgreSQL module not available')
    }

    if (!this.isConnected || !this.pool) {
      throw new Error('Database not connected')
    }

    try {
      await this.pool.query('DELETE FROM sagachs WHERE id = $1', [id])
    } catch (error) {
      console.error('❌ Failed to delete sagach:', error)
      throw error
    }
  }

  /**
   * Log data change event for audit trail
   */
  async logDataChange(eventType: string, eventData: any, userId: string, userName: string): Promise<void> {
    if (!Pool || !Client || !this.isConnected || !this.pool) {
      return // Silently fail for audit logging
    }

    try {
      await this.pool.query(
        'INSERT INTO data_changes (event_type, event_data, user_id, user_name) VALUES ($1, $2, $3, $4)',
        [eventType, JSON.stringify(eventData), userId, userName]
      )
    } catch (error) {
      console.error('❌ Failed to log data change:', error)
      // Don't throw - audit logging shouldn't break main functionality
    }
  }

  /**
   * Get recent data changes for audit trail
   */
  async getRecentChanges(limit: number = 100): Promise<any[]> {
    if (!Pool || !Client || !this.isConnected || !this.pool) {
      return []
    }

    try {
      const result = await this.pool.query(
        'SELECT * FROM data_changes ORDER BY timestamp DESC LIMIT $1',
        [limit]
      )
      return result.rows
    } catch (error) {
      console.error('❌ Failed to get recent changes:', error)
      return []
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    try {
      if (this.pool && Pool && Client) {
        await this.pool.end()
        this.pool = null
        this.isConnected = false
        console.log('🔒 Database connection closed')
      }
    } catch (error) {
      console.error('❌ Error closing database connection:', error)
    }
  }

  /**
   * Check if database is connected
   */
  isDatabaseConnected(): boolean {
    return this.isConnected && this.pool !== null && Pool !== null && Client !== null
  }

  /**
   * Refresh connection state by testing the connection
   */
  async refreshConnectionState(): Promise<boolean> {
    if (!Pool || !Client) {
      this.isConnected = false
      return false
    }

    if (!this.pool) {
      this.isConnected = false
      return false
    }

    try {
      // Test the connection with a simple query
      const client = await this.pool.connect()
      await client.query('SELECT 1')
      client.release()
      this.isConnected = true
      return true
    } catch (error) {
      console.error('❌ Connection test failed:', error)
      this.isConnected = false
      return false
    }
  }

  /**
   * Update configuration and reconnect
   */
  async updateConfig(newConfig: Partial<DatabaseConfig>): Promise<void> {
    if (!Pool || !Client) {
      throw new Error('PostgreSQL module not available')
    }

    this.config = { ...this.config, ...newConfig }
    await this.close()
    await this.initialize()
    await this.createTables()
  }
}

// Singleton instance
let dbService: PostgreSQLService | null = null

export const getDatabaseService = (): PostgreSQLService => {
  if (!dbService) {
    dbService = new PostgreSQLService()
  }
  return dbService
}

export default PostgreSQLService
