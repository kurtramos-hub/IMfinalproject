import { pool, requireStaff } from "../../../lib/bookingsDb";

const SELECT = `
  SELECT
    c.id,
    c.name,
    COALESCE(c.email, '')   AS email,
    COALESCE(c.phone, '')   AS phone,
    COALESCE(c.address, '') AS address,
    COUNT(b.id)::int        AS total_bookings,
    to_char(MAX(b.event_date), 'YYYY-MM-DD') AS last_booking
  FROM customers c
  LEFT JOIN bookings b ON b.customer_id = c.id
`;

const GROUP = "GROUP BY c.id";

function validate(body) {
  const name = String(body.name || "").trim();
  const email = String(body.email || "").trim();
  const phone = String(body.phone || "").trim();
  const address = String(body.address || "").trim();

  if (!name) return { error: "Customer name is required." };
  if (name.length > 120) return { error: "Name is too long." };
  if (email && !/^\S+@\S+\.\S+$/.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  return { value: { name, email, phone, address } };
}

async function getOne(id) {
  const { rows } = await pool.query(`${SELECT} WHERE c.id = $1 ${GROUP}`, [id]);
  return rows[0];
}

export default async function handler(req, res) {
  if (!requireStaff(req, res)) return;

  try {
    if (req.method === "GET") {
      const { rows } = await pool.query(
        `${SELECT} ${GROUP} ORDER BY c.name ASC`
      );
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const { error, value } = validate(req.body || {});
      if (error) return res.status(400).json({ message: error });

      const created = await pool.query(
        `INSERT INTO customers (name, email, phone, address)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [value.name, value.email || null, value.phone || null, value.address || null]
      );

      return res.status(201).json(await getOne(created.rows[0].id));
    }

    if (req.method === "PUT") {
      const id = Number(req.body?.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Customer id is required." });
      }

      const { error, value } = validate(req.body || {});
      if (error) return res.status(400).json({ message: error });

      const updated = await pool.query(
        `UPDATE customers
            SET name = $1, email = $2, phone = $3, address = $4
          WHERE id = $5
          RETURNING id`,
        [value.name, value.email || null, value.phone || null, value.address || null, id]
      );

      if (updated.rowCount === 0) {
        return res.status(404).json({ message: "Customer not found." });
      }

      return res.status(200).json(await getOne(id));
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Customer id is required." });
      }

      const deleted = await pool.query("DELETE FROM customers WHERE id = $1", [id]);

      if (deleted.rowCount === 0) {
        return res.status(404).json({ message: "Customer not found." });
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ message: "Method not allowed." });
  } catch (err) {
    // bookings.customer_id uses ON DELETE RESTRICT
    if (err.code === "23503") {
      return res.status(409).json({
        message:
          "This customer still has bookings. Delete those bookings first.",
      });
    }

    console.error("customers API error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
}