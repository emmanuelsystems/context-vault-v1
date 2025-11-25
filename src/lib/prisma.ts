// src/lib/prisma.ts

import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "@prisma/client";

// WebSocket config for Node/serverless
if (typeof window === "undefined") {
    // dynamic require to avoid bundling issues
    neonConfig.webSocketConstructor = require("ws");
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

// ✅ No Pool needed
const adapter = new PrismaNeon({ connectionString });

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: ["error", "warn"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export const db = prisma;
export default prisma;
