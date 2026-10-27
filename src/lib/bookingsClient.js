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

export function dateParts(iso) {
  const [y, m, d] = iso.split("-").map(Number);
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
  const [y, m, d] = iso.split("-").map(Number);
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

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "The request failed.");
  }

  return data;
}