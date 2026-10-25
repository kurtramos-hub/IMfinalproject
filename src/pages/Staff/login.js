import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import AuthLayout, { Field } from "../../components/AuthLayout";
import styles from "../../styles/auth.module.css";

export default function StaffLogin() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("/api/Staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }
      router.push("/Staff/dashboard");
    } catch {
      setError("Can't reach the server. Try again.");
    }
  };

  return (
    <AuthLayout title="Staff Login" subtitle="Admin & employee access">
      <form onSubmit={handleSubmit} className={styles.form}>
        <Field label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
        <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} autoComplete="current-password" />
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="submit" className={styles.primary}>Log in</button>
      </form>

      <p className={styles.switch}>
        New staff member? <Link href="/Staff/signup">Sign up with your PIN</Link>
      </p>
    </AuthLayout>
  );
}