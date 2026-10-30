import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { sql } from "../../lib/db";
import { getCustomerFromRequest } from "../../lib/customerAuth";
import { formatDate, formatTime, money } from "../../lib/bookingsClient";

export async function getServerSideProps({ req, res }) {
  res.setHeader("Cache-Control", "private, no-store");

  const login = { redirect: { destination: "/Authentication/login", permanent: false } };

  const payload = getCustomerFromRequest(req);
  if (!payload) return login;

  const users = await sql`
    SELECT id, full_name, email, phone, created_at
      FROM users
     WHERE id = ${payload.id}
  `;
  const user = users[0];
  if (!user) return login;

  // Bookings are matched to the account by email
  let bookings = [];
  try {
    const rows = await sql`
      SELECT
        b.id,
        to_char(b.event_date, 'YYYY-MM-DD') AS date,
        to_char(b.event_time, 'HH24:MI') AS time,
        b.event_type AS type,
        b.guests,
        b.status,
        b.amount::float AS amount,
        COALESCE(b.package_name, '') AS package_name
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE lower(c.email) = lower(${user.email})
      ORDER BY b.event_date DESC, b.event_time DESC, b.id DESC
    `;
    bookings = rows.map((b) => ({
      id: Number(b.id),
      date: b.date,
      time: b.time,
      type: b.type,
      guests: Number(b.guests),
      status: b.status,
      amount: Number(b.amount || 0),
      package_name: b.package_name,
    }));
  } catch (err) {
    console.error("profile bookings error:", err);
  }

  return {
    props: {
      profile: {
        name: user.full_name || "",
        email: user.email || "",
        phone: user.phone || "",
        memberSince: user.created_at ? new Date(user.created_at).getFullYear() : null,
      },
      bookings,
    },
  };
}

const ROWS = [
  { key: "history", label: "Order History" },
  { key: "addresses", label: "Saved Addresses" },
  { key: "payment", label: "Payment Methods" },
  { key: "notifications", label: "Notifications" },
  { key: "help", label: "Help & Support" },
  { key: "terms", label: "Terms & Privacy" },
];

function Svg({ children, size = 18 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export default function Profile({ profile, bookings }) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const [soon, setSoon] = useState("");

  const orders = bookings.filter((b) => b.status !== "cancelled").length;
  const spent = bookings
    .filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((sum, b) => sum + b.amount, 0);

  function onRow(row) {
    if (row.key === "history") {
      setHistoryOpen((open) => !open);
      return;
    }
    setSoon(`${row.label} is coming soon.`);
    setTimeout(() => setSoon(""), 2500);
  }

  async function signOut() {
    try {
      await fetch("/api/Auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <main className="pf-page">
      <Head>
        <title>{`My Profile | Dorothy's Kitchen`}</title>
      </Head>

      <div className="pf-wrap">
        <Link href="/" className="pf-back" aria-label="Back to home">
          <Svg size={22}>
            <line x1="19" x2="5" y1="12" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </Svg>
        </Link>

        <section className="pf-card">
          <div className="pf-head">
            <div className="pf-avatar">
              <Svg size={26}>
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
              </Svg>
            </div>

            <div>
              <h1>{profile.name}</h1>
              {profile.memberSince && <p>Member since {profile.memberSince}</p>}
            </div>
          </div>

          <hr />

          <ul className="pf-contact">
            <li>
              <Svg size={15}>
                <rect width="20" height="16" x="2" y="4" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </Svg>
              {profile.email}
            </li>
            {profile.phone && (
              <li>
                <Svg size={15}>
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
                </Svg>
                {profile.phone}
              </li>
            )}
          </ul>
        </section>

        <section className="pf-stats" aria-label="Summary">
          <div className="pf-stat">
            <b>{orders}</b>
            <span>Orders</span>
          </div>
          <div className="pf-stat">
            <b>{money(spent)}</b>
            <span>Spent</span>
          </div>
          <div className="pf-stat">
            <b>0</b>
            <span>Reviews</span>
          </div>
        </section>

        <ul className="pf-list">
          {ROWS.map((row) => (
            <li key={row.key}>
              <button
                type="button"
                className="pf-row"
                onClick={() => onRow(row)}
                aria-expanded={row.key === "history" ? historyOpen : undefined}
              >
                <span>{row.label}</span>
                <span className={`pf-chev${row.key === "history" && historyOpen ? " open" : ""}`}>
                  <Svg size={18}>
                    <polyline points="9 18 15 12 9 6" />
                  </Svg>
                </span>
              </button>

              {row.key === "history" && historyOpen && (
                <div className="pf-history">
                  {bookings.length === 0 ? (
                    <p className="pf-empty">No orders yet.</p>
                  ) : (
                    <ul>
                      {bookings.map((b) => (
                        <li key={b.id}>
                          <div>
                            <b>{b.type}</b>
                            <small>
                              {formatDate(b.date)}
                              {b.time ? ` • ${formatTime(b.time)}` : ""} • {b.guests} guest
                              {b.guests === 1 ? "" : "s"}
                              {b.package_name ? ` • ${b.package_name}` : ""}
                            </small>
                          </div>

                          <div className="pf-history-right">
                            <span>{money(b.amount)}</span>
                            <em className={`pf-pill pf-${b.status}`}>{b.status}</em>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>

        {soon && (
          <p className="pf-soon" role="status">
            {soon}
          </p>
        )}

        <button type="button" className="pf-signout" onClick={signOut}>
          <Svg size={16}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </Svg>
          Sign Out
        </button>
      </div>

      <style jsx global>{`
        .pf-page {
          min-height: 100vh;
          padding: 40px 20px 64px;
          background:
            radial-gradient(circle at 25% 15%, rgba(214, 179, 53, 0.18), transparent 38%),
            radial-gradient(circle at 80% 70%, rgba(214, 179, 53, 0.1), transparent 40%),
            #000;
          color: #ececec;
          font: 14px/1.4 "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif;
        }
        .pf-wrap {
          max-width: 760px;
          margin: 0 auto;
        }
        .pf-back {
          display: inline-grid;
          place-items: center;
          width: 40px;
          height: 40px;
          margin-bottom: 18px;
          border-radius: 10px;
          color: #fff;
          transition: background-color 0.2s;
        }
        .pf-back:hover {
          background: #1f1f1f;
        }
        .pf-card {
          padding: 24px 28px;
          border: 1px solid #2d2d2d;
          border-radius: 10px;
          background: #161616;
        }
        .pf-head {
          display: flex;
          align-items: center;
          gap: 18px;
        }
        .pf-avatar {
          display: grid;
          place-items: center;
          width: 64px;
          height: 64px;
          border: 1px solid #8a7420;
          border-radius: 50%;
          background: #2b2610;
          color: #d6b335;
        }
        .pf-head h1 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #fff;
        }
        .pf-head p {
          margin: 2px 0 0;
          font-size: 12px;
          color: #9a9a9a;
        }
        .pf-card hr {
          margin: 20px 0 16px;
          border: 0;
          border-top: 1px solid #2d2d2d;
        }
        .pf-contact {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 0;
          padding: 0;
          list-style: none;
          font-size: 13px;
          color: #cfcfcf;
        }
        .pf-contact li {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .pf-contact svg {
          color: #9a9a9a;
        }

        .pf-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 150px));
          justify-content: center;
          gap: 14px;
          margin: 40px 0;
        }
        .pf-stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 22px 8px;
          border: 1px solid #2d2d2d;
          border-radius: 10px;
          background: #161616;
        }
        .pf-stat b {
          font-size: 22px;
          font-weight: 500;
          color: #d6b335;
        }
        .pf-stat span {
          font-size: 14px;
          color: #cfcfcf;
        }

        .pf-list {
          margin: 0;
          padding: 0;
          list-style: none;
          border: 1px solid #2d2d2d;
          border-radius: 10px;
          background: #161616;
          overflow: hidden;
        }
        .pf-list > li + li {
          border-top: 1px solid #2d2d2d;
        }
        .pf-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
          padding: 16px 24px;
          border: 0;
          background: none;
          color: #ececec;
          font: inherit;
          font-size: 13px;
          text-align: left;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .pf-row:hover {
          background: #1f1f1f;
        }
        .pf-row:focus-visible,
        .pf-signout:focus-visible,
        .pf-back:focus-visible {
          outline: 2px solid #d6b335;
          outline-offset: 2px;
        }
        .pf-chev {
          display: inline-grid;
          color: #cfcfcf;
          transition: transform 0.25s ease;
        }
        .pf-chev.open {
          transform: rotate(90deg);
        }

        .pf-history {
          padding: 4px 24px 18px;
          background: #121212;
        }
        .pf-history ul {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        .pf-history li {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          padding: 12px 14px;
          border: 1px solid #2d2d2d;
          border-radius: 8px;
          background: #1a1a1a;
        }
        .pf-history b {
          display: block;
          font-size: 13px;
        }
        .pf-history small {
          font-size: 11px;
          color: #9a9a9a;
        }
        .pf-history-right {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 6px;
          font-size: 13px;
        }
        .pf-empty {
          margin: 10px 0 0;
          text-align: center;
          color: #9a9a9a;
        }
        .pf-pill {
          padding: 2px 10px;
          border-radius: 999px;
          font-size: 10px;
          font-style: normal;
          text-transform: capitalize;
        }
        .pf-pending { background: #5a4d1c; color: #e6c84a; }
        .pf-confirmed { background: #2c5a27; color: #86d97a; }
        .pf-completed { background: #2a3c52; color: #8dbbe8; }
        .pf-cancelled { background: #5a2424; color: #e88d8d; }

        .pf-soon {
          margin: 14px 0 0;
          text-align: center;
          font-size: 12px;
          color: #9a9a9a;
        }

        .pf-signout {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          max-width: 300px;
          margin: 44px auto 0;
          padding: 13px 16px;
          border: 1px solid #5a2424;
          border-radius: 8px;
          background: #2a1212;
          color: #f06a6a;
          font: inherit;
          font-size: 13px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        .pf-signout:hover {
          background: #3a1717;
        }

        @media (max-width: 560px) {
          .pf-stats { grid-template-columns: repeat(3, 1fr); }
          .pf-card { padding: 20px; }
        }
      `}</style>
    </main>
  );
}