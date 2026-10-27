import * as staffDb from "./staffDb";

// The pool from your staffDb.js. If it is exported under a different name,
// change this one line.
export const pool = staffDb.pool || staffDb.default;

// TODO: replace this with the same staff/admin check your other staff API
// routes use (for example the one in api/staff/categories.js). Until you do,
// anyone who knows the URL can call these routes.
export function requireStaff(req, res) {
  return true;
}