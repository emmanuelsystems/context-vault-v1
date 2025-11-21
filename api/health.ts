// import prisma from "../src/lib/prisma.js"; // Commented out static import

export default async function handler(req: any, res: any) {
    try {
        console.log("Health check started...");

        // Dynamic import to catch initialization errors
        console.log("Importing Prisma...");
        const prismaModule = await import("../src/lib/prisma.js");
        const prisma = prismaModule.default;
        console.log("Prisma imported successfully.");

        // Ping the database
        console.log("Querying database...");
        await prisma.$queryRaw`SELECT 1`;
        console.log("Database query successful.");

        res.status(200).json({
            status: "ok",
            database: "connected",
            timestamp: new Date().toISOString()
        });
    } catch (error: any) {
        console.error("[Health Check Error]", error);
        // Return 200 even on error so we can see the message in the browser
        res.status(200).json({
            status: "error",
            database: "disconnected",
            error: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString()
        });
    }
}
