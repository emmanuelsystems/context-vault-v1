import "dotenv/config";               // 1) load .env first
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "./prisma/schema.prisma",   // 2) points to prisma/schema.prisma
  datasource: {
    url: env("DATABASE_URL"),         // 3) reads from process.env.DATABASE_URL
    directUrl: env("DIRECT_URL"),
  },
});
