// taskifyIntent.ts
// Stub for creating tasks from intent action items. Replace with actual persistence.
import type { ExtractedIntent } from "./intentTypes.js";

type TaskRefs = {
    clientRef?: string;
    projectRef?: string;
    noteRef?: string;
    playRef?: string;
};

export async function taskifyIntent(intent: ExtractedIntent, refs: TaskRefs) {
    const tasks = intent.actionItems.map((item, idx) => ({
        title: item.text,
        owner: item.owner,
        due: item.due,
        refs: {
            ...refs,
        },
        localId: `task-${idx + 1}`,
    }));

    // TODO: persist tasks to your DB/Notion and return created IDs.
    return {
        taskCount: tasks.length,
        tasks,
    };
}
