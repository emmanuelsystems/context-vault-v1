import { getPrisma } from "../src/lib/prisma.js";

export default async function handler(req: any, res: any) {
    if (req.method !== "GET") {
        return res.status(405).json({ status: "error", message: "Method not allowed" });
    }

    try {
        const prisma = getPrisma();
        const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;
        const workspace_id = req.query.workspace_id as string | undefined;
        const resolvedWorkspaceId = allowedWorkspaceId ?? workspace_id;

        if (!resolvedWorkspaceId) {
            return res.status(400).json({
                status: "error",
                message: "Workspace ID not provided and ALLOWED_WORKSPACE_ID is not set.",
                plays: [],
            });
        }

        if (allowedWorkspaceId && workspace_id && workspace_id !== allowedWorkspaceId) {
            return res.status(403).json({
                status: "error",
                message: "Workspace ID mismatch: request not allowed for this workspace.",
                plays: [],
            });
        }

        const plays = await prisma.play.findMany({
            where: { workspaceId: resolvedWorkspaceId },
            select: { id: true, name: true, description: true },
        });

        return res.status(200).json({
            status: "ok",
            plays,
        });
    } catch (error: any) {
        console.error("[plays API error]", error);
        return res.status(500).json({
            status: "error",
            message: `Failed to retrieve plays. ${error?.message ?? "Unknown error"}`,
            plays: [],
        });
    }
}
