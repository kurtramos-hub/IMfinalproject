import { useRef, useState } from "react";
import Link from "next/link";
import { Icon, Status } from "../../components/StaffLayout";
import BookingForm from "../../components/BookingForm";
import s from "../../styles/StaffLayout.module.css";
import useBookings from "../../lib/useBookings";
import { STATUSES, dateParts, money } from "../../lib/bookingsClient";

export default function Dashboard() {
  const {
    bookings,
    customers,
    packages,
    loading,
    saving,
    error,
    notice,
    setError,
    setNotice,
    saveBooking,
    removeBooking,
    changeStatus,
    createCustomer,
  } = useBookings();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const formRef = useRef(null);

  function openForm(booking = null) {
    setEditing(booking);
    setFormOpen(true);
    setError("");
    setNotice("");
    setTimeout(
      () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }),
      50
    );
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  async function handleSave(payload, id) {
    const ok = await saveBooking(payload, id);
    if (ok) closeForm();
  }

  async function handleDelete(booking) {
    const ok = await removeBooking(booking);
    if (ok && editing?.id === booking.id) closeForm();
  }

  const count = (status) => bookings.filter((b) => b.status === status).length;
  const active = bookings.filter((b) => b.status !== "cancelled");
  const revenue = bookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + Number(b.amount || 0), 0);

  const stats = [
    { icon: "clock", label: "Pending", value: count("pending"), hint: "Waiting for confirmation" },
    { icon: "days", label: "Total bookings", value: active.length, hint: "Not including cancelled" },
    { icon: "check", label: "Confirmed", value: count("confirmed"), hint: "Ready to be served" },
    { icon: "dollar", label: "Total revenue", value: money(revenue), hint: "Confirmed and completed", main: true },
  ];

  const upcomingAll = bookings
    .filter((b) => b.status === "pending" || b.status === "confirmed")
    .sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = upcomingAll.slice(0, 4);

  return (
    <>
      {error && (
        <div className={s.messageError} role="alert">
          {error}
        </div>
      )}

      {notice && (
        <div className={s.messageSuccess} role="status">
          {notice}
        </div>
      )}

      {loading ? (
        <p className={s.empty}>Loading dashboard...</p>
      ) : (
        <>
          <section className={s.dashStats} aria-label="Summary">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className={`${s.dashStat} ${stat.main ? s.dashStatMain : ""}`}
              >
                <span className={s.dashStatIcon}>
                  <Icon name={stat.icon} size={20} />
                </span>

                <div className={s.dashStatBody}>
                  <b>{stat.value}</b>
                  <span>{stat.label}</span>
                  <small>{stat.hint}</small>
                </div>
              </div>
            ))}
          </section>

          {formOpen && (
            <div ref={formRef}>
              <BookingForm
                key={editing?.id ?? "new"}
                booking={editing}
                customers={customers}
                packages={packages}
                saving={saving}
                onSave={handleSave}
                onCancel={closeForm}
                onCreateCustomer={createCustomer}
              />
            </div>
          )}

          <div className={s.dashGrid}>
            <section className={s.panel} aria-label="Upcoming bookings">
              <div className={s.panelHead}>
                <h2>Upcoming bookings</h2>

                <div className={s.panelHeadActions}>
                  {!formOpen && (
                    <button
                      type="button"
                      className={s.smallBtn}
                      onClick={() => openForm()}
                    >
                      + New booking
                    </button>
                  )}

                  <Link href="/Staff/bookings" className={s.link}>
                    View all
                  </Link>
                </div>
              </div>

              {upcoming.length === 0 ? (
                <p className={s.empty}>
                  No upcoming bookings yet. Click + New booking to add one.
                </p>
              ) : (
                <ul className={s.list}>
                  {upcoming.map((b) => {
                    const d = dateParts(b.date);

                    return (
                      <li key={b.id} className={s.dashRow}>
                        <div className={s.dashDate} title={d.full}>
                          <b>{d.day}</b>
                          <small>{d.month}</small>
                        </div>

                        <div className={s.dashInfo}>
                          <b>{b.customer_name}</b>
                          <span className={s.muted}>
                            {b.type} &bull; {b.guests} guests
                          </span>
                        </div>

                        <div className={s.dashRight}>
                          <span className={s.dashAmount}>{money(b.amount)}</span>
                          <Status value={b.status} />
                        </div>

                        <div className={s.dashActions}>
                          <select
                            className={s.statusSelect}
                            value={b.status}
                            onChange={(e) => changeStatus(b, e.target.value)}
                            aria-label={`Change status of booking ${b.id}`}
                          >
                            {STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            className={s.smallBtn}
                            onClick={() => openForm(b)}
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            className={s.deleteBtn}
                            onClick={() => handleDelete(b)}
                          >
                            Delete
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {upcomingAll.length > upcoming.length && (
                <p className={`${s.muted} ${s.dashMore}`}>
                  Showing {upcoming.length} of {upcomingAll.length} upcoming bookings.
                </p>
              )}
            </section>

            <section className={s.panel} aria-label="Bookings by status">
              <div className={s.panelHead}>
                <h2>Bookings by status</h2>
              </div>

              <ul className={s.dashBreak}>
                {STATUSES.map((status) => {
                  const n = count(status);
                  const pct = bookings.length ? (n / bookings.length) * 100 : 0;

                  return (
                    <li key={status}>
                      <div className={s.dashBreakTop}>
                        <span className={s.dashBreakName}>{status}</span>
                        <b>{n}</b>
                      </div>

                      <div className={s.dashTrack}>
                        <div
                          className={`${s.dashFill} ${s[`fill_${status}`]}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </>
      )}
    </>
  );
}

// Picked up by _app.js, which renders the persistent sidebar around this page
Dashboard.layout = {
  active: "dashboard",
  title: "Dashboard",
  subtitle: "Welcome back! Here's an overview of your catering business.",
};