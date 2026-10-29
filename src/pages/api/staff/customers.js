import { pool } from "../../../lib/bookingsDb";
import { requireStaff } from "../../../lib/auth";

class BlockedError extends Error {}

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

// Same lock the bookings API uses, so a delete and a new booking can't collide
async function withLock(work) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(7001)");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
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

      const result = await withLock(async (client) => {
        const customer = await client.query(
          "SELECT id FROM customers WHERE id = $1 FOR UPDATE",
          [id]
        );
        if (customer.rowCount === 0) return null;

        // Active bookings block the delete
        const active = await client.query(
          `SELECT COUNT(*)::int AS n
             FROM bookings
            WHERE customer_id = $1 AND status IN ('pending', 'confirmed')`,
          [id]
        );
        if (active.rows[0].n > 0) {
          const n = active.rows[0].n;
          throw new BlockedError(
            `This customer has pending or confirmed booking${n === 1 ? "" : "s"}. ` +
              "Mark them as cancelled or completed first."
          );
        }

        // Remove their finished bookings, then the customer
        const removed = await client.query(
          "DELETE FROM bookings WHERE customer_id = $1",
          [id]
        );
        await client.query("DELETE FROM customers WHERE id = $1", [id]);

        return { deletedBookings: removed.rowCount };
      });

      if (!result) {
        return res.status(404).json({ message: "Customer not found." });
      }

      return res.status(200).json({ ok: true, deletedBookings: result.deletedBookings });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ message: "Method not allowed." });
  } catch (err) {
    if (err instanceof BlockedError) {
      return res.status(409).json({ message: err.message });
    }

    // 23503 / 23001: the database refused because bookings still reference the customer
    if (err.code === "23503" || err.code === "23001") {
      return res.status(409).json({
        message:
          "This customer still has bookings. Delete those bookings first.",
      });
    }

    console.error("customers API error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
}