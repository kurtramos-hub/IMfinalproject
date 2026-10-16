import jwt from "jsonwebtoken";

const COOKIE_NAME = "staff_token";
const MAX_AGE = 60 * 60 * 8; // 8 hours

export function signStaffToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, type: "staff" },
    process.env.JWT_SECRET,
    { expiresIn: MAX_AGE }
  );
}

export function setStaffCookie(res, token) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; HttpOnly; Path=/; Max-Age=${MAX_AGE}; SameSite=Lax${secure}`
  );
}

export function clearStaffCookie(res) {
  res.setHeader("Set-Cookie", `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
}

// Use this in staff-only API routes to check who is logged in
export function getStaffFromRequest(req) {
  const cookie = (req.headers.cookie || "")
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${COOKIE_NAME}=`));
  if (!cookie) return null;

  try {
    const payload = jwt.verify(cookie.slice(COOKIE_NAME.length + 1), process.env.JWT_SECRET);
    return payload.type === "staff" ? payload : null;
  } catch {
    return null;
  }
}