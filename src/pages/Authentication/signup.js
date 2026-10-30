import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import AuthLayout, { Field, GoogleButton } from "../../components/AuthLayout";
import styles from "../../styles/auth.module.css";
import { getCustomerUser } from "../../lib/customerAuth";

export default function Signup() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords don't match. Re-enter both and try again.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const { confirmPassword, ...payload } = form; // don't send confirmPassword
      const res = await fetch("/api/Auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sign up failed");
        return;
      }

      router.push("/Authentication/login");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create Account" subtitle="Join us today">
      <form onSubmit={handleSubmit} className={styles.form}>
        <Field label="Full Name" name="fullName" value={form.fullName} onChange={handleChange} autoComplete="name" />
        <Field label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
        <Field label="Phone Number" name="phone" type="tel" value={form.phone} onChange={handleChange} autoComplete="tel" />
        <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} autoComplete="new-password" />
        <Field label="Confirm Password" name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} autoComplete="new-password" />
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="submit" className={styles.primary} disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <div className={styles.divider}><span>Or</span></div>
      <GoogleButton>Sign up with Google</GoogleButton>

      <p className={styles.switch}>
        Already have an account? <Link href="/Authentication/login">Log in</Link>
      </p>
    </AuthLayout>
  );
}

export async function getServerSideProps({ req }) {
  const user = await getCustomerUser(req);

  // Already logged in: go back to the landing page
  if (user) return { redirect: { destination: "/", permanent: false } };

  return { props: {} };
}