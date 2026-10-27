import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import StaffLayout, { Status } from "../../components/StaffLayout";
import s from "../../styles/StaffLayout.module.css";
import useBookings from "../../lib/useBookings";
import { money } from "../../lib/bookingsClient";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
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

  useEffect(() => {
    const now = new Date();
    const key = keyOf(now.getFullYear(), now.getMonth(), now.getDate());

    setView({ y: now.getFullYear(), m: now.getMonth() });
    setTodayKey(key);
    setSelected(key);
  }, []);

  const byDate = useMemo(() => {
    const map = {};

    bookings.forEach((b) => {
      if (b.status === "cancelled" && !showCancelled) return;
      map[b.date] = [...(map[b.date] || []), b];
    });

    return map;
  }, [bookings, showCancelled]);

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
          <h2>{label}</h2>

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

            <Link href="/Staff/bookings" className={s.link}>
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
    </StaffLayout>
  );
}