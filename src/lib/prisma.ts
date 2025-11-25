// src/lib/prisma.ts

import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

// WebSocket config for Node/serverless
if (typeof window === "undefined") {
    neonConfig.webSocketConstructor = require("ws");
}

declare global {
    // eslint-disable-next-line no-var
    var prisma: any;
}

const globalForPrisma = globalThis as unknown as { prisma?: any };

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

// ✅ Adapter without Pool
const adapter = new PrismaNeon({ connectionString });

// ✅ Dynamic require avoids TS2305 in Vercel builds
const PrismaClientClass = require("@prisma/client").PrismaClient;

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClientClass({
        adapter,
        log: ["error", "warn"],
    } as any);

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export const db = prisma;
export default prisma;
