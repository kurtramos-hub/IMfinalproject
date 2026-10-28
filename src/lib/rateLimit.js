import pool from "./staffDb";

const WINDOW_MINUTES = 15;

// Best guess at the visitor's IP. Behind a trusted host (like Vercel) the
// x-forwarded-for header is set by the platform.
export function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const first = typeof forwarded === "string" ? forwarded.split(",")[0].trim() : "";
  return first || req.socket?.remoteAddress || "unknown";
}

// true when this bucket already failed `max` times in the last 15 minutes
export async function tooManyAttempts(bucket, max) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS n
       FROM auth_attempts
      WHERE bucket = $1
        AND attempted_at > NOW() - make_interval(mins => $2::int)`,
    [bucket, WINDOW_MINUTES]
  );
  return rows[0].n >= max;
}

export async function recordFailure(bucket) {
  await pool.query("INSERT INTO auth_attempts (bucket) VALUES ($1)", [bucket]);
  // keep the table small: drop anything older than a day
  await pool.query("DELETE FROM auth_attempts WHERE attempted_at < NOW() - INTERVAL '1 day'");
}

export async function clearAttempts(bucket) {
  await pool.query("DELETE FROM auth_attempts WHERE bucket = $1", [bucket]);
}