
import pool from "../../../lib/staffDb";
import { requireStaff } from "../../../lib/auth";


export default async function handler(req, res) {
  try {
    const staff = requireStaff(req, res);
    if (!staff) return;

    if (req.method === "GET") {
      const result = await pool.query(
        "SELECT * FROM catering_packages ORDER BY id ASC"
      );

      return res.status(200).json(result.rows);
    }

    if (req.method === "POST") {
      const { name, price, items } = req.body;

      if (
        !name?.trim() ||
        price === "" ||
        price === undefined ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0 ||
        !Array.isArray(items)
      ) {
        return res.status(400).json({
          message: "Please provide a valid name, price, and items.",
        });
      }

      const result = await pool.query(
        `INSERT INTO catering_packages (name, price, items)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [name.trim(), Number(price), items]
      );

      return res.status(201).json(result.rows[0]);
    }

    if (req.method === "PUT") {
      const { id, name, price, items } = req.body;

      if (
        !Number.isInteger(Number(id)) ||
        Number(id) < 1 ||
        !name?.trim() ||
        price === "" ||
        price === undefined ||
        !Number.isFinite(Number(price)) ||
        Number(price) < 0 ||
        !Array.isArray(items)
      ) {
        return res.status(400).json({
          message: "Please provide a valid ID, name, price, and items.",
        });
      }

      const result = await pool.query(
        `UPDATE catering_packages
         SET name = $1, price = $2, items = $3, updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [name.trim(), Number(price), items, Number(id)]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Package not found." });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);

      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({ message: "A valid package ID is required." });
      }

      const result = await pool.query(
        "DELETE FROM catering_packages WHERE id = $1 RETURNING id",
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Package not found." });
      }

      return res.status(200).json({ message: "Package deleted successfully." });
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).json({ message: "Method not allowed." });
  } catch (error) {
    console.error("Packages API error:", error);
    return res.status(500).json({ message: "Something went wrong with packages." });
  }
}
