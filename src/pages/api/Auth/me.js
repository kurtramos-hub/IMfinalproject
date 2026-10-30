import { getCustomerUser } from "../../../lib/customerAuth";

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const user = await getCustomerUser(req);
  if (!user) return res.status(401).json({ error: "Not logged in" });

  return res.status(200).json({ user });
}