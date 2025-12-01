// index.ts

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getPrisma } from "./lib/prisma.js";
import { extractIntent } from "./lib/intentExtractor.js";
import { bankCanonBlocks } from "./lib/bankCanonBlocks.js";
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
                    status: "PENDING",
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

// --- ASSET Assembly Tool (cv_assemble_asset) ---
server.registerTool(
    "cv_assemble_asset",
    {
        title: "Assemble ASSET Prompt",
        description: "Builds the final ASSET prompt bundle from a Run: pulls Play Core Blocks, task goal, and Shape.",
        inputSchema: z.object({
            run_id: z.string().describe("The Run ID produced by cv_create_run."),
        }).strict(),
        outputSchema: z.object({
            asset_prompt: z.string().describe("The fully assembled ASSET prompt text."),
        }),
    },
    async ({ run_id }) => {
        try {
            const prisma = getPrisma();
            const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;

            const run = await prisma.run.findFirst({
                where: {
                    id: run_id,
                    ...(allowedWorkspaceId ? { play: { workspaceId: allowedWorkspaceId } } : {}),
                },
                include: {
                    play: {
                        include: {
                            coreBlocks: true,
                        },
                    },
                    shape: true,
                },
            });

            if (!run) {
                const message = "Run not found or not authorized for this workspace.";
                return {
                    content: [{ type: "text", text: message }],
                    structuredContent: { asset_prompt: "" },
                };
            }

            const taskGoal = (() => {
                try {
                    const parsed = run.configJson ? JSON.parse(run.configJson) : {};
                    return parsed.task_goal || parsed.taskGoal || "";
                } catch {
                    return "";
                }
            })();

            const coreBlocks = run.play?.coreBlocks ?? [];
            const shape = run.shape;

            const sourcesSection =
                coreBlocks.length === 0
                    ? "No Core Blocks provided."
                    : coreBlocks
                          .map(
                              (cb, idx) =>
                                  `(${idx + 1}) [${cb.kind}] ${cb.title}\n${cb.content}`
                          )
                          .join("\n\n");

            const structuredOutput =
                shape?.schemaJson ||
                (shape?.name ? `Use shape: ${shape.name}` : "Return well-structured JSON.");

            const assistantSection = run.play
                ? `You are the assistant executing Play "${run.play.name}".`
                : "You are the assistant executing the requested Play.";

            const assetPrompt = [
                `ASSISTANT\n${assistantSection}`,
                `SOURCES\n${sourcesSection}`,
                `STRUCTURED OUTPUT\n${structuredOutput}`,
                `EXPECTATIONS\n- Cite relevant sources by number when used.\n- Keep responses concise and actionable.\n- Follow the structured output exactly.`,
                `TASK\n${taskGoal || "Perform the requested task with the provided context."}`,
            ].join("\n\n");

            return {
                content: [{ type: "text", text: "ASSET prompt assembled." }],
                structuredContent: { asset_prompt: assetPrompt },
            };
        } catch (error: any) {
            console.error("ASSET assembly failed:", error);
            const message = error?.message || "Unknown error assembling ASSET prompt.";
            return {
                content: [{ type: "text", text: message }],
                structuredContent: { asset_prompt: "" },
            };
        }
    }
);

// --- Run Status Update Tool (cv_update_run_status) ---
const runStatusEnum = z.enum(["PENDING", "IN_PROGRESS", "PASS", "FAIL"]);

server.registerTool(
    "cv_update_run_status",
    {
        title: "Update Run Status",
        description: "Updates the lifecycle status of a Run.",
        inputSchema: z.object({
            run_id: z.string().describe("The Run ID to update."),
            new_status: runStatusEnum.describe("New status for the Run."),
        }).strict(),
        outputSchema: z.object({
            run_id: z.string(),
            status: runStatusEnum,
        }),
    },
    async ({ run_id, new_status }) => {
        try {
            const prisma = getPrisma();
            const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;

            // Enforce workspace scoping by joining to Play
            const run = await prisma.run.findFirst({
                where: {
                    id: run_id,
                    ...(allowedWorkspaceId ? { play: { workspaceId: allowedWorkspaceId } } : {}),
                },
                select: { id: true },
            });

            if (!run) {
                const message = "Run not found or not authorized for this workspace.";
                return {
                    content: [{ type: "text", text: message }],
                    structuredContent: { run_id: run_id, status: "PENDING" },
                };
            }

            const updated = await prisma.run.update({
                where: { id: run_id },
                data: { status: new_status },
                select: { id: true, status: true },
            });

            return {
                content: [{ type: "text", text: `Run ${updated.id} status set to ${updated.status}` }],
                structuredContent: { run_id: updated.id, status: updated.status },
            };
        } catch (error: any) {
            console.error("Run status update failed:", error);
            const message = error?.message || "Unknown error updating run status.";
            return {
                content: [{ type: "text", text: message }],
                structuredContent: { run_id: run_id, status: "PENDING" },
            };
        }
    }
);

// --- Asset Banking Tool (cv_bank_asset) ---
server.registerTool(
    "cv_bank_asset",
    {
        title: "Bank Asset",
        description: "Creates a quote-locked Asset record from a Run's verified output.",
        inputSchema: z.object({
            run_id: z.string().describe("Run ID to bank output from."),
            asset_title: z.string().describe("Title for the asset."),
            output_content: z.string().describe("Final content to store as the asset body."),
        }).strict(),
        outputSchema: z.object({
            asset_id: z.string(),
            run_id: z.string(),
            status: z.string(),
        }),
    },
    async ({ run_id, asset_title, output_content }) => {
        try {
            const prisma = getPrisma();
            const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;

            const run = await prisma.run.findFirst({
                where: {
                    id: run_id,
                    ...(allowedWorkspaceId ? { play: { workspaceId: allowedWorkspaceId } } : {}),
                },
                include: {
                    play: true,
                    shape: true,
                },
            });

            if (!run) {
                const message = "Run not found or not authorized for this workspace.";
                return {
                    content: [{ type: "text", text: message }],
                    structuredContent: { asset_id: "", run_id, status: "error" },
                };
            }

            // Enforce one asset per run
            const existing = await prisma.asset.findFirst({ where: { runId: run_id } });
            if (existing) {
                const message = "Asset already exists for this run.";
                return {
                    content: [{ type: "text", text: message }],
                    structuredContent: { asset_id: existing.id, run_id, status: "exists" },
                };
            }

            // Create asset linked to run, and optionally play/shape
            const asset = await prisma.asset.create({
                data: {
                    runId: run_id,
                    playId: run.playId ?? undefined,
                    shapeId: run.shapeId ?? undefined,
                    title: asset_title,
                    content: output_content,
                    excerpt: output_content.slice(0, 240),
                },
                select: {
                    id: true,
                    runId: true,
                },
            });

            return {
                content: [{ type: "text", text: `Asset banked: ${asset.id}` }],
                structuredContent: { asset_id: asset.id, run_id: asset.runId, status: "ok" },
            };
        } catch (error: any) {
            console.error("Asset banking failed:", error);
            const message = error?.message || "Unknown error creating asset.";
            return {
                content: [{ type: "text", text: message }],
                structuredContent: { asset_id: "", run_id, status: "error" },
            };
        }
    }
);

// --- Context Ingestion Tool (cv_ingest_context) ---
server.registerTool(
    "cv_ingest_context",
    {
        title: "Ingest Context",
        description: "Ingest raw text, extract intent (Why/What/Constraints), and optionally bank Canon blocks.",
        inputSchema: z.object({
            raw_text: z.string().describe("Unstructured text to interpret (e.g., chat transcript, form dump)."),
            workspace_id: z.string().optional().describe("Workspace for scoping; env ALLOWED_WORKSPACE_ID overrides."),
            bank: z.boolean().optional().describe("If true, bank WHY/WHAT/CONSTRAINTS Canon blocks immediately."),
        }).strict(),
        outputSchema: z.object({
            status: z.string(),
            intent: z.any(),
            banked: z
                .object({
                    whyId: z.string().nullable().optional(),
                    whatId: z.string().nullable().optional(),
                    constraintsId: z.string().nullable().optional(),
                })
                .nullable()
                .optional(),
        }),
    },
    async ({ raw_text, workspace_id, bank }) => {
        try {
            const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;
            const resolvedWorkspaceId = allowedWorkspaceId ?? workspace_id;

            if (allowedWorkspaceId && workspace_id && workspace_id !== allowedWorkspaceId) {
                const message = "Workspace ID mismatch: request not allowed for this workspace.";
                return {
                    content: [{ type: "text", text: message }],
                    structuredContent: { status: "error", intent: null, banked: null },
                };
            }

            const intent = extractIntent(raw_text);

            let banked = null;
            if (bank) {
                banked = await bankCanonBlocks(intent, resolvedWorkspaceId || undefined, {});
            }

            return {
                content: [{ type: "text", text: "Intent extracted." }],
                structuredContent: { status: "ok", intent, banked },
            };
        } catch (error: any) {
            console.error("Context ingestion failed:", error);
            const message = error?.message || "Unknown error ingesting context.";
            return {
                content: [{ type: "text", text: message }],
                structuredContent: { status: "error", intent: null, banked: null },
            };
        }
    }
);

export { server };
