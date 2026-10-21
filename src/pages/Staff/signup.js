import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import AuthLayout, { Field } from "../../components/AuthLayout";
import styles from "../../styles/auth.module.css";

export default function StaffSignup() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    pin: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match. Re-enter both and try again.");
      return;
    }
    setError("");

    try {
      const res = await fetch("/api/staff/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: form.phone,
          password: form.password,
          pin: form.pin,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message);
        return;
      }
      router.push("/Staff/login");
    } catch {
      setError("Can't reach the server. Try again.");
    }
  };

  return (
    <AuthLayout title="Staff Sign Up" subtitle="Admin & employee access">
      <form onSubmit={handleSubmit} className={styles.form}>
        <Field label="Full Name" name="fullName" value={form.fullName} onChange={handleChange} autoComplete="name" />
        <Field label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
        <Field label="Phone Number" name="phone" type="tel" value={form.phone} onChange={handleChange} autoComplete="tel" />
        <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} autoComplete="new-password" />
        <Field label="Confirm Password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" />
        <Field label="Staff PIN" name="pin" type="password" value={form.pin} onChange={handleChange} autoComplete="off" />
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="submit" className={styles.primary}>Create Staff Account</button>
      </form>

      <p className={styles.switch}>
        Already have a staff account? <Link href="/Staff/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}