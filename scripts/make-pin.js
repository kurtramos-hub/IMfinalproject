// Creates a one-time staff PIN and saves it (hashed) in the database.
// Usage:
//   node --env-file=.env.local scripts/make-pin.js employee
//   node --env-file=.env.local scripts/make-pin.js admin
//   node --env-file=.env.local scripts/make-pin.js employee MY-OWN-PIN   (your own PIN)
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

async function main() {
  const role = process.argv[2];
  if (!["admin", "employee"].includes(role)) {
    console.log("Usage: node --env-file=.env.local scripts/make-pin.js <admin|employee> [custom-pin]");
    process.exit(1);
  }

  const pin = process.argv[3] || crypto.randomBytes(4).toString("hex").toUpperCase();
  if (pin.length < 6) {
    console.log("PIN must be at least 6 characters.");
    process.exit(1);
  }

  const pinHash = await bcrypt.hash(pin, 10);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  await pool.query("INSERT INTO staff (pin_hash, role) VALUES ($1, $2)", [pinHash, role]);
  await pool.end();

  console.log(`New ${role} PIN: ${pin}`);
  console.log("Give it to the person. It works once, then it is used up.");
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});