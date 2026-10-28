import pool from "../../../lib/staffDb";
import { requireStaff } from "../../../lib/auth";

export default async function handler(req, res) {
  if (!requireStaff(req, res)) return;

  try {
    if (req.method === "GET") {
      const result = await pool.query(`
        SELECT
          c.id,
          c.name,
          c.created_at,
          c.updated_at,
          COUNT(m.id)::INTEGER AS item_count
        FROM menu_categories c
        LEFT JOIN menu_items m ON m.category_id = c.id
        GROUP BY c.id
        ORDER BY c.name ASC
      `);

      return res.status(200).json(result.rows);
    }

    if (req.method === "POST") {
      const { name } = req.body;

      if (typeof name !== "string" || !name.trim()) {
        return res.status(400).json({
          message: "Category name is required.",
        });
      }

      const result = await pool.query(
        `INSERT INTO menu_categories (name)
         VALUES ($1)
         RETURNING id, name, created_at, updated_at`,
        [name.trim()]
      );

      return res.status(201).json(result.rows[0]);
    }

    if (req.method === "PUT") {
      const { id, name } = req.body;

      if (
        !Number.isInteger(Number(id)) ||
        Number(id) < 1 ||
        typeof name !== "string" ||
        !name.trim()
      ) {
        return res.status(400).json({
          message: "A valid category ID and name are required.",
        });
      }

      const result = await pool.query(
        `UPDATE menu_categories
         SET name = $1, updated_at = NOW()
         WHERE id = $2
         RETURNING id, name, created_at, updated_at`,
        [name.trim(), Number(id)]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          message: "Category not found.",
        });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);

      if (!Number.isInteger(id) || id < 1) {
        return res.status(400).json({
          message: "A valid category ID is required.",
        });
      }

      const result = await pool.query(
        `DELETE FROM menu_categories
         WHERE id = $1
         RETURNING id`,
        [id]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          message: "Category not found.",
        });
      }

      return res.status(200).json({
        message: "Category deleted successfully.",
      });
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).json({
      message: "Method not allowed.",
    });
  } catch (error) {
    console.error("Categories API error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "That category name already exists.",
      });
    }

    if (error.code === "23503") {
      return res.status(409).json({
        message: "This category still has menu items. Move or delete them first.",
      });
    }

    return res.status(500).json({
      message: "Something went wrong with categories.",
    });
  }
}