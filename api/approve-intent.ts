import { bankCanonBlocks } from "../src/lib/bankCanonBlocks.js";
import { writeIntentNote } from "../src/lib/writeIntentNote.js";
import { taskifyIntent } from "../src/lib/taskifyIntent.js";

export default async function handler(req: any, res: any) {
    if (req.method !== "POST") {
        return res.status(405).json({ status: "error", message: "Method not allowed" });
    }

    try {
        const { workspace_id, intent, client_ref, project_ref, play_ref, run_ref, note_ref } = req.body || {};
        const allowedWorkspaceId = process.env.ALLOWED_WORKSPACE_ID;
        const resolvedWorkspaceId = allowedWorkspaceId ?? workspace_id;

        if (allowedWorkspaceId && workspace_id && workspace_id !== allowedWorkspaceId) {
            return res.status(403).json({ status: "error", message: "Workspace ID mismatch." });
        }

        if (!intent) {
            return res.status(400).json({ status: "error", message: "Intent payload is required." });
        }

        const canon = await bankCanonBlocks(intent, resolvedWorkspaceId || undefined, {
            clientRef: client_ref,
            projectRef: project_ref,
            playRef: play_ref,
            runRef: run_ref,
            noteRef: note_ref,
        });

        const note = await writeIntentNote(
            intent,
            {
                clientRef: client_ref,
                projectRef: project_ref,
                playRef: play_ref,
                canonIds: canon,
                workspaceId: resolvedWorkspaceId,
            },
            resolvedWorkspaceId || undefined
        );

        const tasks = await taskifyIntent(
            intent,
            {
                clientRef: client_ref,
                projectRef: project_ref,
                noteRef: note.noteId,
                playRef: play_ref,
                runRef: run_ref,
                workspaceId: resolvedWorkspaceId,
            },
            resolvedWorkspaceId || undefined
        );

        return res.status(200).json({
            status: "ok",
            note_id: note.noteId,
            tasks_created: tasks.taskCount,
            canon,
        });
    } catch (error: any) {
        console.error("[approve-intent API error]", error);
        return res.status(500).json({
            status: "error",
            message: error?.message || "Unknown error approving intent.",
        });
    }
}
