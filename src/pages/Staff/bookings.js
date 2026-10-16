import { useState } from "react";
import StaffLayout, { Status } from "../../components/StaffLayout";
import s from "../../styles/StaffLayout.module.css";
import { bookings, customerOf, formatDate } from "../../lib/sampleData";

export default function Bookings() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const rows = bookings.filter((b) => {
    const c = customerOf(b.customerId);
    const text = `${b.id} ${c.name} ${c.email} ${b.type}`.toLowerCase();
    return text.includes(q.trim().toLowerCase()) && (status === "all" || b.status === status);
  });

  return (
    <StaffLayout active="bookings" title="Bookings" subtitle="Manage all your catering bookings">
      <div className={s.end}>
        <button type="button" className={s.btn}>+ New Booking</button>
      </div>

      <div className={s.bar}>
        <input className={s.input} type="search" value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, event type or ID..." aria-label="Search bookings" />
        <select className={s.input} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <div className={`${s.panel} ${s.tablePanel}`}>
        <table className={s.table}>
          <thead>
            <tr>
              <th>Booking ID</th><th>Customer</th><th>Event Date</th><th>Event Type</th><th>Guest</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((b) => {
              const c = customerOf(b.customerId);
              return (
                <tr key={b.id}>
                  <td className={s.id}>#{b.id}</td>
                  <td><b>{c.name}</b><small>{c.email}</small></td>
                  <td>{formatDate(b.date)}</td>
                  <td>{b.type}</td>
                  <td>{b.guests}</td>
                  <td><Status value={b.status} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {rows.length === 0 && <p className={s.empty}>No bookings match your search.</p>}
      </div>
    </StaffLayout>
  );
}