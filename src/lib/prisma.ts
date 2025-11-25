// src/lib/prisma.ts
// This code is optimized for the Vercel/Neon serverless environment.

import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";
// NOTE: We cannot safely import PrismaClient here due to TS2305 error in the Vercel build.
// We will rely on a local definition and global assignment.

// --- 1. Global Declarations and WebSocket Configuration ---
declare global {
    // eslint-disable-next-line no-var
    var prisma: any; // Use 'any' to stop TS from crashing on the global check
}

// Define PrismaClient locally to satisfy TypeScript without triggering the module error
type PrismaClient = any;

// Conditionally configure WebSocket for the Neon adapter's pool 
if (typeof window === "undefined") {
    // Use dynamic require for 'ws' to prevent static import errors
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

// 2a. Instantiate the Neon Pool
const pool = new Pool({ connectionString });

// 2b. Instantiate the Adapter using the Neon Pool instance
const adapter = new PrismaNeon(pool);

// --- 3. Singleton Instantiation (Bypassing TS Checks) ---
// We rely on 'require("@prisma/client").PrismaClient' at runtime.
const PrismaClientClass = require("@prisma/client").PrismaClient;

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClientClass({
        // Cast options to 'any' to bypass the TS2554 constructor argument error
        adapter: adapter,
        log: ["error", "warn"],
    } as any);

// 4. Preserve the instance globally unless in production
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export const db = prisma;
export default prisma;