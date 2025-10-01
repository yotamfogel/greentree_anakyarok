# PostgreSQL Setup Guide for The Green Tree Project

## Overview

The application now supports PostgreSQL database integration for persistent storage of sagachim status data. The system is designed to fall back gracefully to localStorage if the database is unavailable, ensuring the application continues to work in all environments.

## Prerequisites

1. **PostgreSQL Server**: Install PostgreSQL 12 or higher
2. **Database User**: A user with CREATE and INSERT permissions
3. **Environment**: Node.js environment (already included in the project)

## Installation Steps

### 1. Install PostgreSQL

**Windows:**
- Download from: https://www.postgresql.org/download/windows/
- Follow the installation wizard
- Note down the password you set during installation

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

### 2. Create Database and User

Connect to PostgreSQL as the default superuser:

```bash
# Linux/macOS
sudo -u postgres psql

# Windows (if using default installation)
psql -U postgres
```

Create the database and user:

```sql
-- Create database
CREATE DATABASE thegreentree;

-- Create user (replace 'your_password' with a secure password)
CREATE USER thegreentree_user WITH PASSWORD 'your_secure_password';

-- Grant permissions
GRANT ALL PRIVILEGES ON DATABASE thegreentree TO thegreentree_user;

-- Connect to the new database
\c thegreentree;

-- Grant schema permissions
GRANT ALL ON SCHEMA public TO thegreentree_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO thegreentree_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO thegreentree_user;
```

Exit psql:
```sql
\q
```

### 3. Configure Environment Variables

You have two options for configuration:

**Option A: Environment Variables (Recommended for production)**
Create a `.env` file in the project root:

```bash
# Database connection settings
DB_HOST=localhost
DB_PORT=5432
DB_NAME=thegreentree
DB_USER=thegreentree_user
DB_PASSWORD=your_secure_password
DB_SSL=false
```

**Option B: Browser-based Configuration (For development/testing)**
The application includes a built-in database configuration component that allows you to set up the database connection through the web interface. This is useful for development environments where you don't want to set up environment files.

**Environment Variable Options:**

- `DB_HOST`: Database server hostname (default: localhost)
- `DB_PORT`: Database port (default: 5432)
- `DB_NAME`: Database name (default: thegreentree)
- `DB_USER`: Database username (default: postgres)
- `DB_PASSWORD`: Database password (required)
- `DB_SSL`: Enable SSL (true/false, default: false)

### 4. Alternative Configuration Methods

#### Using the Configuration File

You can also configure the database by editing `src/config/databaseConfig.ts`:

```typescript
import { DatabaseConfig } from '../services/postgreSQLService'

export const databaseConfig: DatabaseConfig = {
  host: 'your-host',
  port: 5432,
  database: 'your-database',
  user: 'your-user',
  password: 'your-password',
  ssl: false
}
```

#### Runtime Configuration

For testing different environments:

```typescript
import { getDatabaseService } from '../services/postgreSQLService'

const dbService = getDatabaseService()
await dbService.updateConfig({
  host: 'production-server',
  database: 'prod_thetree',
  // ... other settings
})
```

## Database Schema

The application automatically creates the following tables:

### `sagachim_status` table:
- Stores all sagachim status items
- Automatically created on first connection

### `sagachs` table:
- Stores sagach manager data
- Automatically created on first connection

### `data_changes` table:
- Audit trail for all data changes
- Tracks who made what changes when

## Usage in Closed Network

For closed network deployment:

1. **Install PostgreSQL** on your server
2. **Configure firewall** to allow connections only from your application servers
3. **Set up SSL** for encrypted connections:
   ```typescript
   export const productionConfig: DatabaseConfig = {
     // ... other settings
     ssl: { rejectUnauthorized: false } // For self-signed certificates
   }
   ```

4. **Use connection pooling** for high availability:
   ```typescript
   export const productionConfig: DatabaseConfig = {
     // ... other settings
     max: 50, // Increase connection pool size
     connectionTimeoutMillis: 30000,
     idleTimeoutMillis: 60000
   }
   ```

## Troubleshooting

### Connection Issues

**Error: "password authentication failed"**
- Verify the username and password in your configuration
- Ensure the user exists and has the correct permissions

**Error: "Connection refused"**
- Check if PostgreSQL is running: `sudo systemctl status postgresql`
- Verify the host and port settings
- Check firewall settings

**Error: "database does not exist"**
- Ensure the database was created correctly
- Check the database name in your configuration

### Performance Issues

**Slow queries:**
- Consider adding indexes on frequently queried columns
- Monitor connection pool usage

**High memory usage:**
- Adjust the `max` connection pool setting
- Check for connection leaks in your code

### Testing Connection

You can test the database connection programmatically:

```typescript
import { testDatabaseConnection, getDatabaseConfig } from '../config/databaseConfig'

const config = getDatabaseConfig('production')
const result = await testDatabaseConnection(config)

if (result.success) {
  console.log('✅ Database connected successfully')
} else {
  console.error('❌ Connection failed:', result.message)
}
```

## Migration from localStorage

The application automatically migrates existing localStorage data to PostgreSQL when the database becomes available. No manual migration is required.

## Security Considerations

1. **Use strong passwords** for database users
2. **Enable SSL** in production environments
3. **Limit database permissions** to only what's needed
4. **Use connection encryption** in production
5. **Regularly backup** your database
6. **Monitor access logs** for unusual activity

## Support

For issues related to PostgreSQL setup:

1. Check the application logs for detailed error messages
2. Verify your configuration matches your PostgreSQL setup
3. Test with a simple connection before full deployment
4. Consider PostgreSQL logs: `sudo tail -f /var/log/postgresql/postgresql-*.log`

## Production Checklist

- [ ] PostgreSQL server installed and running
- [ ] Database and user created
- [ ] Environment variables configured
- [ ] SSL enabled (recommended)
- [ ] Firewall configured for closed network
- [ ] Database backed up regularly
- [ ] Connection tested successfully
- [ ] Application deployed and tested

---

**Note**: The application will automatically fall back to localStorage if PostgreSQL is unavailable, ensuring continuous operation in all scenarios.
