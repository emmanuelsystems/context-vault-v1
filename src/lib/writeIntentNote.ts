// writeIntentNote.ts
// Stub for writing a structured Intent note (e.g., to Notion/DB). Replace with actual persistence.
import type { ExtractedIntent } from "./intentTypes.js";
import { getPrisma } from "./prisma.js";

type NoteRef = {
    clientRef?: string;
    projectRef?: string;
    playRef?: string;
    canonIds?: { whyId?: string | null; whatId?: string | null; constraintsId?: string | null };
    workspaceId?: string;
};

export async function writeIntentNote(intent: ExtractedIntent, refs: NoteRef, workspaceId?: string) {
    const prisma = getPrisma();
    const resolvedWorkspaceId = workspaceId ?? refs.workspaceId;
    const note = {
        title: intent.inferredTitle || "Intent",
        tldr: intent.what || intent.why || "",
        why: intent.why,
        what: intent.what,
        constraints: intent.constraints.join("\n"),
        actionItems: intent.actionItems,
        openQuestions: intent.openQuestions,
        quotes: intent.quotes,
        canonLinks: refs.canonIds,
        meta: {
            clientRef: refs.clientRef,
            projectRef: refs.projectRef,
            playRef: refs.playRef,
        },
    };

    const created = await prisma.note.create({
        data: {
            title: note.title,
            summaryContent: JSON.stringify(note),
            workspaceId: resolvedWorkspaceId || "unknown_workspace",
        },
        select: { id: true },
    });

    return {
        noteId: created.id,
        note,
    };
}
