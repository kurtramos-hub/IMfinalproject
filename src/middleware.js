import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "staff_token";

// Open to everyone, otherwise nobody could ever log in or sign up
const PUBLIC_PAGES = ["/staff/login", "/staff/signup"];
const PUBLIC_API = ["/api/staff/login", "/api/staff/signup", "/api/staff/logout"];

// Every API path starting with one of these needs a staff login
const PROTECTED_API_PREFIXES = ["/api/staff"];

// Same check as getStaffFromRequest in lib/auth.js, but using `jose`,
// because middleware can't use the `jsonwebtoken` package.
async function getStaff(req) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token || !process.env.JWT_SECRET) return null;

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(process.env.JWT_SECRET),
      { algorithms: ["HS256"] } // only accept the algorithm we sign with
    );
    return payload.type === "staff" ? payload : null;
  } catch {
    return null; // expired, tampered with, or signed with another secret
  }
}

function redirectTo(req, pathname) {
  const url = req.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  return NextResponse.redirect(url);
}

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";

  // `path` is always lowercase, so these comparisons must be lowercase too
  const isStaffPage = path === "/staff" || path.startsWith("/staff/");
  const isProtectedApi = PROTECTED_API_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`)
  );

  if (!isStaffPage && !isProtectedApi) return NextResponse.next();

  const staff = await getStaff(req);
  const hadCookie = req.cookies.has(COOKIE_NAME);

  // ----- API routes -----
  if (isProtectedApi) {
    if (PUBLIC_API.includes(path) || staff) return NextResponse.next();

    const res = NextResponse.json({ message: "Please log in first." }, { status: 401 });
    if (hadCookie) res.cookies.delete(COOKIE_NAME); // remove a bad or expired cookie
    return res;
  }

  // ----- Pages -----

  // /Staff/Dashboard -> /staff/dashboard (next.config.mjs maps it to the Staff folder)
  if (pathname !== pathname.toLowerCase()) {
    const url = req.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url);
  }

  // /staff on its own
  if (path === "/staff") {
    return redirectTo(req, staff ? "/staff/dashboard" : "/staff/login");
  }

  // Login and signup: logged-in staff have no reason to be here
  if (PUBLIC_PAGES.includes(path)) {
    if (staff) return redirectTo(req, "/staff/dashboard");
    return NextResponse.next();
  }

  // Every other staff page requires a login
  if (!staff) {
    const res = redirectTo(req, "/staff/login");
    if (hadCookie) res.cookies.delete(COOKIE_NAME);
    return res;
  }

  // Logged in: let it through, but don't let the browser cache the page,
  // so the Back button after logging out can't show it again
  const res = NextResponse.next();
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export const config = {
  // Run on everything except Next.js internals and static files (anything with a dot)
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};