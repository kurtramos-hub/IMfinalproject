import jwt from "jsonwebtoken";
import { sql } from "./db";

const COOKIE_NAME = "token";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

// Refuse to run with a missing or weak secret
function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is missing or too short. Use at least 32 random characters.");
  }
  return secret;
}

function cookieFlags() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `HttpOnly; Path=/; SameSite=Lax${secure}`;
}

export function signCustomerToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, type: "customer" },
    getSecret(),
    { algorithm: "HS256", expiresIn: MAX_AGE }
  );
}

export function setCustomerCookie(res, token) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; ${cookieFlags()}; Max-Age=${MAX_AGE}`);
}

export function clearCustomerCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; ${cookieFlags()}; Max-Age=0`);
}

// Returns the token payload ({ id, email, type }) or null
export function getCustomerFromRequest(req) {
  const cookie = (req.headers.cookie || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return null;

  const secret = getSecret(); // outside the try so a bad config is loud, not silent

  try {
    const payload = jwt.verify(cookie.slice(COOKIE_NAME.length + 1), secret, {
      algorithms: ["HS256"],
    });
    return payload.type === "customer" ? payload : null; // staff tokens are rejected here
  } catch {
    return null;
  }
}

// The logged-in customer from the database, or null.
// A deleted account counts as logged out.
export async function getCustomerUser(req) {
  const payload = getCustomerFromRequest(req);
  if (!payload) return null;

  try {
    const rows = await sql`
      SELECT id, full_name AS name, email FROM users WHERE id = ${payload.id}
    `;
    return rows[0] || null;
  } catch (err) {
    console.error("getCustomerUser error:", err);
    return null;
  }
}