import { pool } from "../../../lib/bookingsDb";
import { requireStaff } from "../../../lib/auth";

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

const SELECT = `
  SELECT
    b.id,
    b.customer_id,
    c.name  AS customer_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    to_char(b.event_date, 'YYYY-MM-DD') AS date,
    b.event_type AS type,
    b.guests,
    b.status,
    b.amount::float AS amount,
    COALESCE(b.notes, '') AS notes,
    b.package_id,
    COALESCE(b.package_name, '') AS package_name
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
`;

function validate(body) {
  const customerId = Number(body.customer_id);
  const date = String(body.date || "");
  const type = String(body.type || "").trim();
  const guests = Number(body.guests);
  const amount = Number(body.amount || 0);
  const status = body.status || "pending";
  const notes = String(body.notes || "").trim();
  const packageId =
    body.package_id === null || body.package_id === "" || body.package_id === undefined
      ? null
      : Number(body.package_id);
  const packageName = String(body.package_name || "").trim().slice(0, 150);

  if (!Number.isInteger(customerId) || customerId <= 0) {
    return { error: "Please choose a customer." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return { error: "Please enter a valid event date." };
  }
  if (!type) {
    return { error: "Please enter the event type." };
  }
  if (!Number.isInteger(guests) || guests < 1) {
    return { error: "Guests must be a whole number of at least 1." };
  }
  if (!Number.isFinite(amount) || amount < 0) {
    return { error: "Please enter a valid, non-negative amount." };
  }
  if (!STATUSES.includes(status)) {
    return { error: "Invalid status." };
  }
  if (packageId !== null && (!Number.isInteger(packageId) || packageId <= 0)) {
    return { error: "Invalid package." };
  }

  return {
    value: {
      customerId,
      date,
      type,
      guests,
      amount,
      status,
      notes,
      packageId,
      packageName: packageId === null ? "" : packageName,
    },
  };
}

export default async function handler(req, res) {
  if (!requireStaff(req, res)) return;

  try {
    if (req.method === "GET") {
      const { rows } = await pool.query(
        `${SELECT} ORDER BY b.event_date ASC, b.id ASC`
      );
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const { error, value } = validate(req.body || {});
      if (error) return res.status(400).json({ message: error });

      const created = await pool.query(
        `INSERT INTO bookings
           (customer_id, event_date, event_type, guests, status, amount, notes,
            package_id, package_name)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          value.customerId,
          value.date,
          value.type,
          value.guests,
          value.status,
          value.amount,
          value.notes || null,
          value.packageId,
          value.packageName || null,
        ]
      );

      const { rows } = await pool.query(`${SELECT} WHERE b.id = $1`, [
        created.rows[0].id,
      ]);
      return res.status(201).json(rows[0]);
    }

    if (req.method === "PUT") {
      const id = Number(req.body?.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Booking id is required." });
      }

      const { error, value } = validate(req.body || {});
      if (error) return res.status(400).json({ message: error });

      const updated = await pool.query(
        `UPDATE bookings
            SET customer_id = $1,
                event_date  = $2,
                event_type  = $3,
                guests      = $4,
                status      = $5,
                amount      = $6,
                notes       = $7,
                package_id  = $8,
                package_name = $9
          WHERE id = $10
          RETURNING id`,
        [
          value.customerId,
          value.date,
          value.type,
          value.guests,
          value.status,
          value.amount,
          value.notes || null,
          value.packageId,
          value.packageName || null,
          id,
        ]
      );

      if (updated.rowCount === 0) {
        return res.status(404).json({ message: "Booking not found." });
      }

      const { rows } = await pool.query(`${SELECT} WHERE b.id = $1`, [id]);
      return res.status(200).json(rows[0]);
    }

    if (req.method === "DELETE") {
      const id = Number(req.query.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Booking id is required." });
      }

      const deleted = await pool.query("DELETE FROM bookings WHERE id = $1", [
        id,
      ]);

      if (deleted.rowCount === 0) {
        return res.status(404).json({ message: "Booking not found." });
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ message: "Method not allowed." });
  } catch (err) {
    if (err.code === "23503") {
      return res
        .status(400)
        .json({ message: "The selected customer does not exist." });
    }
    console.error("bookings API error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
}