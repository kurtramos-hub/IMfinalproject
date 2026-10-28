   import { clearStaffCookie } from "../../../lib/auth";

   export default function handler(req, res) {
     if (req.method !== "POST") {
       res.setHeader("Allow", "POST");
       return res.status(405).json({ message: "Method not allowed" });
     }
     clearStaffCookie(res);
     return res.status(200).json({ message: "Logged out." });
   }