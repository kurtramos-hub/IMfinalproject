import bcrypt from "bcryptjs";
import pool from "../../../lib/staffDb";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { fullName, email, phone, password, pin } = req.body;

  if (!fullName || !email || !phone || !password || !pin || typeof pin !== "string") {
    return res.status(400).json({ message: "Fill in all fields." });
  }
  if (password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters." });
  }

  let client;
  try {
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
      return res.status(403).json({ message: "Invalid or already used PIN." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    // The role stays whatever the PIN row says, never the form
    await client.query(
      `UPDATE staff
       SET full_name = $1, email = $2, phone = $3, password_hash = $4, used_at = NOW()
       WHERE id = $5`,
      [fullName.trim(), email.trim().toLowerCase(), phone.trim(), passwordHash, matched.id]
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