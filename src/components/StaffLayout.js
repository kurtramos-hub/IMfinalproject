
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import s from "../styles/StaffLayout.module.css";

// Replace with the logged-in staff member later
const USER = { name: "Admin User", email: "username@gmail.com" };

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: "home" },
  { key: "bookings", label: "Bookings", icon: "book" },
  { key: "menu", label: "Menu", icon: "utensils" },
  { key: "calendar", label: "Calendar", icon: "calendar" },
  { key: "customers", label: "Customers", icon: "users" },
];

const ICONS = {
  home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
  book: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>,
  utensils: <><path d="m16 2-2.3 2.3a3 3 0 0 0 0 4.2l1.8 1.8a3 3 0 0 0 4.2 0L22 8" /><path d="M15 15 3.3 3.3a4.2 4.2 0 0 0 0 6l7.3 7.3c.7.7 2 .7 2.8 0L15 15Zm0 0 7 7" /><path d="m2.1 21.8 6.4-6.3" /><path d="m19 5-7 7" /></>,
  calendar: <><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></>,
  days: <><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" /></>,
  users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></>,
  clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
  check: <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>,
  dollar: <><line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>,
  mail: <><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>,
  phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />,
  pin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
};

export function Icon({ name, size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[name]}
    </svg>
  );
}

export function Status({ value }) {
  return <span className={`${s.pill} ${s[value] || ""}`}>{value}</span>;
}

export default function StaffLayout({ active, title, subtitle, children }) {
  const router = useRouter();

  async function logout() {
    try {
      await fetch("/api/staff/logout", { method: "POST" });
    } finally {
      router.push("/staff/login");
    }
  }

  return (
    <div className={s.shell}>
      <Head><title>{title}</title></Head>

      <aside className={s.sidebar}>
        <div className={s.brand}>
          <span className={s.logo} />
          <span className={s.brandText}><b>Dorothy’s Kitchen</b><small>Management</small></span>
        </div>
        <hr className={s.rule} />

        <nav aria-label="Staff navigation">
          {NAV.map((n) => (
            <Link key={n.key} href={`/staff/${n.key}`} title={n.label} aria-current={active === n.key ? "page" : undefined}
              className={`${s.item} ${active === n.key ? s.active : ""}`}>
              <Icon name={n.icon} /><span className={s.label}>{n.label}</span>
            </Link>
          ))}
        </nav>

        <div className={s.spacer} />
        <hr className={s.rule} />
        <div className={s.user}><b>{USER.name}</b><small>{USER.email}</small></div>
        <button type="button" className={s.item} onClick={logout} title="Log Out">
          <Icon name="logout" size={20} /><span className={s.label}>Log Out</span>
        </button>
      </aside>

      <main className={s.main}>
        <div className={s.wrap}>
          <div className={s.heading}><h1 className={s.title}>{title}</h1></div>
          <p className={s.subtitle}>{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}