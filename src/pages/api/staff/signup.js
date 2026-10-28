import bcrypt from "bcryptjs";
import pool from "../../../lib/staffDb";
import { clientIp, tooManyAttempts, recordFailure } from "../../../lib/rateLimit";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-\s]{7,20}$/;
const MAX_PIN_FAILS_PER_IP = 10; // wrong PINs per IP in 15 minutes

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { fullName, email, phone, password, pin } = req.body || {};

  // Every field must be real text, not missing or an object
  const fields = [fullName, email, phone, password, pin];
  if (fields.some((v) => typeof v !== "string" || !v.trim())) {
    return res.status(400).json({ message: "Fill in all fields." });
  }

  const cleanName = fullName.trim();
  const cleanEmail = email.trim().toLowerCase();
  const cleanPhone = phone.trim();

  if (cleanName.length < 2 || cleanName.length > 100) {
    return res.status(400).json({ message: "Enter your full name." });
  }
  if (cleanEmail.length > 254 || !EMAIL_RE.test(cleanEmail)) {
    return res.status(400).json({ message: "Enter a valid email address." });
  }
  if (!PHONE_RE.test(cleanPhone)) {
    return res.status(400).json({ message: "Enter a valid phone number." });
  }
  if (password.length < 10) {
    return res.status(400).json({ message: "Password must be at least 10 characters." });
  }
  // bcrypt only uses the first 72 bytes, so longer passwords would be silently cut
  if (Buffer.byteLength(password) > 72) {
    return res.status(400).json({ message: "Password is too long (72 bytes maximum)." });
  }
  if (pin.length > 64) {
    return res.status(403).json({ message: "Invalid or already used PIN." });
  }

  const ipBucket = `signup:ip:${clientIp(req)}`;

  let client;
  try {
    if (await tooManyAttempts(ipBucket, MAX_PIN_FAILS_PER_IP)) {
      res.setHeader("Retry-After", "900");
      return res.status(429).json({ message: "Too many attempts. Try again in 15 minutes." });
    }

    client = await pool.connect();
    await client.query("BEGIN");

    // Lock the unclaimed PINs so two people can't claim the same one
    const pins = await client.query(
      "SELECT id, pin_hash, role FROM staff WHERE used_at IS NULL FOR UPDATE"
    );

    let matched = null;
    for (const row of pins.rows) {
      if (await bcrypt.compare(pin.trim(), row.pin_hash)) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      await client.query("ROLLBACK");
      await recordFailure(ipBucket);
      return res.status(403).json({ message: "Invalid or already used PIN." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // The role stays whatever the PIN row says, never the form
    await client.query(
      `UPDATE staff
       SET full_name = $1, email = $2, phone = $3, password_hash = $4, used_at = NOW()
       WHERE id = $5`,
      [cleanName, cleanEmail, cleanPhone, passwordHash, matched.id]
    );

    await client.query("COMMIT");
    return res.status(201).json({ message: "Staff account created." });
  } catch (err) {
    if (client) await client.query("ROLLBACK").catch(() => {});
    if (err.code === "23505") {
      return res.status(409).json({ message: "That email is already registered." });
    }
    console.error("Staff signup error:", err);
    return res.status(500).json({ message: "Database error. Check the terminal for details." });
  } finally {
    if (client) client.release();
  }
}