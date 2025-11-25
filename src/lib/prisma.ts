// src/lib/prisma.ts

import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Client as Neon, Pool } from "@neondatabase/serverless";
// Do not import ws statically if it causes errors

const globalForPrisma = globalThis as unknown as {
    prisma?: any; // Use any to bypass TS compilation errors
};

// 1. Conditionally configure WebSocket (safer using dynamic require)
if (typeof window === "undefined") {
    // We assume the 'ws' package is installed but use a dynamic require to avoid TS import errors
    const ws = require("ws");
    neonConfig.webSocketConstructor = ws;
}

// Get the connection string
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

// 2. Use the Pool/Adapter pattern (most stable)
const pool = new Pool({ connectionString });
const adapter = new PrismaNeon(pool);

// 3. Instantiate the Prisma Client (using the global declaration)
// We rely on the global declaration you already have.
const prisma =
    globalForPrisma.prisma ||
    new (require("@prisma/client").PrismaClient)({ // <--- Use dynamic require to access class
        adapter,
        log: ["error", "warn"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export const db = prisma; // Export the instance
export default prisma; // Default export