
import pool from "../../../lib/staffDb";
import { requireStaff } from "../../../lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const staff = requireStaff(req, res);
  if (!staff) return;

  try {
    const result = await pool.query(
      `SELECT id, full_name, email, role
       FROM staff
       WHERE id = $1 AND used_at IS NOT NULL
       LIMIT 1`,
      [staff.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "Staff account not found." });
    }

    const user = result.rows[0];

    return res.status(200).json({
      user: {
        id: user.id,
        name: user.full_name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Get logged-in staff error:", err);
    return res.status(500).json({ message: "Unable to load account details." });
  }
}
