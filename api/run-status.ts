import { getPrisma } from "../src/lib/prisma.js";

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") {
        return res.status(405).json({ status: "error", message: "Method not allowed" });
    }

    try {
        const prisma = getPrisma();
        const { run_id, new_status } = req.body || {};

        if (!run_id || !new_status) {
            return res.status(400).json({
                status: "error",
                message: "run_id and new_status are required.",
            });
        }

        const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;
        const run = await prisma.run.findFirst({
            where: {
                id: run_id,
                ...(allowedWorkspaceId ? { play: { workspaceId: allowedWorkspaceId } } : {}),
            },
            select: { id: true },
        });

        if (!run) {
            return res.status(404).json({
                status: "error",
                message: "Run not found or not authorized for this workspace.",
            });
        }

        const updated = await prisma.run.update({
            where: { id: run_id },
            data: { status: new_status },
            select: { id: true, status: true },
        });

        return res.status(200).json({
            status: "ok",
            run_id: updated.id,
            run_status: updated.status,
        });
    } catch (error: any) {
        console.error("[run-status API error]", error);
        return res.status(500).json({
            status: "error",
            message: `Failed to update run status. ${error?.message ?? "Unknown error"}`,
        });
    }
}
