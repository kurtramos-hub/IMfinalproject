import { Fragment, useMemo, useRef, useState } from "react";
import StaffLayout from "../../components/StaffLayout";
import BookingForm from "../../components/Bookingform";
import s from "../../styles/StaffLayout.module.css";
import useBookings from "../../lib/useBookings";
import { STATUSES, formatDate, formatTime, money } from "../../lib/bookingsClient";

const dateOf = (b) => String(b?.date || "");

const SORTS = {
  soonest: { label: "Event date: soonest first", fn: (a, b) => dateOf(a).localeCompare(dateOf(b)) || a.id - b.id },
  latest: { label: "Event date: latest first", fn: (a, b) => dateOf(b).localeCompare(dateOf(a)) || b.id - a.id },
  newest: { label: "Recently added", fn: (a, b) => b.id - a.id },
  amount: { label: "Amount: high to low", fn: (a, b) => b.amount - a.amount },
};
const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);

export default function Bookings() {
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

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState("soonest");
  const [expandedId, setExpandedId] = useState(null);

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
    if (!ok) return;
    if (editing?.id === booking.id) closeForm();
    if (expandedId === booking.id) setExpandedId(null);
  }

  const filtersActive = q || status !== "all" || from || to;

  function clearFilters() {
    setQ("");
    setStatus("all");
    setFrom("");
    setTo("");
  }

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();

    return bookings
      .filter((b) => {
        const text = `${b.id} ${b.customer_name} ${b.customer_email || ""} ${b.type}`.toLowerCase();

        return (
          text.includes(term) &&
          (status === "all" || b.status === status) &&
          (!from || b.date >= from) &&
          (!to || b.date <= to)
        );
      })
      .sort(SORTS[sort].fn);
  }, [bookings, q, status, from, to, sort]);

  return (
    <StaffLayout
      active="bookings"
      title="Bookings"
      subtitle="Manage all your catering bookings"
    >
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

      {!formOpen && (
        <div className={s.end}>
          <button type="button" className={s.btn} onClick={() => openForm()}>
            + New Booking
          </button>
        </div>
      )}

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

      <div className={s.bar}>
        <input
          className={s.input}
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, event type or ID..."
          aria-label="Search bookings"
        />

        <select
          className={s.input}
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          aria-label="Filter by status"
        >
          <option value="all">All Status</option>
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {cap(st)}
            </option>
          ))}
        </select>
      </div>

      <div className={s.filterRow}>
        <div className={s.filterField}>
          <label className={s.formLabel} htmlFor="filterFrom">
            From
          </label>
          <input
            id="filterFrom"
            className={s.input}
            type="date"
            value={from}
            max={to || undefined}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>

        <div className={s.filterField}>
          <label className={s.formLabel} htmlFor="filterTo">
            To
          </label>
          <input
            id="filterTo"
            className={s.input}
            type="date"
            value={to}
            min={from || undefined}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>

        <div className={s.filterField}>
          <label className={s.formLabel} htmlFor="sortBy">
            Sort by
          </label>
          <select
            id="sortBy"
            className={`${s.input} ${s.sortSelect}`}
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {Object.entries(SORTS).map(([key, { label }]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {filtersActive && (
          <button type="button" className={s.secondaryBtn} onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {!loading && bookings.length > 0 && (
        <p className={`${s.muted} ${s.resultCount}`}>
          Showing {rows.length} of {bookings.length} booking
          {bookings.length === 1 ? "" : "s"}
        </p>
      )}

      <div className={`${s.panel} ${s.tablePanel}`}>
        {loading ? (
          <p className={s.empty}>Loading bookings...</p>
        ) : (
          <>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Booking ID</th>
                  <th>Customer</th>
                  <th>Event Date</th>
                  <th>Event Type</th>
                  <th>Guest</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {rows.map((b) => {
                  const open = expandedId === b.id;

                  return (
                    <Fragment key={b.id}>
                      <tr className={open ? s.rowOpen : undefined}>
                        <td>
                          <button
                            type="button"
                            className={s.idToggle}
                            aria-expanded={open}
                            aria-label={`${open ? "Hide" : "Show"} details of booking ${b.id}`}
                            onClick={() => setExpandedId(open ? null : b.id)}
                          >
                            #{b.id} <span aria-hidden="true">{open ? "▴" : "▾"}</span>
                          </button>
                        </td>
                        <td>
                          <b>{b.customer_name}</b>
                          <small>{b.customer_email}</small>
                        </td>
                        <td>{formatDate(b.date)}</td>
                        <td>
                          {b.type}
                          {b.package_name && <small>{b.package_name}</small>}
                        </td>
                        <td>{b.guests}</td>
                        <td className={s.amountCell}>{money(b.amount)}</td>
                        <td>
                          <select
                            className={`${s.statusSelect} ${s[b.status]}`}
                            value={b.status}
                            onChange={(e) => changeStatus(b, e.target.value)}
                            aria-label={`Status of booking ${b.id}`}
                          >
                            {STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {cap(st)}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div className={s.rowActions}>
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
                        </td>
                      </tr>

                      {open && (
                        <tr className={s.detailRow}>
                          <td colSpan={8}>
                            <dl className={s.detailGrid}>
                              <div>
                                <dt>Email</dt>
                                <dd>{b.customer_email || "—"}</dd>
                              </div>
                              <div>
                                <dt>Phone</dt>
                                <dd>{b.customer_phone || "—"}</dd>
                              </div>
                              <div>
                                <dt>Package</dt>
                                <dd>{b.package_name || "No package"}</dd>
                              </div>
                              <div>
                                <dt>Event date</dt>
                                <dd>{formatDate(b.date, "long")}</dd>
                              </div>
                              <div className={s.detailNotes}>
                                <dt>Notes</dt>
                                <dd>{b.notes || "No notes."}</dd>
                              </div>
                            </dl>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>

            {rows.length === 0 && (
              <p className={s.empty}>
                {bookings.length === 0
                  ? "No bookings yet. Click + New Booking to add one."
                  : "No bookings match your filters."}
              </p>
            )}
          </>
        )}
      </div>
    </StaffLayout>
  );
}