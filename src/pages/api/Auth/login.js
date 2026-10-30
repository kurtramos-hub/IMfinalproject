import bcrypt from "bcryptjs";
import { sql } from "../../../lib/db";
import { signCustomerToken, setCustomerCookie } from "../../../lib/customerAuth";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body || {};

  if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    const rows = await sql`
      SELECT id, full_name AS name, email, password_hash FROM users
      WHERE email = ${email.trim().toLowerCase()}
    `;
    const user = rows[0];

    const valid = user && (await bcrypt.compare(password, user.password_hash));
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    setCustomerCookie(res, signCustomerToken(user));

    return res.status(200).json({ user: { id: user.id, name: user.name, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Something went wrong" });
  }
}