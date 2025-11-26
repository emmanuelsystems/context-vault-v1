import { getPrisma } from "../src/lib/prisma.js";

export default async function handler(req: any, res: any) {
    if (req.method !== "GET") {
        return res.status(405).json({ status: "error", message: "Method not allowed" });
    }

    try {
        const prisma = getPrisma();
        const play_id = req.query.play_id as string | undefined;
        const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;

        if (!play_id) {
            return res.status(400).json({ status: "error", message: "play_id is required" });
        }

        const play = await prisma.play.findFirst({
            where: {
                id: play_id,
                ...(allowedWorkspaceId ? { workspaceId: allowedWorkspaceId } : {}),
            },
            select: {
                id: true,
                name: true,
                description: true,
                coreBlocks: {
                    select: {
                        id: true,
                        title: true,
                        kind: true,
                    },
                },
            },
        });

        if (!play) {
            return res.status(404).json({ status: "error", message: "Play not found or not authorized" });
        }

        // Placeholder DAB role until linked in schema
        const dabRole = "Workbook Architect";

        return res.status(200).json({
            status: "ok",
            play,
            dab_role: dabRole,
            core_blocks: play.coreBlocks.map((cb: any) => ({
                id: cb.id,
                title: cb.title,
                kind: cb.kind,
            })),
        });
    } catch (error: any) {
        console.error("[play-details API error]", error);
        return res.status(500).json({
            status: "error",
            message: error?.message || "Unknown error fetching play details.",
        });
    }
}
