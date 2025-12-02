import { extractIntent } from "../src/lib/intentExtractor.js";
import { bankCanonBlocks } from "../src/lib/bankCanonBlocks.js";

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") {
        return res.status(405).json({ status: "error", message: "Method not allowed" });
    }

    try {
        const { raw_text, workspace_id, bank } = req.body || {};
        const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;
        const resolvedWorkspaceId = allowedWorkspaceId ?? workspace_id;

        if (allowedWorkspaceId && workspace_id && workspace_id !== allowedWorkspaceId) {
            return res.status(403).json({ status: "error", message: "Workspace ID mismatch." });
        }

        if (!raw_text) {
            return res.status(400).json({ status: "error", message: "raw_text is required." });
        }

        const intent = extractIntent(raw_text);

        let banked = null;
        if (bank) {
            banked = await bankCanonBlocks(intent as any, resolvedWorkspaceId || undefined, {});
        }

        return res.status(200).json({
            status: "ok",
            intent,
            banked,
        });
    } catch (error: any) {
        console.error("[ingest-context API error]", error);
        return res.status(500).json({
            status: "error",
            message: error?.message || "Unknown error ingesting context.",
        });
    }
}
