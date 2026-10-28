import bcrypt from "bcryptjs";
import pool from "../../../lib/staffDb";
import { signStaffToken, setStaffCookie } from "../../../lib/auth";
import { clientIp, tooManyAttempts, recordFailure, clearAttempts } from "../../../lib/rateLimit";

// Same cost as the hashes made at signup (10). Used when the email doesn't exist,
// so a wrong email takes as long as a wrong password and reveals nothing.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const MAX_PER_EMAIL = 5;  // failed tries per email in 15 minutes
const MAX_PER_IP = 20;    // failed tries per IP in 15 minutes

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, password } = req.body || {};

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return res.status(400).json({ message: "Enter your email and password." });
  }
  if (email.length > 254 || password.length > 128) {
    return res.status(400).json({ message: "Wrong email or password." });
  }

  const cleanEmail = email.trim().toLowerCase();
  const ipBucket = `login:ip:${clientIp(req)}`;
  const emailBucket = `login:email:${cleanEmail}`;

  try {
    if ((await tooManyAttempts(ipBucket, MAX_PER_IP)) || (await tooManyAttempts(emailBucket, MAX_PER_EMAIL))) {
      res.setHeader("Retry-After", "900");
      return res.status(429).json({ message: "Too many attempts. Try again in 15 minutes." });
    }

    const result = await pool.query(
      "SELECT id, full_name, email, password_hash, role FROM staff WHERE email = $1 AND used_at IS NOT NULL",
      [cleanEmail]
    );

    const user = result.rows[0];

    // Always run a bcrypt compare, even when the email wasn't found
    const passwordOk = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

    if (!user || !passwordOk) {
      await Promise.all([recordFailure(ipBucket), recordFailure(emailBucket)]);
      return res.status(401).json({ message: "Wrong email or password." });
    }

    await clearAttempts(emailBucket);

    setStaffCookie(res, signStaffToken(user));
    return res.status(200).json({
      message: "Logged in.",
      user: { id: user.id, fullName: user.full_name, role: user.role },
    });
  } catch (err) {
    console.error("Staff login error:", err);
    return res.status(500).json({ message: "Something went wrong. Try again." });
  }
}