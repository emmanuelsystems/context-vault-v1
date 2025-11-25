// src/lib/prisma.ts

import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import type { PrismaClient } from "@prisma/client";
import { createRequire } from "module";

// ESM-safe require for serverless environments
const require = createRequire(import.meta.url);

// Configure Neon to use WebSocket when running in Node/serverless
if (typeof window === "undefined") {
    neonConfig.webSocketConstructor = require("ws");
}

// Keep a single Prisma instance across hot reloads (dev)
declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
const connectionString = process.env.DATABASE_URL;
const adapter = connectionString ? new PrismaNeon({ connectionString }) : null;
const PrismaClientClass = require("@prisma/client").PrismaClient as typeof import("@prisma/client").PrismaClient;

let prismaInstance: PrismaClient | undefined = globalForPrisma.prisma;

export function getPrisma(): PrismaClient {
    if (!connectionString) {
        throw new Error("DATABASE_URL environment variable is required");
    }
    if (!prismaInstance) {
        prismaInstance = new PrismaClientClass({
            adapter,
            log: ["error", "warn"],
        } as any);

        if (process.env.NODE_ENV !== "production") {
            globalForPrisma.prisma = prismaInstance;
        }
    }
    return prismaInstance;
}

export const db = getPrisma();
export default getPrisma;
