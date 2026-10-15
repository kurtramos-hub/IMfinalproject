import Link from "next/link";
import styles from "../styles/auth.module.css";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <main className={styles.page}>
      <Link href="/" className={styles.back} aria-label="Back to home">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
      </Link>

      <section className={styles.brand}>
        {/* Export your logo from Figma and save it as public/logo.png */}
        <img src="/dorothy.png" alt="Dorothy's Kitchen" className={styles.logo} />
      </section>

      <section className={styles.card}>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.subtitle}>{subtitle}</p>
        {children}
      </section>
    </main>
  );
}

export function Field({ label, name, type = "text", value, onChange, autoComplete }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      <input
        className={styles.input}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required
      />
    </label>
  );
}

export function GoogleButton({ children }) {
  return (
    <button type="button" className={styles.google} onClick={() => console.log("Google auth: TODO")}>
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#fff" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      </svg>
      {children}
    </button>
  );
}