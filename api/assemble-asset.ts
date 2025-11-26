import { getPrisma } from "../src/lib/prisma.js";

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") {
        return res.status(405).json({ asset_prompt: "", message: "Method not allowed" });
    }

    try {
        const prisma = getPrisma();
        const { run_id } = req.body || {};

        if (!run_id) {
            return res.status(400).json({
                asset_prompt: "",
                message: "run_id is required.",
            });
        }

        const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;
        const run = await prisma.run.findFirst({
            where: {
                id: run_id,
                ...(allowedWorkspaceId ? { play: { workspaceId: allowedWorkspaceId } } : {}),
            },
            include: {
                play: { include: { coreBlocks: true } },
                shape: true,
            },
        });

        if (!run) {
            return res.status(404).json({
                asset_prompt: "",
                message: "Run not found or not authorized for this workspace.",
            });
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

        return res.status(200).json({
            asset_prompt: assetPrompt,
            message: "ASSET prompt assembled.",
        });
    } catch (error: any) {
        console.error("[assemble-asset API error]", error);
        return res.status(500).json({
            asset_prompt: "",
            message: error?.message || "Unknown error assembling ASSET prompt.",
        });
    }
}
