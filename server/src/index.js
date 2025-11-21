import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PrismaClient } from "@prisma/client";
import * as z from "zod";
// Create a single Prisma client instance
const prisma = new PrismaClient();
const server = new McpServer({
    name: "context-vault-mcp",
    version: "1.0.0",
});
// --- Health Check Tool ---
server.registerTool("cv_health_check", {
    title: "Health Check",
    description: "Verify MCP server + database connection",
    inputSchema: {},
    outputSchema: {
        status: z.string(),
        message: z.string(),
    },
}, async () => {
    try {
        // Ping database — will throw if not connected
        await prisma.$queryRaw `SELECT 1`;
        const output = {
            status: "ok",
            message: "MCP server is running and database connection is healthy.",
        };
        return {
            content: [{ type: "text", text: JSON.stringify(output) }],
            structuredContent: output,
        };
    }
    catch (error) {
        const output = {
            status: "error",
            message: "MCP is running but database connection failed: " +
                (error?.message ?? "unknown error"),
        };
        return {
            content: [{ type: "text", text: JSON.stringify(output) }],
            structuredContent: output,
        };
    }
});
export { server };
//# sourceMappingURL=index.js.map