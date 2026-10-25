import Link from "next/link";
import { Icon, Status } from "../../components/StaffLayout";
import s from "../../styles/StaffLayout.module.css";

const CURRENCY = "₱";
const money = (n) => `${CURRENCY}${n.toLocaleString("en-US")}`;

const customers = [
  { id: 1, name: "John Smith" },
  { id: 2, name: "Sarah Johnson" },
  { id: 3, name: "Michael Brown" },
];

const bookings = [
  { id: 1, customerId: 3, date: "2026-04-10", type: "Birthday Party", guests: 50, status: "pending", amount: 19000 },
  { id: 2, customerId: 1, date: "2026-04-15", type: "Wedding", guests: 150, status: "confirmed", amount: 63000 },
  { id: 3, customerId: 2, date: "2026-04-20", type: "Corporate Event", guests: 80, status: "confirmed", amount: 33600 },
  { id: 4, customerId: 2, date: "2026-04-02", type: "Anniversary Dinner", guests: 40, status: "completed", amount: 15200 },
];

const customerOf = (id) => customers.find((c) => c.id === id);

function formatDate(iso, month = "short") {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month, day: "numeric", year: "numeric" });
}

export default function Dashboard() {
  const count = (status) => bookings.filter((b) => b.status === status).length;
  const revenue = bookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + b.amount, 0);

  const stats = [
    ["clock", "Pending", count("pending")],
    ["days", "Total Bookings", bookings.filter((b) => b.status !== "cancelled").length],
    ["check", "Confirmed", count("confirmed")],
    ["dollar", "Total Revenue", money(revenue)],
  ];

  const upcoming = bookings
    .filter((b) => b.status === "pending" || b.status === "confirmed")
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  return (
    <>
      <section className={s.stats} aria-label="Summary">
        {stats.map(([icon, label, value]) => (
          <div key={label} className={s.stat}>
            <Icon name={icon} size={20} />
            <b>{value}</b>
            <small>{label}</small>
          </div>
        ))}
      </section>

      <section className={`${s.panel} ${s.narrow}`} style={{ minHeight: 380 }}>
        <div className={s.panelHead}>
          <h2>Upcoming Bookings</h2>
          <Link href="/Staff/bookings" className={s.link} style={{ textDecoration: "none" }}>View All</Link>
        </div>

        {upcoming.length === 0 ? (
          <p className={s.empty}>No upcoming bookings yet.</p>
        ) : (
          <ul className={s.list}>
            {upcoming.map((b) => (
              <li key={b.id} className={s.row}>
                <div>
                  <b>{customerOf(b.customerId).name}</b>
                  <span className={s.muted}>{b.type} &bull; {b.guests} guests</span>
                </div>
                <div className={s.right}>
                  <span>{formatDate(b.date, "long")}</span>
                  <Status value={b.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

// Picked up by _app.js, which renders the persistent sidebar around this page
Dashboard.layout = {
  active: "dashboard",
  title: "Dashboard",
  subtitle: "Welcome back! Here's an overview of your catering business.",
};