import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { PrismaClient } from "@prisma/client";
import * as z from "zod";

// Create a single Prisma client for the whole server
const prisma = new PrismaClient();

const server = new McpServer({
    name: "context-vault-mcp",
    version: "1.0.0",
});

// Register health check tool
server.registerTool(
    "cv_health_check",
    {
        title: "Health Check",
        description: "Check if the MCP server and database are running",
        inputSchema: {},
        outputSchema: {
            status: z.string(),
            message: z.string(),
        },
    },
    async () => {
        try {
            // Simple DB ping – if this fails, Neon / Postgres isn’t reachable
            await prisma.$queryRaw`SELECT 1`;

            const output = {
                status: "ok",
                message: "MCP server is running and database connection is healthy.",
            };

            return {
                content: [{ type: "text", text: JSON.stringify(output) }],
                structuredContent: output,
            };
        } catch (error: any) {
            const output = {
                status: "error",
                message:
                    "MCP server is up, but database check failed: " +
                    (error?.message ?? "unknown error"),
            };

            return {
                content: [{ type: "text", text: JSON.stringify(output) }],
                structuredContent: output,
            };
        }
    }
);

export { server };
