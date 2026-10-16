import bcrypt from "bcryptjs";
import pool from "../../../lib/staffDb";
import { signStaffToken, setStaffCookie } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Enter your email and password." });
  }

  try {
    const result = await pool.query(
  "SELECT id, full_name, email, password_hash, role FROM staff WHERE email = $1 AND used_at IS NOT NULL",
  [email.trim().toLowerCase()]
);

    const user = result.rows[0];
    const valid = user && (await bcrypt.compare(password, user.password_hash));

    if (!valid) {
      return res.status(401).json({ message: "Wrong email or password." });
    }

    setStaffCookie(res, signStaffToken(user));
    return res.status(200).json({
      message: "Logged in.",
      user: { id: user.id, fullName: user.full_name, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Something went wrong. Try again." });
  }
}