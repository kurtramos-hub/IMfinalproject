import { Pool } from "pg";

const globalForPg = globalThis;

const pool =
  globalForPg.staffPgPool ||
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") globalForPg.staffPgPool = pool;

export default pool;