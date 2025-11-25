import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

// Configure WebSocket for Neon
if (typeof window === "undefined") {
    neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
    pool?: Pool;
};

// Create connection pool
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

export const pool =
    globalForPrisma.pool ?? new Pool({ connectionString });

const adapter = new PrismaNeon(pool);

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: ["error", "warn"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
    globalForPrisma.pool = pool;
}

export default prisma;