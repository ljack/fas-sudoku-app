import { Pool } from 'pg';
import { DatabaseBridge } from './registry';

export class DatabaseManager implements DatabaseBridge {
  private pool: Pool;
  private migrations: Map<string, string> = new Map();

  constructor() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';
    console.log('[Core] Connecting to database using URL config...');
    this.pool = new Pool({
      connectionString,
      // Add standard connection retries
      connectionTimeoutMillis: 5000,
    });
  }

  // Execute raw query
  public async query(text: string, params?: any[]): Promise<any> {
    return this.pool.query(text, params);
  }

  // Register feature migration
  public registerMigration(featureName: string, sql: string) {
    this.migrations.set(featureName, sql);
  }

  // Run all registered migrations inside a transaction
  public async executeMigrations() {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      // Ensure migrations table exists
      await client.query(`
        CREATE TABLE IF NOT EXISTS fas_migrations (
          feature_name VARCHAR(100) PRIMARY KEY,
          executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      console.log(`[Core] Checking ${this.migrations.size} registered migrations...`);

      for (const [featureName, sqlScript] of this.migrations.entries()) {
        const res = await client.query('SELECT 1 FROM fas_migrations WHERE feature_name = $1', [featureName]);
        if (res.rowCount === 0) {
          console.log(`[Core] Running migration for feature: ${featureName}`);
          // Execute migration SQL script
          await client.query(sqlScript);
          // Log execution
          await client.query('INSERT INTO fas_migrations (feature_name) VALUES ($1)', [featureName]);
        }
      }
      
      await client.query('COMMIT');
      console.log('[Core] Migrations successfully verified and executed.');
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('[Core] Migration transaction failed:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  public async close() {
    await this.pool.end();
    console.log('[Core] Database connection closed.');
  }
}
