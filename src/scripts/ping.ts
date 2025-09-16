import { connectDB } from "@/lib/db";

connectDB()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
