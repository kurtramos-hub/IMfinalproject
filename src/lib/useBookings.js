import { useCallback, useEffect, useState } from "react";
import { requestApi } from "./bookingsClient";

export default function useBookings() {
  const [bookings, setBookings] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const [bookingData, customerData, packageData] = await Promise.all([
        requestApi("/api/staff/bookings"),
        requestApi("/api/staff/customers"),
        // Packages are optional here: if this fails, bookings still work
        requestApi("/api/staff/packages").catch(() => []),
      ]);

      setBookings(bookingData);
      setCustomers(customerData);
      setPackages(Array.isArray(packageData) ? packageData : []);
      setError("");
    } catch (err) {
      setError(err.message || "Unable to load bookings.");
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

  async function saveBooking(payload, id) {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (id) {
        await requestApi("/api/staff/bookings", "PUT", { id, ...payload });
        setNotice("Booking updated successfully!");
      } else {
        await requestApi("/api/staff/bookings", "POST", payload);
        setNotice("Booking added successfully!");
      }

      await load(true);
      return true;
    } catch (err) {
      setError(err.message || "Unable to save the booking.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function removeBooking(booking) {
    if (
      !window.confirm(
        `Delete booking #${booking.id} for ${booking.customer_name}?\n\n` +
          "If this is their only booking, the customer will also be removed from the Customers page."
      )
    ) {
      return false;
    }

    setError("");
    setNotice("");

    try {
      const result = await requestApi(
        `/api/staff/bookings?id=${encodeURIComponent(booking.id)}`,
        "DELETE"
      );
      setNotice(
        result?.customerDeleted
          ? "Booking deleted. The customer was removed too, since it was their only booking."
          : "Booking deleted."
      );
      await load(true);
      return true;
    } catch (err) {
      setError(err.message || "Unable to delete the booking.");
      return false;
    }
  }

  async function changeStatus(booking, status) {
    if (status === booking.status) return;

    setError("");
    setNotice("");

    try {
      await requestApi("/api/staff/bookings", "PUT", {
        id: booking.id,
        customer_id: booking.customer_id,
        date: booking.date,
        time: booking.time,
        type: booking.type,
        guests: booking.guests,
        amount: booking.amount,
        notes: booking.notes || "",
        package_id: booking.package_id,
        package_name: booking.package_name || "",
        status,
      });

      setNotice(`Booking #${booking.id} marked as ${status}.`);
      await load(true);
    } catch (err) {
      setError(err.message || "Unable to update the status.");
    }
  }

  async function createCustomer(data) {
    try {
      const created = await requestApi("/api/staff/customers", "POST", data);

      setCustomers((prev) =>
        [...prev, created].sort((a, b) => a.name.localeCompare(b.name))
      );

      return created;
    } catch (err) {
      setError(err.message || "Unable to add the customer.");
      return null;
    }
  }

  return {
    bookings,
    customers,
    packages,
    loading,
    saving,
    error,
    notice,
    setError,
    setNotice,
    saveBooking,
    removeBooking,
    changeStatus,
    createCustomer,
  };
}