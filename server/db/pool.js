import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Read config at runtime from external file
const getDbConfig = () => {
  const configPath = process.env.DB_CONFIG_PATH || join(__dirname, '../config/db.json');
  try {
    const configContent = readFileSync(configPath, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('Failed to read database config from:', configPath);
    throw error;
  }
};

let pool = null;

export const getPool = () => {
  if (!pool) {
    const config = getDbConfig();
    pool = mysql.createPool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      connectionLimit: config.connectionLimit || 10,
      waitForConnections: true,
      queueLimit: 0,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
    console.log(`MySQL pool created for ${config.host}:${config.port}/${config.database}`);
  }
  return pool;
};

export const query = async (sql, params = []) => {
  const pool = getPool();
  const [rows] = await pool.execute(sql, params);
  return rows;
};

export const getConnection = async () => {
  const pool = getPool();
  return pool.getConnection();
};

export const closePool = async () => {
  if (pool) {
    await pool.end();
    pool = null;
  }
};
