// bankCanonBlocks.ts
// Placeholder stub for persisting canonical intent blocks (WHY/WHAT/CONSTRAINTS).
// Wire to Notion/DB as needed.
import type { ExtractedIntent } from "./intentTypes.js";

type CanonRef = {
    clientRef?: string;
    projectRef?: string;
    playRef?: string;
    noteRef?: string;
};

export async function bankCanonBlocks(intent: ExtractedIntent, refs: CanonRef) {
    // TODO: implement actual persistence (Notion/DB) for Canon blocks.
    // Example shape:
    // - create WHY block with intent.why
    // - create WHAT block with intent.what
    // - create CONSTRAINTS block with intent.constraints
    // Return IDs to link in notes/tasks.
    return {
        whyId: "TODO",
        whatId: "TODO",
        constraintsId: intent.constraints.length ? "TODO" : null,
        refs,
    };
}
