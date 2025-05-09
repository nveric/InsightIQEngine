import { DataSource } from "@shared/schema";
import pkg from "pg";
const { Client } = pkg;
import mysql from "mysql2/promise";

interface ConnectionResult {
  success: boolean;
  error?: string;
}

interface SchemaColumn {
  name: string;
  type: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: {
    table: string;
    column: string;
  };
}

interface TableSchema {
  name: string;
  columns: SchemaColumn[];
}

interface QueryResult {
  columns: string[];
  rows: any[];
  rowCount: number;
  error?: string;
}

// Test connection to data source
export async function testDataSourceConnection(dataSource: DataSource): Promise<ConnectionResult> {
  try {
    switch (dataSource.type) {
      case "postgresql":
        return await testPostgresConnection(dataSource);
      case "mysql":
        return await testMySQLConnection(dataSource);
      default:
        return { success: false, error: `Unsupported database type: ${dataSource.type}` };
    }
  } catch (error) {
    console.error("Error testing connection:", error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Fetch schema from data source
export async function fetchSchemaFromDataSource(dataSource: DataSource): Promise<TableSchema[]> {
  try {
    switch (dataSource.type) {
      case "postgresql":
        return await fetchPostgresSchema(dataSource);
      case "mysql":
        return await fetchMySQLSchema(dataSource);
      default:
        throw new Error(`Unsupported database type: ${dataSource.type}`);
    }
  } catch (error) {
    console.error("Error fetching schema:", error);
    throw error;
  }
}

// Execute query against data source
export async function executeQuery(dataSource: DataSource, query: string): Promise<QueryResult> {
  try {
    switch (dataSource.type) {
      case "postgresql":
        return await executePostgresQuery(dataSource, query);
      case "mysql":
        return await executeMySQLQuery(dataSource, query);
      default:
        throw new Error(`Unsupported database type: ${dataSource.type}`);
    }
  } catch (error) {
    console.error("Error executing query:", error);
    return {
      columns: [],
      rows: [],
      rowCount: 0,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// PostgreSQL specific functions
async function testPostgresConnection(dataSource: DataSource): Promise<ConnectionResult> {
  const client = new Client({
    host: dataSource.host,
    port: dataSource.port,
    database: dataSource.database,
    user: dataSource.username,
    password: dataSource.password,
    ssl: dataSource.ssl,
    connectionTimeoutMillis: 5000,
  });

  try {
    await client.connect();
    await client.query('SELECT 1');
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown connection error'
    };
  } finally {
    await client.end();
  }
}

async function fetchPostgresSchema(dataSource: DataSource): Promise<TableSchema[]> {
  const client = new Client({
    host: dataSource.host,
    port: dataSource.port,
    database: dataSource.database,
    user: dataSource.username,
    password: dataSource.password,
    ssl: dataSource.ssl,
  });

  try {
    await client.connect();
    
    // Get all tables in the public schema
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `);
    
    const tables: TableSchema[] = [];
    
    for (const tableRow of tablesResult.rows) {
      const tableName = tableRow.table_name;
      
      // Get columns for this table
      const columnsResult = await client.query(`
        SELECT 
          c.column_name, 
          c.data_type, 
          c.is_nullable,
          CASE WHEN pk.constraint_type = 'PRIMARY KEY' THEN true ELSE false END as is_primary_key,
          CASE WHEN fk.constraint_name IS NOT NULL THEN true ELSE false END as is_foreign_key,
          fk.foreign_table_name,
          fk.foreign_column_name
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT 
            tc.constraint_type, 
            kcu.column_name, 
            kcu.table_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_name = kcu.table_name
          WHERE tc.constraint_type = 'PRIMARY KEY'
        ) pk 
          ON c.column_name = pk.column_name 
          AND c.table_name = pk.table_name
        LEFT JOIN (
          SELECT 
            tc.constraint_name, 
            kcu.column_name, 
            kcu.table_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_name = kcu.table_name
          JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name
          WHERE tc.constraint_type = 'FOREIGN KEY'
        ) fk 
          ON c.column_name = fk.column_name 
          AND c.table_name = fk.table_name
        WHERE c.table_name = $1
        ORDER BY c.ordinal_position
      `, [tableName]);
      
      const columns: SchemaColumn[] = columnsResult.rows.map(row => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        isPrimaryKey: row.is_primary_key,
        isForeignKey: row.is_foreign_key,
        references: row.is_foreign_key ? {
          table: row.foreign_table_name,
          column: row.foreign_column_name
        } : undefined
      }));
      
      tables.push({
        name: tableName,
        columns
      });
    }
    
    return tables;
  } finally {
    await client.end();
  }
}

async function executePostgresQuery(dataSource: DataSource, query: string): Promise<QueryResult> {
  const client = new Client({
    host: dataSource.host,
    port: dataSource.port,
    database: dataSource.database,
    user: dataSource.username,
    password: dataSource.password,
    ssl: dataSource.ssl,
  });

  try {
    await client.connect();
    const result = await client.query(query);
    
    return {
      columns: result.fields.map(field => field.name),
      rows: result.rows,
      rowCount: result.rowCount,
    };
  } finally {
    await client.end();
  }
}

// MySQL specific functions
async function testMySQLConnection(dataSource: DataSource): Promise<ConnectionResult> {
  const connection = await mysql.createConnection({
    host: dataSource.host,
    port: dataSource.port,
    database: dataSource.database,
    user: dataSource.username,
    password: dataSource.password,
    ssl: dataSource.ssl ? {} : undefined,
    connectTimeout: 5000,
  });

  try {
    await connection.query('SELECT 1');
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown connection error'
    };
  } finally {
    await connection.end();
  }
}

async function fetchMySQLSchema(dataSource: DataSource): Promise<TableSchema[]> {
  const connection = await mysql.createConnection({
    host: dataSource.host,
    port: dataSource.port,
    database: dataSource.database,
    user: dataSource.username,
    password: dataSource.password,
    ssl: dataSource.ssl ? {} : undefined,
  });

  try {
    // Get all tables in the database
    const [tablesResult] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = ?
      AND table_type = 'BASE TABLE'
    `, [dataSource.database]);
    
    const tables: TableSchema[] = [];
    
    for (const tableRow of tablesResult as any[]) {
      const tableName = tableRow.TABLE_NAME || tableRow.table_name;
      
      // Get columns for this table
      const [columnsResult] = await connection.query(`
        SELECT 
          c.COLUMN_NAME as column_name, 
          c.DATA_TYPE as data_type, 
          c.IS_NULLABLE as is_nullable,
          CASE WHEN tc.CONSTRAINT_TYPE = 'PRIMARY KEY' THEN true ELSE false END as is_primary_key,
          CASE WHEN kcu2.REFERENCED_TABLE_NAME IS NOT NULL THEN true ELSE false END as is_foreign_key,
          kcu2.REFERENCED_TABLE_NAME as foreign_table_name,
          kcu2.REFERENCED_COLUMN_NAME as foreign_column_name
        FROM information_schema.COLUMNS c
        LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu
          ON c.COLUMN_NAME = kcu.COLUMN_NAME 
          AND c.TABLE_NAME = kcu.TABLE_NAME
          AND c.TABLE_SCHEMA = kcu.TABLE_SCHEMA
        LEFT JOIN information_schema.TABLE_CONSTRAINTS tc
          ON kcu.CONSTRAINT_NAME = tc.CONSTRAINT_NAME
          AND kcu.TABLE_SCHEMA = tc.TABLE_SCHEMA
          AND tc.CONSTRAINT_TYPE = 'PRIMARY KEY'
        LEFT JOIN information_schema.KEY_COLUMN_USAGE kcu2
          ON c.COLUMN_NAME = kcu2.COLUMN_NAME 
          AND c.TABLE_NAME = kcu2.TABLE_NAME
          AND c.TABLE_SCHEMA = kcu2.TABLE_SCHEMA
          AND kcu2.REFERENCED_TABLE_NAME IS NOT NULL
        WHERE c.TABLE_NAME = ?
        AND c.TABLE_SCHEMA = ?
        ORDER BY c.ORDINAL_POSITION
      `, [tableName, dataSource.database]);
      
      const columns: SchemaColumn[] = (columnsResult as any[]).map(row => ({
        name: row.column_name,
        type: row.data_type,
        nullable: row.is_nullable === 'YES',
        isPrimaryKey: Boolean(row.is_primary_key),
        isForeignKey: Boolean(row.is_foreign_key),
        references: row.is_foreign_key ? {
          table: row.foreign_table_name,
          column: row.foreign_column_name
        } : undefined
      }));
      
      tables.push({
        name: tableName,
        columns
      });
    }
    
    return tables;
  } finally {
    await connection.end();
  }
}

async function executeMySQLQuery(dataSource: DataSource, query: string): Promise<QueryResult> {
  const connection = await mysql.createConnection({
    host: dataSource.host,
    port: dataSource.port,
    database: dataSource.database,
    user: dataSource.username,
    password: dataSource.password,
    ssl: dataSource.ssl ? {} : undefined,
  });

  try {
    const [rows, fields] = await connection.query(query);
    
    return {
      columns: fields ? (fields as mysql.FieldPacket[]).map(field => field.name) : [],
      rows: rows as any[],
      rowCount: Array.isArray(rows) ? rows.length : 0,
    };
  } finally {
    await connection.end();
  }
}
