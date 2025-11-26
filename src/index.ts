// index.ts

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { RunStatus } from "@prisma/client";
import { getPrisma } from "./lib/prisma.js";
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
        inputSchema: z.object({}).strict(),
        outputSchema: {
            status: z.string(),
            message: z.string(),
        },
    },
    async () => {
        try {
            const prisma = getPrisma();
            // Ping database - will throw if not connected
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
const playSchema = z.object({
    id: z.string().describe("The Play's unique ID."),
    name: z.string().describe("The title of the Play."),
    description: z.string().optional().describe("A brief description of the Play."),
});

server.registerTool(
    "cv_list_plays",
    {
        title: "List Available Plays",
        description: "Retrieves all Plays (workflows) accessible by the current workspace.",
        inputSchema: z.object({
            workspace_id: z.string().optional().describe("Optional workspace ID; if ALLOWED_WORKSPACE_ID is set, this must match."),
        }).strict(),
        outputSchema: z.object({
            status: z.string(),
            message: z.string().optional(),
            plays: z.array(playSchema),
        }),
    },
    async ({ workspace_id }) => {
        try {
            const prisma = getPrisma();

            // Resolve workspace from env or input; env wins if provided
            const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;
            const resolvedWorkspaceId = allowedWorkspaceId ?? workspace_id;

            if (!resolvedWorkspaceId) {
                const message = "Workspace ID not provided and ALLOWED_WORKSPACE_ID is not set.";
                return {
                    content: [{ type: "text", text: message }],
                    structuredContent: { status: "error", message, plays: [] },
                };
            }

            if (allowedWorkspaceId && workspace_id && workspace_id !== allowedWorkspaceId) {
                const message = "Workspace ID mismatch: request not allowed for this workspace.";
                return {
                    content: [{ type: "text", text: message }],
                    structuredContent: { status: "error", message, plays: [] },
                };
            }

            // Scoped query to the resolved workspace
            const plays = await prisma.play.findMany({
                where: {
                    workspaceId: resolvedWorkspaceId,
                },
                select: {
                    id: true,
                    name: true,
                    description: true,
                },
            });

            // Return success with retrieved data
            return {
                content: [{ type: "text", text: `Found ${plays.length} Plays for workspace ${resolvedWorkspaceId}.` }],
                structuredContent: { status: "ok", plays },
            };

        } catch (error: any) {
            // If the query fails (e.g., connection issue, schema mismatch), return a clean error
            console.error("Database Query Failed in cv_list_plays:", error);

            const output = {
                status: 'error',
                message: `Failed to retrieve plays. Check server logs: ${error.message || 'Unknown database error.'}`,
                plays: [],
            };

            return {
                content: [{ type: "text", text: output.message }],
                structuredContent: output,
            };
        }
    }
);

// --- Run Creation Tool (cv_create_run) ---
const runOutputSchema = z.object({
    run_id: z.string().describe("The Run's unique ID."),
    status: z.string().describe("Lifecycle status of the run."),
});

server.registerTool(
    "cv_create_run",
    {
        title: "Create Run",
        description: "Creates a Run record for a Play with the provided task goal and context snapshot.",
        inputSchema: z.object({
            play_id: z.string().describe("The Play ID to execute."),
            workspace_id: z.string().describe("Workspace ID for multi-tenant scoping."),
            task_goal: z.string().describe("User goal for this run (drives ASSET prompt)."),
            config_json: z.record(z.any()).optional().describe("Context snapshot (e.g., DAB role, Core Blocks, Shape ID)."),
        }).strict(),
        outputSchema: runOutputSchema,
    },
    async ({ play_id, workspace_id, task_goal, config_json }) => {
        try {
            const prisma = getPrisma();

            const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;
            const resolvedWorkspaceId = allowedWorkspaceId ?? workspace_id;

            if (!resolvedWorkspaceId) {
                const message = "Workspace ID not provided and ALLOWED_WORKSPACE_ID is not set.";
                return {
                    content: [{ type: "text", text: message }],
                    structuredContent: { run_id: "", status: "error" },
                };
            }

            if (allowedWorkspaceId && workspace_id && workspace_id !== allowedWorkspaceId) {
                const message = "Workspace ID mismatch: request not allowed for this workspace.";
                return {
                    content: [{ type: "text", text: message }],
                    structuredContent: { run_id: "", status: "error" },
                };
            }

            // Ensure Play exists in workspace
            const play = await prisma.play.findFirst({
                where: { id: play_id, workspaceId: resolvedWorkspaceId },
                select: { id: true },
            });

            if (!play) {
                const message = "Play not found for this workspace.";
                return {
                    content: [{ type: "text", text: message }],
                    structuredContent: { run_id: "", status: "error" },
                };
            }

            const configPayload = {
                task_goal,
                ...(config_json ?? {}),
            };

            const run = await prisma.run.create({
                data: {
                    playId: play_id,
                    status: RunStatus.PENDING,
                    configJson: JSON.stringify(configPayload),
                },
                select: {
                    id: true,
                    status: true,
                },
            });

            const output = { run_id: run.id, status: run.status };
            return {
                content: [{ type: "text", text: `Run created: ${run.id} (status: ${run.status})` }],
                structuredContent: output,
            };
        } catch (error: any) {
            console.error("Run creation failed in cv_create_run:", error);
            const message = error?.message || "Unknown error creating run.";
            return {
                content: [{ type: "text", text: message }],
                structuredContent: { run_id: "", status: "error" },
            };
        }
    }
);


export { server };
