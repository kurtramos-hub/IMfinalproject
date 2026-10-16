// Placeholder data so the UI can be built first. Replace with database queries later.
export const CURRENCY = "₱";
export const money = (n) => `${CURRENCY}${n.toLocaleString("en-US")}`;

export const customers = [
  { id: 1, name: "John Smith", email: "john.smith@example.com", phone: "(555) 123-4567", address: "123 Main St, New York, NY 10001" },
  { id: 2, name: "Sarah Johnson", email: "sarah.j@example.com", phone: "(555) 234-5678", address: "456 Oak Ave, Los Angeles, CA 90001" },
  { id: 3, name: "Michael Brown", email: "mbrown@example.com", phone: "(555) 345-6789", address: "789 Pine Rd, Chicago, IL 60601" },
];

export const bookings = [
  { id: 1, customerId: 3, date: "2026-04-10", type: "Birthday Party", guests: 50, status: "pending", amount: 19000 },
  { id: 2, customerId: 1, date: "2026-04-15", type: "Wedding", guests: 150, status: "confirmed", amount: 63000 },
  { id: 3, customerId: 2, date: "2026-04-20", type: "Corporate Event", guests: 80, status: "confirmed", amount: 33600 },
  { id: 4, customerId: 2, date: "2026-04-02", type: "Anniversary Dinner", guests: 40, status: "completed", amount: 15200 },
];

export const packages = [
  { name: "SET A", price: 380, items: ["Main course", "Vegetables / noodles", "Soup"] },
  { name: "SET B", price: 420, items: ["Main course", "Appetizer", "Vegetables / noodles", "Soup"] },
  { name: "SET C", price: 460, items: ["Main course", "Appetizer", "Vegetables / noodles", "Soup", "Dessert"] },
];

export const menuItems = ["Main Course", "Appetizer", "Dessert", "Soup", "Vegetables/ Noodles"];

export const customerOf = (id) => customers.find((c) => c.id === id);

// "2026-04-15" -> "Apr 15, 2026" (or "April 15, 2026" with month: "long")
export function formatDate(iso, month = "short") {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month, day: "numeric", year: "numeric" });
}