import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Client as Neon } from "@neondatabase/serverless";
import ws from "ws";

// Configure WebSocket for Neon
if (typeof window === "undefined") {
    neonConfig.webSocketConstructor = ws;
}

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

// Get the connection string
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is required");
}

// Instantiate the Neon Client
const neon = new Neon(connectionString);

// Instantiate the Adapter using the Neon Client
const adapter = new PrismaNeon(neon);

// Instantiate the Prisma Client with the adapter
export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        adapter,
        log: ["error", "warn"],
    });

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;