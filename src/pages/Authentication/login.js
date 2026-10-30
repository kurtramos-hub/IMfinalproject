import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import AuthLayout, { Field, GoogleButton } from "../../components/AuthLayout";
import styles from "../../styles/auth.module.css";
import { getCustomerUser } from "../../lib/customerAuth";

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/Auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }

      router.push("/"); // change to your dashboard/home page
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your account">
      <form onSubmit={handleSubmit} className={styles.form}>
        <Field label="Email Address" name="email" type="email" value={form.email} onChange={handleChange} autoComplete="email" />
        <Field label="Password" name="password" type="password" value={form.password} onChange={handleChange} autoComplete="current-password" />
        <a href="#" className={styles.forgot}>Forgot Password?</a>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="submit" className={styles.primary} disabled={loading}>
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>

      <div className={styles.divider}><span>Or</span></div>
      <GoogleButton>Log in with Google</GoogleButton>

      <p className={styles.switch}>
        Don&apos;t have an account? <Link href="/Authentication/signup">Sign up</Link>
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