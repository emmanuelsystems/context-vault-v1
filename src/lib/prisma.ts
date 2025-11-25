// src/lib/prisma.ts
// This code is optimized for the Vercel/Neon serverless environment.

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";
// NOTE: We rely on the 'ws' package being installed but avoid static import 
// to prevent module resolution errors.

// --- 1. Global Declaration and WebSocket Configuration ---
declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

// Conditionally configure WebSocket for the Neon adapter's pool 
// (Necessary for serverless environments)
if (typeof window === "undefined") {
    // Use dynamic require for 'ws' to prevent TypeScript compilation errors (TS2307)
    // We assume 'ws' is installed as a dependency.
    neonConfig.webSocketConstructor = require("ws");
}

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};


// --- 2. Adapter Initialization ---
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

// 2a. Instantiate the Neon Pool (using the correct constructor)
const pool = new Pool({ connectionString });

// 2b. Instantiate the Adapter using the Neon Pool instance
// This structure is the most stable for Vercel/Neon integration.
const adapter = new PrismaNeon(pool);

// --- 3. Singleton Instantiation ---
export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        // Pass the adapter instance into the constructor options object
        adapter: adapter,
        log: ["error", "warn"],
    });

// 4. Preserve the instance globally unless in production
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export const db = prisma; // Export as 'db' for common practice
export default prisma; // Default export for serverless function entry