// src/lib/prisma.ts
// This code uses dynamic imports to ensure compatibility in the serverless environment.

import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";

// --- 1. Global Declarations and WebSocket Configuration ---
declare global {
    // eslint-disable-next-line no-var
    var prisma: any;
}

// Conditionally configure WebSocket for the Neon adapter's pool 
if (typeof window === "undefined") {
    // Use dynamic require for 'ws' to prevent static import errors
    neonConfig.webSocketConstructor = require("ws");
}

const globalForPrisma = globalThis as unknown as {
    prisma?: any;
};

// --- 2. Adapter Initialization ---
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

// 2a. Instantiate the Neon Pool
const pool = new Pool({ connectionString });

// 2b. Instantiate the Adapter
const adapter = new PrismaNeon(pool);

// --- 3. Singleton Instantiation (Bypassing TS Checks) ---

// Use dynamic require to access the PrismaClient class, bypassing strict TypeScript import checks.
// This resolves the TS2305 error during the build.
const PrismaClientClass = require("@prisma/client").PrismaClient;

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClientClass({
        // Pass the adapter instance into the constructor options object
        adapter: adapter,
        log: ["error", "warn"],
    } as any); // <-- The explicit 'as any' here resolves the TS2554 argument count error.

// 4. Preserve the instance globally unless in production
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export const db = prisma;
export default prisma;