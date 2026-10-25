
import pool from "../../../lib/staffDb";

export default async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const result = await pool.query(`
        SELECT
          mi.id,
          mi.name,
          mi.category_id,
          mi.created_at,
          mi.updated_at,
          mc.name AS category_name
        FROM menu_items mi
        LEFT JOIN menu_categories mc
          ON mc.id = mi.category_id
        ORDER BY mc.name ASC NULLS LAST, mi.name ASC
      `);

      return res.status(200).json(result.rows);
    }

    if (req.method === "POST") {
      const { name, category_id } = req.body;
      const categoryId = Number(category_id);
      const itemName = typeof name === "string" ? name.trim() : "";

      if (!itemName || !Number.isInteger(categoryId) || categoryId < 1) {
        return res.status(400).json({
          message: "Item name and a valid category are required.",
        });
      }

      const result = await pool.query(
        `INSERT INTO menu_items (name, category_id)
         VALUES ($1, $2)
         RETURNING id, name, category_id, created_at, updated_at`,
        [itemName, categoryId]
      );

      return res.status(201).json(result.rows[0]);
    }

    if (req.method === "PUT") {
      const { id, name, category_id } = req.body;
      const itemId = Number(id);
      const categoryId = Number(category_id);
      const itemName = typeof name === "string" ? name.trim() : "";

      if (
        !Number.isInteger(itemId) ||
        itemId < 1 ||
        !itemName ||
        !Number.isInteger(categoryId) ||
        categoryId < 1
      ) {
        return res.status(400).json({
          message: "Valid item ID, item name, and category are required.",
        });
      }

      const result = await pool.query(
        `UPDATE menu_items
         SET name = $1,
             category_id = $2,
             updated_at = NOW()
         WHERE id = $3
         RETURNING id, name, category_id, created_at, updated_at`,
        [itemName, categoryId, itemId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Menu item not found." });
      }

      return res.status(200).json(result.rows[0]);
    }

    if (req.method === "DELETE") {
      const itemId = Number(req.query.id);

      if (!Number.isInteger(itemId) || itemId < 1) {
        return res.status(400).json({
          message: "A valid menu item ID is required.",
        });
      }

      const result = await pool.query(
        "DELETE FROM menu_items WHERE id = $1 RETURNING id",
        [itemId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Menu item not found." });
      }

      return res.status(200).json({
        message: "Menu item deleted successfully.",
      });
    }

    res.setHeader("Allow", ["GET", "POST", "PUT", "DELETE"]);
    return res.status(405).json({ message: "Method not allowed." });
  } catch (error) {
    console.error("Menu API error:", error);

    if (error.code === "23503") {
      return res.status(400).json({
        message: "That category does not exist or is still being used.",
      });
    }

    return res.status(500).json({
      message: "Something went wrong while processing menu items.",
    });
  }
}
