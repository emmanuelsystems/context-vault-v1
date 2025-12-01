// writeIntentNote.ts
// Placeholder stub for writing a structured Intent note (e.g., to Notion).
import type { ExtractedIntent } from "./intentTypes.js";

type NoteRef = {
    clientRef?: string;
    projectRef?: string;
    playRef?: string;
    canonIds?: { whyId?: string | null; whatId?: string | null; constraintsId?: string | null };
};

export async function writeIntentNote(intent: ExtractedIntent, refs: NoteRef) {
    // TODO: implement actual note creation in Notion/DB.
    // Should include TL;DR, Why, What, Constraints, action items, open questions, quotes, and links to canon IDs.
    return {
        noteId: "TODO",
        refs,
    };
}
