import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import StaffLayout, { Status } from "../../components/StaffLayout";
import s from "../../styles/StaffLayout.module.css";
import useBookings from "../../lib/useBookings";
import { money } from "../../lib/bookingsClient";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = Array.from({ length: 12 }, (_, i) =>
  new Date(2000, i, 1).toLocaleDateString("en-US", { month: "long" })
);
const MAX_CHIPS = 2;

const pad = (n) => String(n).padStart(2, "0");
const keyOf = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

export default function Calendar() {
  const { bookings, loading, error } = useBookings();

  // Set after mount so the server and browser never disagree about "today"
  const [view, setView] = useState(null);
  const [todayKey, setTodayKey] = useState("");
  const [selected, setSelected] = useState("");
  const [showCancelled, setShowCancelled] = useState(false);

  // Floating month window
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const currentMonthRef = useRef(null);

  useEffect(() => {
    const now = new Date();
    const key = keyOf(now.getFullYear(), now.getMonth(), now.getDate());

    setView({ y: now.getFullYear(), m: now.getMonth() });
    setTodayKey(key);
    setSelected(key);
  }, []);

  // Escape closes the window; focus moves into it when it opens
  useEffect(() => {
    if (!pickerOpen) return;

    const onKey = (e) => {
      if (e.key === "Escape") setPickerOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const t = setTimeout(() => currentMonthRef.current?.focus(), 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(t);
    };
  }, [pickerOpen]);

  const byDate = useMemo(() => {
    const map = {};

    bookings.forEach((b) => {
      if (b.status === "cancelled" && !showCancelled) return;
      map[b.date] = [...(map[b.date] || []), b];
    });

    return map;
  }, [bookings, showCancelled]);

  // Bookings per month, e.g. "2026-10" -> 3
  const monthCounts = useMemo(() => {
    const counts = {};

    Object.entries(byDate).forEach(([date, list]) => {
      const k = date.slice(0, 7);
      counts[k] = (counts[k] || 0) + list.length;
    });

    return counts;
  }, [byDate]);

  if (!view) {
    return (
      <StaffLayout
        active="calendar"
        title="Calendar"
        subtitle="View booking availability and schedule"
      >
        <p className={s.empty}>Loading calendar...</p>
      </StaffLayout>
    );
  }

  const first = new Date(view.y, view.m, 1);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const label = first.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const monthPrefix = `${view.y}-${pad(view.m + 1)}-`;
  const monthBookings = Object.entries(byDate)
    .filter(([date]) => date.startsWith(monthPrefix))
    .flatMap(([, list]) => list);
  const monthGuests = monthBookings.reduce((sum, b) => sum + b.guests, 0);

  const selectedBookings = byDate[selected] || [];
  const selectedLabel = selected
    ? new Date(
        ...selected.split("-").map((v, i) => (i === 1 ? Number(v) - 1 : Number(v)))
      ).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const todayYear = Number(todayKey.slice(0, 4));
  const todayMonth = Number(todayKey.slice(5, 7)) - 1;

  function move(step) {
    const d = new Date(view.y, view.m + step, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
    setSelected("");
  }

  function goToday() {
    const now = new Date();
    setView({ y: now.getFullYear(), m: now.getMonth() });
    setSelected(keyOf(now.getFullYear(), now.getMonth(), now.getDate()));
  }

  function openPicker() {
    setPickerYear(view.y);
    setPickerOpen(true);
  }

  function pickMonth(m) {
    setView({ y: pickerYear, m });
    setSelected("");
    setPickerOpen(false);
  }

  function pickThisMonth() {
    goToday();
    setPickerOpen(false);
  }

  const monthWindow = (
    <div className="mw-backdrop" onMouseDown={() => setPickerOpen(false)}>
      <div
        className="mw-card"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a month"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mw-top">
          <h3>Select month</h3>
          <button
            type="button"
            className="mw-close"
            onClick={() => setPickerOpen(false)}
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="mw-year">
          <button
            type="button"
            className="mw-arrow"
            onClick={() => setPickerYear((y) => y - 1)}
            aria-label="Previous year"
          >
            &lsaquo;
          </button>

          <b>{pickerYear}</b>

          <button
            type="button"
            className="mw-arrow"
            onClick={() => setPickerYear((y) => y + 1)}
            aria-label="Next year"
          >
            &rsaquo;
          </button>
        </div>

        <div className="mw-grid">
          {MONTHS.map((name, m) => {
            const count = monthCounts[`${pickerYear}-${pad(m + 1)}`] || 0;
            const isCurrent = pickerYear === view.y && m === view.m;
            const isToday = pickerYear === todayYear && m === todayMonth;

            return (
              <button
                key={name}
                type="button"
                ref={isCurrent ? currentMonthRef : null}
                className={`mw-month${isCurrent ? " current" : ""}${isToday ? " today" : ""}`}
                onClick={() => pickMonth(m)}
                aria-pressed={isCurrent}
              >
                <span className="mw-name">{name}</span>
                <span className="mw-count">
                  {count ? `${count} booking${count === 1 ? "" : "s"}` : "No bookings"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mw-foot">
          <button type="button" className="mw-today" onClick={pickThisMonth}>
            Go to today
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <StaffLayout
      active="calendar"
      title="Calendar"
      subtitle="View booking availability and schedule"
    >
      {error && (
        <div className={s.messageError} role="alert">
          {error}
        </div>
      )}

      <section className={s.panel}>
        <div className={s.calHead}>
          <h2>
            <button
              type="button"
              className="month-title"
              onClick={openPicker}
              aria-haspopup="dialog"
              title="Choose a month"
            >
              {label} <span aria-hidden="true">&#9662;</span>
            </button>
          </h2>

          <div className={s.navBtns}>
            <button
              type="button"
              className={s.sq}
              onClick={() => move(-1)}
              aria-label="Previous month"
            >
              &lsaquo;
            </button>

            <button type="button" className={s.todayBtn} onClick={goToday}>
              Today
            </button>

            <button
              type="button"
              className={s.sq}
              onClick={() => move(1)}
              aria-label="Next month"
            >
              &rsaquo;
            </button>
          </div>
        </div>

        <div className={s.calSub}>
          <span>
            {loading
              ? "Loading bookings..."
              : `${monthBookings.length} booking${
                  monthBookings.length === 1 ? "" : "s"
                } this month${monthGuests ? ` • ${monthGuests} guests` : ""}`}
          </span>

          <label className={s.calToggle}>
            <input
              type="checkbox"
              checked={showCancelled}
              onChange={(e) => setShowCancelled(e.target.checked)}
            />
            Show cancelled
          </label>
        </div>

        <div className={s.week}>
          {DAYS.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        <div className={s.days}>
          {Array.from({ length: first.getDay() }, (_, i) => (
            <div key={`blank-${i}`} className={s.calBlank} />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => {
            const key = keyOf(view.y, view.m, d);
            const list = byDate[key] || [];
            const extra = list.length - MAX_CHIPS;

            return (
              <button
                key={d}
                type="button"
                className={[
                  s.calDay,
                  key === todayKey ? s.calDayToday : "",
                  key === selected ? s.calDaySelected : "",
                ].join(" ")}
                onClick={() => setSelected(key)}
                aria-pressed={key === selected}
                aria-label={`${label.split(" ")[0]} ${d}, ${list.length} booking${
                  list.length === 1 ? "" : "s"
                }`}
              >
                <span className={s.calDayNum}>{d}</span>

                {list.length > 0 && (
                  <span className={s.calChips}>
                    {list.slice(0, MAX_CHIPS).map((b) => (
                      <span
                        key={b.id}
                        className={`${s.calChip} ${s[b.status]}`}
                        title={`${b.customer_name} - ${b.type} (${b.status})`}
                      >
                        {b.type}
                      </span>
                    ))}

                    {extra > 0 && <span className={s.calMore}>+{extra} more</span>}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className={s.legend}>
        <span>
          <i className={s.confirmed} />
          Confirmed
        </span>
        <span>
          <i className={s.pending} />
          Pending
        </span>
        <span>
          <i className={s.completed} />
          Completed
        </span>
        {showCancelled && (
          <span>
            <i className={s.cancelled} />
            Cancelled
          </span>
        )}
        <span>
          <i className={s.todayDot} />
          Today
        </span>
      </div>

      {selected && (
        <section className={`${s.panel} ${s.calDetail}`} aria-live="polite">
          <div className={s.panelHead}>
            <h2>{selectedLabel}</h2>

            <Link href="/staff/bookings" className={s.link}>
              Manage bookings
            </Link>
          </div>

          {selectedBookings.length === 0 ? (
            <p className={s.empty}>No bookings on this day.</p>
          ) : (
            <ul className={s.list}>
              {selectedBookings.map((b) => (
                <li key={b.id} className={s.row}>
                  <div>
                    <b>{b.customer_name}</b>
                    <span className={s.muted}>
                      {b.type} &bull; {b.guests} guests
                      {b.package_name ? ` • ${b.package_name}` : ""}
                    </span>
                  </div>

                  <div className={s.right}>
                    <span className={s.calAmount}>{money(b.amount)}</span>
                    <Status value={b.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Rendered on document.body so nothing can clip it */}
      {pickerOpen && typeof document !== "undefined" && createPortal(monthWindow, document.body)}

      <style jsx global>{`
        .month-title {
          padding: 4px 10px;
          margin: -4px -10px;
          border: 1px solid transparent;
          border-radius: 8px;
          background: none;
          color: inherit;
          font: inherit;
          cursor: pointer;
          transition: background-color 0.2s, border-color 0.2s, color 0.2s;
        }
        .month-title span {
          font-size: 0.6em;
          vertical-align: middle;
          color: #9a9a9a;
        }
        .month-title:hover {
          background: #1f1f1f;
          border-color: #cfae2e;
        }
        .month-title:focus-visible {
          outline: 2px solid #cfae2e;
          outline-offset: 2px;
        }

        .mw-backdrop {
          position: fixed;
          inset: 0;
          z-index: 1000;
          display: grid;
          place-items: center;
          padding: 16px;
          background: rgba(0, 0, 0, 0.65);
          animation: mw-fade 0.2s ease both;
        }
        .mw-card {
          width: 100%;
          max-width: 460px;
          padding: 22px;
          border: 1px solid #2d2d2d;
          border-radius: 14px;
          background: #161616;
          color: #ececec;
          font: 13px/1.4 "Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
          animation: mw-pop 0.25s cubic-bezier(0.2, 0.8, 0.2, 1) both;
        }
        .mw-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        .mw-top h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #cfae2e;
        }
        .mw-close {
          width: 30px;
          height: 30px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #9a9a9a;
          font-size: 22px;
          line-height: 1;
          cursor: pointer;
        }
        .mw-close:hover {
          background: #242424;
          color: #fff;
        }
        .mw-year {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          padding: 6px;
          border-radius: 10px;
          background: #1f1f1f;
        }
        .mw-year b {
          font-size: 18px;
        }
        .mw-arrow {
          width: 34px;
          height: 32px;
          border: 1px solid #2d2d2d;
          border-radius: 8px;
          background: #161616;
          color: #ececec;
          font-size: 18px;
          cursor: pointer;
        }
        .mw-arrow:hover {
          border-color: #cfae2e;
        }
        .mw-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .mw-month {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 3px;
          padding: 14px 6px;
          border: 1px solid #2d2d2d;
          border-radius: 10px;
          background: #1f1f1f;
          color: #ececec;
          font: inherit;
          cursor: pointer;
          transition: border-color 0.15s, background-color 0.15s, transform 0.15s;
        }
        .mw-month:hover {
          border-color: #cfae2e;
          transform: translateY(-2px);
        }
        .mw-month:active {
          transform: scale(0.96);
        }
        .mw-month:focus-visible,
        .mw-close:focus-visible,
        .mw-arrow:focus-visible,
        .mw-today:focus-visible {
          outline: 2px solid #cfae2e;
          outline-offset: 2px;
        }
        .mw-name {
          font-size: 14px;
          font-weight: 600;
        }
        .mw-count {
          font-size: 10px;
          color: #9a9a9a;
        }
        .mw-month.today {
          border-color: #cfae2e;
        }
        .mw-month.current {
          background: #cfae2e;
          border-color: #cfae2e;
          color: #111;
        }
        .mw-month.current .mw-count {
          color: #333;
        }
        .mw-foot {
          display: flex;
          justify-content: center;
          margin-top: 16px;
        }
        .mw-today {
          padding: 8px 18px;
          border: 1px solid #2d2d2d;
          border-radius: 8px;
          background: transparent;
          color: #cfae2e;
          font: inherit;
          cursor: pointer;
        }
        .mw-today:hover {
          background: #1f1f1f;
          border-color: #cfae2e;
        }

        @keyframes mw-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes mw-pop {
          from { opacity: 0; transform: translateY(14px) scale(0.96); }
          to { opacity: 1; transform: none; }
        }
        @media (max-width: 480px) {
          .mw-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (prefers-reduced-motion: reduce) {
          .mw-backdrop, .mw-card { animation: none; }
          .mw-month:hover { transform: none; }
        }
      `}</style>
    </StaffLayout>
  );
}