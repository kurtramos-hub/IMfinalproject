import { useMemo, useRef, useState } from "react";
import StaffLayout, { Icon, Status } from "../../components/StaffLayout";
import s from "../../styles/StaffLayout.module.css";
import useCustomers from "../../lib/useCustomers";
import { formatDate } from "../../lib/bookingsClient";

const emptyForm = { name: "", email: "", phone: "", address: "" };

function CustomerForm({ customer, saving, onSave, onCancel }) {
  const [form, setForm] = useState(() =>
    customer
      ? {
          name: customer.name,
          email: customer.email || "",
          phone: customer.phone || "",
          address: customer.address || "",
        }
      : emptyForm
  );
  const [error, setError] = useState("");
  const idPrefix = customer ? `edit-${customer.id}` : "new";

  const setField = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!form.name.trim()) {
      setError("Please enter the customer's name.");
      return;
    }

    await onSave(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
      },
      customer?.id
    );
  }

  return (
    <form className={s.formCard} onSubmit={submit}>
      <h3>{customer ? `Edit ${customer.name}` : "New customer"}</h3>

      {error && (
        <div className={s.messageError} role="alert">
          {error}
        </div>
      )}

      <div className={s.formGrid3}>
        <div className={s.formField}>
          <label className={s.formLabel} htmlFor={`${idPrefix}-name`}>
            Full name
          </label>
          <input
            id={`${idPrefix}-name`}
            className={s.input}
            placeholder="e.g. Maria Santos"
            value={form.name}
            onChange={setField("name")}
            maxLength={120}
          />
        </div>

        <div className={s.formField}>
          <label className={s.formLabel} htmlFor={`${idPrefix}-email`}>
            Email (optional)
          </label>
          <input
            id={`${idPrefix}-email`}
            className={s.input}
            type="email"
            placeholder="name@example.com"
            value={form.email}
            onChange={setField("email")}
            maxLength={150}
          />
        </div>

        <div className={s.formField}>
          <label className={s.formLabel} htmlFor={`${idPrefix}-phone`}>
            Phone (optional)
          </label>
          <input
            id={`${idPrefix}-phone`}
            className={s.input}
            type="tel"
            placeholder="09XX XXX XXXX"
            value={form.phone}
            onChange={setField("phone")}
            maxLength={30}
          />
        </div>
      </div>

      <label className={s.formLabel} htmlFor={`${idPrefix}-address`}>
        Address (optional)
      </label>
      <input
        id={`${idPrefix}-address`}
        className={s.input}
        placeholder="Street, barangay, city"
        value={form.address}
        onChange={setField("address")}
        maxLength={250}
      />

      <div className={s.formActions}>
        <button type="button" className={s.secondaryBtn} onClick={onCancel}>
          Cancel
        </button>

        <button type="submit" className={s.btn} disabled={saving}>
          {saving ? "Saving..." : customer ? "Save changes" : "Add customer"}
        </button>
      </div>
    </form>
  );
}

export default function Customers() {
  const {
    customers,
    bookings,
    loading,
    saving,
    error,
    notice,
    setError,
    setNotice,
    saveCustomer,
    removeCustomer,
  } = useCustomers();

  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState({});
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const formRef = useRef(null);

  function openForm(customer = null) {
    setEditing(customer);
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
    const ok = await saveCustomer(payload, id);
    if (ok) closeForm();
  }

  async function handleDelete(customer) {
    const ok = await removeCustomer(customer);
    if (ok && editing?.id === customer.id) closeForm();
  }

  const recentByCustomer = useMemo(() => {
    const map = {};

    [...bookings]
      .sort((a, b) => b.date.localeCompare(a.date))
      .forEach((b) => {
        map[b.customer_id] = [...(map[b.customer_id] || []), b];
      });

    return map;
  }, [bookings]);

  const rows = customers.filter((c) =>
    `${c.name} ${c.email} ${c.phone} ${c.id}`
      .toLowerCase()
      .includes(q.trim().toLowerCase())
  );

  return (
    <StaffLayout
      active="customers"
      title="Customers"
      subtitle="Manage your customer information and history"
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
            + New Customer
          </button>
        </div>
      )}

      {formOpen && (
        <div ref={formRef}>
          <CustomerForm
            key={editing?.id ?? "new"}
            customer={editing}
            saving={saving}
            onSave={handleSave}
            onCancel={closeForm}
          />
        </div>
      )}

      <input
        className={`${s.input} ${s.search}`}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, email, phone or ID..."
        aria-label="Search customers"
      />

      <section className={`${s.panel} ${s.custPanel}`}>
        {loading ? (
          <p className={s.empty}>Loading customers...</p>
        ) : rows.length === 0 ? (
          <p className={s.empty}>
            {customers.length === 0
              ? "No customers yet. Click + New Customer to add one."
              : "No customers match your search."}
          </p>
        ) : (
          <div className={s.cards}>
            {rows.map((c) => {
              const open = !!expanded[c.id];
              const recent = (recentByCustomer[c.id] || []).slice(0, 3);

              return (
                <article
                  key={c.id}
                  className={`${s.card} ${open ? s.expanded : ""}`}
                >
                  <div className={s.cardTop}>
                    <div>
                      <h3 className={s.name}>{c.name}</h3>
                      <div>Customer ID: {c.id}</div>
                    </div>

                    <div className={s.total}>
                      Total Bookings: <b>{c.total_bookings}</b>
                    </div>
                  </div>

                  {open && (
                    <>
                      <ul className={s.info}>
                        <li>
                          <Icon name="mail" size={14} />
                          {c.email || "No email"}
                        </li>
                        <li>
                          <Icon name="phone" size={14} />
                          {c.phone || "No phone"}
                        </li>
                        <li>
                          <Icon name="pin" size={14} />
                          {c.address || "No address"}
                        </li>
                      </ul>

                      <h4 className={s.custHistoryTitle}>Recent bookings</h4>

                      {recent.length === 0 ? (
                        <p className={`${s.muted} ${s.custNone}`}>
                          No bookings yet.
                        </p>
                      ) : (
                        <ul className={s.custHistory}>
                          {recent.map((b) => (
                            <li key={b.id}>
                              <span>
                                {formatDate(b.date)} &bull; {b.type}
                              </span>
                              <Status value={b.status} />
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className={s.custActions}>
                        <button
                          type="button"
                          className={s.smallBtn}
                          onClick={() => openForm(c)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={s.deleteBtn}
                          onClick={() => handleDelete(c)}
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}

                  <div className={s.cardFoot}>
                    <span>
                      Last booking:{" "}
                      {c.last_booking ? formatDate(c.last_booking) : "None yet"}
                    </span>

                    <button
                      type="button"
                      className={s.link}
                      aria-expanded={open}
                      onClick={() =>
                        setExpanded({ ...expanded, [c.id]: !open })
                      }
                    >
                      {open ? "See Less" : "See More..."}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </StaffLayout>
  );
}