import jwt from "jsonwebtoken";

const COOKIE_NAME = "staff_token";
const MAX_AGE = 60 * 60 * 8; // 8 hours

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

export function signStaffToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, type: "staff" },
    getSecret(),
    { algorithm: "HS256", expiresIn: MAX_AGE }
  );
}

export function setStaffCookie(res, token) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=${token}; ${cookieFlags()}; Max-Age=${MAX_AGE}`);
}

export function clearStaffCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; ${cookieFlags()}; Max-Age=0`);
}

// Returns the logged-in staff payload ({ id, role, type }) or null
export function getStaffFromRequest(req) {
  const cookie = (req.headers.cookie || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return null;

  const secret = getSecret(); // outside the try so a bad config is loud, not silent

  try {
    const payload = jwt.verify(cookie.slice(COOKIE_NAME.length + 1), secret, {
      algorithms: ["HS256"], // only accept the algorithm we sign with
    });
    return payload.type === "staff" ? payload : null;
  } catch {
    return null;
  }
}

// Use at the top of every staff-only API handler:
//
//   const staff = requireStaff(req, res);
//   if (!staff) return;
//
// Limit an action to certain roles with a third argument:
//
//   const staff = requireStaff(req, res, ["admin"]);
//   if (!staff) return;
export function requireStaff(req, res, roles) {
  const staff = getStaffFromRequest(req);

  if (!staff) {
    res.status(401).json({ message: "Please log in first." });
    return null;
  }
  if (roles && !roles.includes(staff.role)) {
    res.status(403).json({ message: "You don't have permission to do that." });
    return null;
  }
  return staff;
}