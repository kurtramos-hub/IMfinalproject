import { useState } from "react";
import StaffLayout, { Icon } from "../../components/StaffLayout";
import s from "../../styles/StaffLayout.module.css";
import { customers, bookings, formatDate } from "../../lib/sampleData";

export default function Customers() {
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState({});

  const rows = customers
    .map((c) => {
      const mine = bookings.filter((b) => b.customerId === c.id);
      return { ...c, total: mine.length, last: mine.map((b) => b.date).sort().pop() };
    })
    .filter((c) => `${c.name} ${c.email} ${c.id}`.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <StaffLayout active="customers" title="Customers" subtitle="Manage your customer information and history">
      <input className={`${s.input} ${s.search}`} type="search" value={q} onChange={(e) => setQ(e.target.value)}
        placeholder="Search by name, email, event type or ID..." aria-label="Search customers" />

      <section className={s.panel} style={{ minHeight: 440 }}>
        {rows.length === 0 ? (
          <p className={s.empty}>No customers match your search.</p>
        ) : (
          <div className={s.cards}>
            {rows.map((c) => {
              const open = !!expanded[c.id];
              return (
                <article key={c.id} className={`${s.card} ${open ? s.expanded : ""}`}>
                  <div className={s.cardTop}>
                    <div>
                      <h3 className={s.name}>{c.name}</h3>
                      <div>Customer ID: {c.id}</div>
                    </div>
                    <div className={s.total}>Total Bookings: <b>{c.total}</b></div>
                  </div>

                  {open && (
                    <ul className={s.info}>
                      <li><Icon name="mail" size={14} />{c.email}</li>
                      <li><Icon name="phone" size={14} />{c.phone}</li>
                      <li><Icon name="pin" size={14} />{c.address}</li>
                    </ul>
                  )}

                  <div className={s.cardFoot}>
                    <span>Last booking: {c.last ? formatDate(c.last) : "None yet"}</span>
                    {!open && (
                      <button type="button" className={s.link} onClick={() => setExpanded({ ...expanded, [c.id]: true })}>See More...</button>
                    )}
                    {open && (
                      <button type="button" className={s.link} onClick={() => setExpanded({ ...expanded, [c.id]: false })}>See Less</button>
                    )}
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