import { useState } from "react";
import StaffLayout from "../../components/StaffLayout";
import s from "../../styles/StaffLayout.module.css";
import { bookings, customerOf } from "../../lib/sampleData";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function Calendar() {
  // Starts on April 2026 because that is where the sample bookings are
  const [view, setView] = useState({ y: 2026, m: 3 });

  const first = new Date(view.y, view.m, 1);
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const label = first.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const byDay = {};
  bookings.forEach((b) => {
    const [y, m, d] = b.date.split("-").map(Number);
    if (y === view.y && m - 1 === view.m && b.status !== "cancelled") {
      byDay[d] = [...(byDay[d] || []), b];
    }
  });

  const now = new Date();
  const isToday = (d) => now.getFullYear() === view.y && now.getMonth() === view.m && now.getDate() === d;

  function move(step) {
    const d = new Date(view.y, view.m + step, 1);
    setView({ y: d.getFullYear(), m: d.getMonth() });
  }

  return (
    <StaffLayout active="calendar" title="Calendar" subtitle="View booking availability and schedule">
      <section className={s.panel}>
        <div className={s.calHead}>
          <h2>{label}</h2>
          <div className={s.navBtns}>
            <button type="button" className={s.sq} onClick={() => move(-1)} aria-label="Previous month">&lsaquo;</button>
            <button type="button" className={s.sq} onClick={() => move(1)} aria-label="Next month">&rsaquo;</button>
          </div>
        </div>

        <div className={s.week}>{DAYS.map((d) => <span key={d}>{d}</span>)}</div>
        <div className={s.days}>
          {Array.from({ length: first.getDay() }, (_, i) => <div key={`blank-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
            <div key={d} className={`${s.day} ${isToday(d) ? s.today : ""}`}>
              {d}
              {(byDay[d] || []).map((b) => (
                <span key={b.id} className={`${s.mark} ${s[b.status]}`}
                  title={`${customerOf(b.customerId).name} - ${b.type} (${b.status})`} />
              ))}
            </div>
          ))}
        </div>
      </section>

      <div className={s.legend}>
        <span><i className={s.confirmed} />Confirmed</span>
        <span><i className={s.pending} />Pending</span>
        <span><i className={s.todayDot} />Today</span>
      </div>
    </StaffLayout>
  );
}