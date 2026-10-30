import { clearCustomerCookie } from "../../../lib/customerAuth";

export default function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  clearCustomerCookie(res);
  return res.status(200).json({ message: "Logged out." });
}