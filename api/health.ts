import { getPrisma } from "../src/lib/prisma.js";

export default async function handler(req: any, res: any) {
    try {
        const prisma = getPrisma();
        // Ping the database
        await prisma.$queryRaw`SELECT 1`;

        res.status(200).json({
            status: "ok",
            database: "connected",
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error("[Health Check Error]", error);
        res.status(500).json({
            status: "error",
            database: "disconnected",
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}
