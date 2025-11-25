// index.ts

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import prisma from "./lib/prisma.js";
import * as z from "zod";

const server = new McpServer({
    name: "context-vault-mcp",
    version: "1.0.0",
});

// --- Health Check Tool (cv_health_check) ---
server.registerTool(
    "cv_health_check",
    {
        title: "Health Check",
        description: "Verify MCP server + database connection",
        inputSchema: {},
        outputSchema: {
            status: z.string(),
            message: z.string(),
        },
    },
    async () => {
        try {
            // Ping database — will throw if not connected
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
                    "MCP is running but database connection failed: " +
                    (error?.message ?? "unknown error"),
            };

            return {
                content: [{ type: "text", text: JSON.stringify(output) }],
                structuredContent: output,
            };
        }
    }
);

// --- Context Retrieval Tool (cv_list_plays) ---
server.registerTool(
    "cv_list_plays",
    {
        title: "List Available Plays",
        description: "Retrieves all Plays (workflows) accessible by the current workspace.",
        inputSchema: z.object({
            workspace_id: z.string().describe("The unique ID of the client workspace (used for scoping)."),
        }),
        outputSchema: z.array(
            z.object({
                id: z.string().describe("The Play's unique ID."),
                name: z.string().describe("The title of the Play."),
                description: z.string().optional().describe("A brief description of the Play."),
            })
        ),
    },
    async ({ workspace_id }) => {
        try {
            // CRITICAL: Database Query wrapped in try/catch to prevent 424 TaskGroup error
            const plays = await prisma.play.findMany({
                where: {
                    workspaceId: workspace_id, // We know this ID is client_123_syndicate
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                },
            });

            // Return success with retrieved data
            return {
                content: [{ type: "text", text: `Found ${plays.length} Plays for workspace ${workspace_id}.` }],
                structuredContent: plays,
            };

        } catch (error: any) {
            // If the query fails (e.g., connection issue, schema mismatch), return a clean error
            console.error("Database Query Failed in cv_list_plays:", error);

            const output = {
                status: 'error',
                message: `Failed to retrieve plays. Check server logs: ${error.message || 'Unknown database error.'}`
            };

            return {
                content: [{ type: "text", text: output.message }],
                structuredContent: output,
            };
        }
    }
);


export { server };