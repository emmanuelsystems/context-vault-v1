// index.ts

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import prisma from "./lib/prisma.js";
import * as z from "zod";

const server = new McpServer({
    name: "context-vault-mcp",
    version: "1.0.0",
});

// --- Health Check Tool (Tool you already have) ---
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

// --- Context Retrieval Tool (The New Tool) ---
server.registerTool(
    "cv_list_plays",
    {
        title: "List Available Plays",
        description: "Retrieves all Plays (workflows) accessible by the current workspace.",
        // The input requires the workspace_id for the multi-tenancy check
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
        // Query the database using the injected prisma client
        const plays = await prisma.play.findMany({
            where: {
                workspaceId: workspace_id, // CRITICAL: Enforces multi-tenancy
            },
            select: {
                id: true,
                name: true,
                description: true,
            },
        });

        // The tool output adheres to the required MCP structure
        return {
            content: [{ type: "text", text: `Found ${plays.length} Plays.` }],
            structuredContent: plays,
        };
    }
);


export { server };