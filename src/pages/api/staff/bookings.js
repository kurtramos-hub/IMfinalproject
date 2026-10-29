import { pool } from "../../../lib/bookingsDb";
import { requireStaff } from "../../../lib/auth";

const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

// Two active bookings must start at least this many hours apart
const MIN_GAP_HOURS = 5;

const SELECT = `
  SELECT
    b.id,
    b.customer_id,
    c.name  AS customer_name,
    c.email AS customer_email,
    c.phone AS customer_phone,
    to_char(b.event_date, 'YYYY-MM-DD') AS date,
    to_char(b.event_time, 'HH24:MI') AS time,
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

class SlotError extends Error {}
class InputError extends Error {}

function to12h(time) {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

function validate(body, requirePackage = false) {
  const customerId = Number(body.customer_id);
  const date = String(body.date || "");
  const time = body.time ? String(body.time).slice(0, 5) : "";
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
  if (time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return { error: "Please enter a valid start time." };
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
  if (requirePackage && packageId === null) {
    return { error: "Please choose a catering package." };
  }

  return {
    value: {
      customerId,
      date,
      time,
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

// Runs `work` in a transaction. The advisory lock makes sure two people saving
// at the same moment can't both grab the same time slot.
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

// The closest active booking that starts less than MIN_GAP_HOURS from this time
async function findConflict(client, date, time, ignoreId) {
  const { rows } = await client.query(
    `SELECT b.id, c.name AS customer_name, to_char(b.event_time, 'HH24:MI') AS time
       FROM bookings b
       JOIN customers c ON c.id = b.customer_id
      WHERE b.status <> 'cancelled'
        AND b.id <> $3
        AND ABS(EXTRACT(EPOCH FROM ((b.event_date + b.event_time) - ($1::date + $2::time))))
            < ($4::int * 3600)
      ORDER BY ABS(EXTRACT(EPOCH FROM ((b.event_date + b.event_time) - ($1::date + $2::time)))) ASC
      LIMIT 1`,
    [date, time, ignoreId, MIN_GAP_HOURS]
  );
  return rows[0] || null;
}

function slotError(clash) {
  return new SlotError(
    `That time is too close to booking #${clash.id} (${clash.customer_name} at ${to12h(clash.time)}). ` +
      `Bookings need to start at least ${MIN_GAP_HOURS} hours apart.`
  );
}

export default async function handler(req, res) {
  if (!requireStaff(req, res)) return;

  try {
    if (req.method === "GET") {
      const { rows } = await pool.query(
        `${SELECT} ORDER BY b.event_date ASC, b.event_time ASC, b.id ASC`
      );
      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      // A new booking must have a catering package
      const { error, value } = validate(req.body || {}, true);
      if (error) return res.status(400).json({ message: error });
      if (!value.time) {
        return res.status(400).json({ message: "Please choose a start time." });
      }

      const newId = await withLock(async (client) => {
        if (value.status !== "cancelled") {
          const clash = await findConflict(client, value.date, value.time, 0);
          if (clash) throw slotError(clash);
        }

        const created = await client.query(
          `INSERT INTO bookings
             (customer_id, event_date, event_time, event_type, guests, status, amount,
              notes, package_id, package_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            value.customerId,
            value.date,
            value.time,
            value.type,
            value.guests,
            value.status,
            value.amount,
            value.notes || null,
            value.packageId,
            value.packageName || null,
          ]
        );
        return created.rows[0].id;
      });

      const { rows } = await pool.query(`${SELECT} WHERE b.id = $1`, [newId]);
      return res.status(201).json(rows[0]);
    }

    if (req.method === "PUT") {
      const id = Number(req.body?.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ message: "Booking id is required." });
      }

      const { error, value } = validate(req.body || {});
      if (error) return res.status(400).json({ message: error });

      const found = await withLock(async (client) => {
        const current = await client.query(
          `SELECT to_char(event_date, 'YYYY-MM-DD') AS date,
                  to_char(event_time, 'HH24:MI') AS time,
                  status,
                  package_id
             FROM bookings WHERE id = $1`,
          [id]
        );
        if (current.rowCount === 0) return false;

        const old = current.rows[0];

        // A booking that has a package can't lose it. Older bookings made before
        // this rule can stay without one (so their status can still be changed).
        if (value.packageId === null && old.package_id !== null) {
          throw new InputError("Please choose a catering package.");
        }

        const time = value.time || old.time; // a status-only change keeps the old time

        // Only check when the slot actually changes, so old bookings that already
        // overlap can still have their status changed
        const slotChanged =
          old.date !== value.date || old.time !== time || old.status === "cancelled";

        if (value.status !== "cancelled" && slotChanged) {
          const clash = await findConflict(client, value.date, time, id);
          if (clash) throw slotError(clash);
        }

        await client.query(
          `UPDATE bookings
              SET customer_id  = $1,
                  event_date   = $2,
                  event_time   = $3,
                  event_type   = $4,
                  guests       = $5,
                  status       = $6,
                  amount       = $7,
                  notes        = $8,
                  package_id   = $9,
                  package_name = $10
            WHERE id = $11`,
          [
            value.customerId,
            value.date,
            time,
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
        return true;
      });

      if (!found) {
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

      const result = await withLock(async (client) => {
        const current = await client.query(
          "SELECT status, customer_id FROM bookings WHERE id = $1 FOR UPDATE",
          [id]
        );
        if (current.rowCount === 0) return null;

        // Active bookings can't be deleted
        if (["pending", "confirmed"].includes(current.rows[0].status)) {
          throw new InputError(
            "Pending and confirmed bookings can't be deleted. Mark it as cancelled or completed first."
          );
        }

        await client.query("DELETE FROM bookings WHERE id = $1", [id]);

        // Remove the customer too, but only if this was their last booking
        const removed = await client.query(
          `DELETE FROM customers c
            WHERE c.id = $1
              AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.customer_id = c.id)
            RETURNING c.id`,
          [current.rows[0].customer_id]
        );

        return { customerDeleted: removed.rowCount > 0 };
      });

      if (!result) {
        return res.status(404).json({ message: "Booking not found." });
      }

      return res.status(200).json({ ok: true, customerDeleted: result.customerDeleted });
    }

    res.setHeader("Allow", "GET, POST, PUT, DELETE");
    return res.status(405).json({ message: "Method not allowed." });
  } catch (err) {
    if (err instanceof SlotError) {
      return res.status(409).json({ message: err.message });
    }
    if (err instanceof InputError) {
      return res.status(400).json({ message: err.message });
    }
    if (err.code === "23503") {
      const isPackage = String(err.constraint || "").includes("package");
      return res.status(400).json({
        message: isPackage
          ? "The selected package does not exist."
          : "The selected customer does not exist.",
      });
    }
    console.error("bookings API error:", err);
    return res.status(500).json({ message: "Server error. Please try again." });
  }
}