import { getPrisma } from "../src/lib/prisma.js";

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") {
        return res.status(405).json({ status: "error", message: "Method not allowed" });
    }

    try {
        const prisma = getPrisma();
        const { run_id, asset_title, output_content } = req.body || {};

        if (!run_id || !asset_title || !output_content) {
            return res.status(400).json({
                status: "error",
                message: "run_id, asset_title, and output_content are required.",
            });
        }

        const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;
        const run = await prisma.run.findFirst({
            where: {
                id: run_id,
                ...(allowedWorkspaceId ? { play: { workspaceId: allowedWorkspaceId } } : {}),
            },
            include: { play: true, shape: true },
        });

        if (!run) {
            return res.status(404).json({
                status: "error",
                message: "Run not found or not authorized for this workspace.",
            });
        }

        const existing = await prisma.asset.findFirst({ where: { runId: run_id } });
        if (existing) {
            return res.status(200).json({
                status: "exists",
                asset_id: existing.id,
                run_id,
            });
        }

        const asset = await prisma.asset.create({
            data: {
                runId: run_id,
                playId: run.playId ?? undefined,
                shapeId: run.shapeId ?? undefined,
                title: asset_title,
                content: output_content,
                excerpt: output_content.slice(0, 240),
            },
            select: { id: true, runId: true },
        });

        return res.status(201).json({
            status: "ok",
            asset_id: asset.id,
            run_id: asset.runId,
        });
    } catch (error: any) {
        console.error("[bank-asset API error]", error);
        return res.status(500).json({
            status: "error",
            message: `Failed to bank asset. ${error?.message ?? "Unknown error"}`,
        });
    }
}
