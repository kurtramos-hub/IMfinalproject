export const STATUSES = ["pending", "confirmed", "completed", "cancelled"];

export const BOOKING_TYPES = [
  "Wedding",
  "Birthday Party",
  "Corporate Event",
  "Anniversary Dinner",
  "Debut",
  "Christening",
];

export const money = (n) => `₱${Number(n || 0).toLocaleString("en-US")}`;

export function formatTime(t) {
  if (!t || typeof t !== "string") return "";
  const [h, m] = t.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}


// Turns "2026-04-15" into [2026, 4, 15], or null if it isn't a usable date
function parseIso(iso) {
  if (!iso || typeof iso !== "string") return null;
  const [y, m, d] = iso.split("-").map(Number);
  return y && m && d ? [y, m, d] : null;
}

export function dateParts(iso) {
  const parsed = parseIso(iso);
  if (!parsed) return { day: "—", month: "", full: "No date" };

  const [y, m, d] = parsed;
  const date = new Date(y, m - 1, d);

  return {
    day: date.getDate(),
    month: date.toLocaleDateString("en-US", { month: "short" }),
    full: date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }),
  };
}

export function formatDate(iso, month = "short") {
  const parsed = parseIso(iso);
  if (!parsed) return "—";

  const [y, m, d] = parsed;
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month,
    day: "numeric",
    year: "numeric",
  });
}

export async function requestApi(url, method = "GET", body) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  // Session expired or logged out: go back to the staff login page
  if (response.status === 401 && typeof window !== "undefined") {
    window.location.href = "/staff/login";
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "The request failed.");
  }

  return data;
}