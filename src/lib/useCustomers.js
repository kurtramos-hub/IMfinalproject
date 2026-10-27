import { useCallback, useEffect, useState } from "react";
import { requestApi } from "./bookingsClient";

export default function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const [customerData, bookingData] = await Promise.all([
        requestApi("/api/staff/customers"),
        // Only used to show each customer's recent bookings
        requestApi("/api/staff/bookings").catch(() => []),
      ]);

      setCustomers(customerData);
      setBookings(Array.isArray(bookingData) ? bookingData : []);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load customers.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Success messages disappear on their own
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function saveCustomer(payload, id) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (id) {
        await requestApi("/api/staff/customers", "PUT", { id, ...payload });
        setNotice("Customer updated successfully!");
      } else {
        await requestApi("/api/staff/customers", "POST", payload);
        setNotice("Customer added successfully!");
      }

      await load(true);
      return true;
    } catch (err) {
      setError(err.message || "Unable to save the customer.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function removeCustomer(customer) {
    if (!window.confirm(`Delete customer "${customer.name}"?`)) return false;

    setError("");
    setNotice("");

    try {
      await requestApi(
        `/api/staff/customers?id=${encodeURIComponent(customer.id)}`,
        "DELETE"
      );
      setNotice("Customer deleted.");
      await load(true);
      return true;
    } catch (err) {
      setError(err.message || "Unable to delete the customer.");
      return false;
    }
  }

  return {
    customers,
    bookings,
    loading,
    saving,
    error,
    notice,
    setError,
    setNotice,
    saveCustomer,
    removeCustomer,
  };
}