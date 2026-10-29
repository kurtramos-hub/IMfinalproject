import { useState } from "react";
import s from "../styles/StaffLayout.module.css";
import { BOOKING_TYPES, STATUSES, money } from "../lib/bookingsClient";

// Shown in the hint under the time field. The server enforces the real rule
// (MIN_GAP_HOURS in api/staff/bookings.js), so change both together.
const MIN_GAP_HOURS = 5;

const emptyForm = {
  customer_id: "",
  package_id: "",
  date: "",
  time: "",
  type: "",
  guests: "",
  amount: "",
  status: "pending",
  notes: "",
};

const emptyCustomer = { name: "", email: "", phone: "" };

// Use with a key so it resets when switching booking:
// <BookingForm key={editing?.id ?? "new"} booking={editing} ... />
export default function BookingForm({
  booking,
  customers,
  packages = [],
  saving,
  serverError = "",
  onSave,
  onCancel,
  onCreateCustomer,
}) {
  const [form, setForm] = useState(() =>
    booking
      ? {
          customer_id: String(booking.customer_id),
          package_id: booking.package_id ? String(booking.package_id) : "",
          date: booking.date,
          time: booking.time || "",
          type: booking.type,
          guests: String(booking.guests),
          amount: String(booking.amount ?? ""),
          status: booking.status,
          notes: booking.notes || "",
        }
      : emptyForm
  );
  const [newCustomer, setNewCustomer] = useState(emptyCustomer);
  // When editing, the saved amount is kept; a hint offers the computed amount instead
  const [amountTouched, setAmountTouched] = useState(Boolean(booking));
  const [error, setError] = useState("");

  const addingCustomer = form.customer_id === "new";
  const idPrefix = booking ? `edit-${booking.id}` : "new";

  const selectedPackage = packages.find(
    (p) => String(p.id) === form.package_id
  );
  // The package was removed from the menu after this booking was made
  const missingPackage =
    form.package_id && !selectedPackage && booking?.package_name;

  const guestsNumber = Number(form.guests);
  const computed =
    selectedPackage && Number.isInteger(guestsNumber) && guestsNumber > 0
      ? Number(selectedPackage.price) * guestsNumber
      : null;

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const setCustomerField = (field) => (e) =>
    setNewCustomer((prev) => ({ ...prev, [field]: e.target.value }));

  function amountFor(packageId, guests) {
    const pkg = packages.find((p) => String(p.id) === packageId);
    const g = Number(guests);

    if (!pkg || !Number.isInteger(g) || g < 1) return null;
    return String(Number(pkg.price) * g);
  }

  // Package or guests changed: recompute the amount unless it was typed by hand
  function changePackage(e) {
    const packageId = e.target.value;

    setForm((prev) => {
      const next = { ...prev, package_id: packageId };
      const auto = amountFor(packageId, prev.guests);

      if (!amountTouched && auto !== null) next.amount = auto;
      return next;
    });
  }

  function changeGuests(e) {
    const guests = e.target.value;

    setForm((prev) => {
      const next = { ...prev, guests };
      const auto = amountFor(prev.package_id, guests);

      if (!amountTouched && auto !== null) next.amount = auto;
      return next;
    });
  }

  function changeAmount(e) {
    setAmountTouched(true);
    setForm((prev) => ({ ...prev, amount: e.target.value }));
  }

  function useComputedAmount() {
    if (computed === null) return;
    setAmountTouched(false);
    setForm((prev) => ({ ...prev, amount: String(computed) }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (addingCustomer && !newCustomer.name.trim()) {
      setError("Please enter the customer's name.");
      return;
    }

    if (!addingCustomer && !form.customer_id) {
      setError("Please choose a customer.");
      return;
    }

    if (!form.date) {
      setError("Please choose the event date.");
      return;
    }

    if (!form.time) {
      setError("Please choose the event start time.");
      return;
    }

    if (!form.type.trim()) {
      setError("Please enter the event type.");
      return;
    }

    const guests = Number(form.guests);
    if (!Number.isInteger(guests) || guests < 1) {
      setError("Guests must be a whole number of at least 1.");
      return;
    }

    const amount = Number(form.amount || 0);
    if (!Number.isFinite(amount) || amount < 0) {
      setError("Please enter a valid, non-negative amount.");
      return;
    }

    let customerId = Number(form.customer_id);

    if (addingCustomer) {
      const created = await onCreateCustomer({
        name: newCustomer.name.trim(),
        email: newCustomer.email.trim(),
        phone: newCustomer.phone.trim(),
      });

      if (!created) return;

      // If the booking fails to save, retrying will not create a duplicate customer.
      customerId = created.id;
      setForm((prev) => ({ ...prev, customer_id: String(created.id) }));
      setNewCustomer(emptyCustomer);
    }

    await onSave(
      {
        customer_id: customerId,
        package_id: form.package_id ? Number(form.package_id) : null,
        package_name: form.package_id
          ? selectedPackage?.name || booking?.package_name || ""
          : "",
        date: form.date,
        time: form.time,
        type: form.type.trim(),
        guests,
        amount,
        status: form.status,
        notes: form.notes.trim(),
      },
      booking?.id
    );
  }

  return (
    <form className={s.formCard} onSubmit={submit}>
      <h3>{booking ? `Edit booking #${booking.id}` : "New booking"}</h3>

      {(error || serverError) && (
        <div className={s.messageError} role="alert">
          {error || serverError}
        </div>
      )}

      <div className={s.formGrid3}>
        <div className={s.formField}>
          <label className={s.formLabel} htmlFor={`${idPrefix}-customer`}>
            Customer
          </label>

          <select
            id={`${idPrefix}-customer`}
            className={s.input}
            value={form.customer_id}
            onChange={setField("customer_id")}
          >
            <option value="">Select a customer</option>
            <option value="new">+ New customer</option>

            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className={s.formField}>
          <label className={s.formLabel} htmlFor={`${idPrefix}-date`}>
            Event date
          </label>

          <input
            id={`${idPrefix}-date`}
            className={s.input}
            type="date"
            value={form.date}
            onChange={setField("date")}
          />
        </div>

        <div className={s.formField}>
          <label className={s.formLabel} htmlFor={`${idPrefix}-time`}>
            Start time
          </label>

          <input
            id={`${idPrefix}-time`}
            className={s.input}
            type="time"
            step="900"
            value={form.time}
            onChange={setField("time")}
          />

          <span className={s.amountHint}>
            Bookings on the same day must start at least {MIN_GAP_HOURS} hours apart.
          </span>
        </div>
      </div>

      {addingCustomer && (
        <div className={s.formGrid3}>
          <div className={s.formField}>
            <label className={s.formLabel} htmlFor={`${idPrefix}-cname`}>
              Customer name
            </label>

            <input
              id={`${idPrefix}-cname`}
              className={s.input}
              placeholder="e.g. Maria Santos"
              value={newCustomer.name}
              onChange={setCustomerField("name")}
              maxLength={120}
            />
          </div>

          <div className={s.formField}>
            <label className={s.formLabel} htmlFor={`${idPrefix}-cemail`}>
              Email (optional)
            </label>

            <input
              id={`${idPrefix}-cemail`}
              className={s.input}
              type="email"
              placeholder="name@example.com"
              value={newCustomer.email}
              onChange={setCustomerField("email")}
              maxLength={150}
            />
          </div>

          <div className={s.formField}>
            <label className={s.formLabel} htmlFor={`${idPrefix}-cphone`}>
              Phone (optional)
            </label>

            <input
              id={`${idPrefix}-cphone`}
              className={s.input}
              type="tel"
              placeholder="09XX XXX XXXX"
              value={newCustomer.phone}
              onChange={setCustomerField("phone")}
              maxLength={30}
            />
          </div>
        </div>
      )}

      <div className={s.formGrid3}>
        <div className={s.formField}>
          <label className={s.formLabel} htmlFor={`${idPrefix}-type`}>
            Event type
          </label>

          <input
            id={`${idPrefix}-type`}
            className={s.input}
            list={`${idPrefix}-types`}
            placeholder="e.g. Wedding"
            value={form.type}
            onChange={setField("type")}
            maxLength={100}
          />

          <datalist id={`${idPrefix}-types`}>
            {BOOKING_TYPES.map((type) => (
              <option key={type} value={type} />
            ))}
          </datalist>
        </div>

        <div className={s.formField}>
          <label className={s.formLabel} htmlFor={`${idPrefix}-package`}>
            Catering package
          </label>

          <select
            id={`${idPrefix}-package`}
            className={s.input}
            value={form.package_id}
            onChange={changePackage}
          >
            <option value="">No package (custom)</option>

            {missingPackage && (
              <option value={form.package_id}>
                {booking.package_name} (no longer on the menu)
              </option>
            )}

            {packages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — {money(p.price)}/head
              </option>
            ))}
          </select>
        </div>

        <div className={s.formField}>
          <label className={s.formLabel} htmlFor={`${idPrefix}-guests`}>
            Guests
          </label>

          <input
            id={`${idPrefix}-guests`}
            className={s.input}
            type="number"
            min="1"
            step="1"
            placeholder="50"
            value={form.guests}
            onChange={changeGuests}
          />
        </div>
      </div>

      <div className={s.formGrid3}>
        <div className={s.formField}>
          <label className={s.formLabel} htmlFor={`${idPrefix}-amount`}>
            Amount (₱)
          </label>

          <input
            id={`${idPrefix}-amount`}
            className={s.input}
            type="number"
            min="0"
            step="0.01"
            placeholder="19000"
            value={form.amount}
            onChange={changeAmount}
          />

          {computed !== null && (
            <span className={s.amountHint}>
              {money(selectedPackage.price)} × {guestsNumber} guest
              {guestsNumber === 1 ? "" : "s"} = {money(computed)}
              {Number(form.amount || 0) !== computed && (
                <>
                  {" "}
                  <button
                    type="button"
                    className={s.link}
                    onClick={useComputedAmount}
                  >
                    Use this amount
                  </button>
                </>
              )}
            </span>
          )}
        </div>

        <div className={s.formField}>
          <label className={s.formLabel} htmlFor={`${idPrefix}-status`}>
            Status
          </label>

          <select
            id={`${idPrefix}-status`}
            className={s.input}
            value={form.status}
            onChange={setField("status")}
          >
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className={s.formLabel} htmlFor={`${idPrefix}-notes`}>
        Notes (optional)
      </label>

      <textarea
        id={`${idPrefix}-notes`}
        className={s.menuTextarea}
        rows={3}
        placeholder="Venue, special requests, allergies..."
        value={form.notes}
        onChange={setField("notes")}
      />

      <div className={s.formActions}>
        <button type="button" className={s.secondaryBtn} onClick={onCancel}>
          Cancel
        </button>

        <button type="submit" className={s.btn} disabled={saving}>
          {saving ? "Saving..." : booking ? "Save changes" : "Add booking"}
        </button>
      </div>
    </form>
  );
}