import bcrypt from "bcryptjs";
import { sql } from "../../../lib/db";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fullName, email, phone, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "Name, email and password are required" });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters" });
  }

  try {
    const cleanEmail = email.trim().toLowerCase();

    const existing = await sql`SELECT id FROM users WHERE email = ${cleanEmail}`;
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const rows = await sql`
  INSERT INTO users (full_name, email, phone, password_hash)
  VALUES (${fullName.trim()}, ${cleanEmail}, ${phone || null}, ${passwordHash})
  RETURNING id, full_name AS name, email, phone
`;

    return res.status(201).json({ user: rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}