import { getPrisma } from "../src/lib/prisma.js";

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") {
        return res.status(405).json({ status: "error", message: "Method not allowed" });
    }

    try {
        const prisma = getPrisma();
        const { play_id, workspace_id, task_goal, config_json } = req.body || {};

        if (!play_id || !workspace_id || !task_goal) {
            return res.status(400).json({
                status: "error",
                message: "play_id, workspace_id, and task_goal are required.",
            });
        }

        const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;
        const resolvedWorkspaceId = allowedWorkspaceId ?? workspace_id;

        if (!resolvedWorkspaceId) {
            return res.status(400).json({
                status: "error",
                message: "Workspace ID not provided and ALLOWED_WORKSPACE_ID is not set.",
            });
        }

        if (allowedWorkspaceId && workspace_id && workspace_id !== allowedWorkspaceId) {
            return res.status(403).json({
                status: "error",
                message: "Workspace ID mismatch: request not allowed for this workspace.",
            });
        }

        const play = await prisma.play.findFirst({
            where: { id: play_id, workspaceId: resolvedWorkspaceId },
            select: { id: true },
        });

        if (!play) {
            return res.status(404).json({
                status: "error",
                message: "Play not found for this workspace.",
            });
        }

        const configPayload = {
            task_goal,
            ...(config_json && typeof config_json === "object" ? config_json : {}),
        };

        const run = await prisma.run.create({
            data: {
                playId: play_id,
                status: "PENDING",
                configJson: JSON.stringify(configPayload),
            },
            select: { id: true, status: true },
        });

        return res.status(201).json({
            status: "ok",
            run_id: run.id,
            run_status: run.status,
        });
    } catch (error: any) {
        console.error("[runs API error]", error);
        return res.status(500).json({
            status: "error",
            message: `Failed to create run. ${error?.message ?? "Unknown error"}`,
        });
    }
}
