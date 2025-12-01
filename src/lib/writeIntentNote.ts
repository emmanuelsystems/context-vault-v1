// writeIntentNote.ts
// Stub for writing a structured Intent note (e.g., to Notion/DB). Replace with actual persistence.
import type { ExtractedIntent } from "./intentTypes.js";

type NoteRef = {
    clientRef?: string;
    projectRef?: string;
    playRef?: string;
    canonIds?: { whyId?: string | null; whatId?: string | null; constraintsId?: string | null };
};

export async function writeIntentNote(intent: ExtractedIntent, refs: NoteRef) {
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

    // TODO: implement actual note creation in Notion/DB and return the created ID.
    return {
        noteId: "TODO",
        note,
    };
}
