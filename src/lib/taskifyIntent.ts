// taskifyIntent.ts
// Placeholder stub for creating tasks from intent action items.
import type { ExtractedIntent } from "./intentTypes.js";

type TaskRefs = {
    clientRef?: string;
    projectRef?: string;
    noteRef?: string;
    playRef?: string;
};

export async function taskifyIntent(intent: ExtractedIntent, refs: TaskRefs) {
    // TODO: implement actual task creation (e.g., in Notion/DB) using intent.actionItems.
    // Attach owner/due if present, relate to note/client/project/play.
    return {
        taskCount: intent.actionItems.length,
        refs,
    };
}
