import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: "../../.env", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Not needed for `prisma generate`, so a missing value only fails commands that connect.
    url: process.env.DATABASE_URL ?? "",
  },
});
