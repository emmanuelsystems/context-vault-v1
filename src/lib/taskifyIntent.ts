// taskifyIntent.ts
// Stub for creating tasks from intent action items. Replace with actual persistence.
import type { ExtractedIntent } from "./intentTypes.js";
import { getPrisma } from "./prisma.js";

type TaskRefs = {
    clientRef?: string;
    projectRef?: string;
    noteRef?: string;
    playRef?: string;
    runRef?: string;
    workspaceId?: string;
};

export async function taskifyIntent(intent: ExtractedIntent, refs: TaskRefs, workspaceId?: string) {
    const prisma = getPrisma();
    const resolvedWorkspaceId = workspaceId ?? refs.workspaceId ?? "unknown_workspace";
    const runId = refs.runRef;
    const tasks = intent.actionItems.map((item, idx) => ({
        title: item.text,
        owner: item.owner,
        due: item.due,
        refs: {
            ...refs,
        },
        localId: `task-${idx + 1}`,
    }));

    if (tasks.length > 0) {
        await prisma.task.createMany({
            data: tasks.map((t) => ({
                title: t.title,
                description: undefined,
                status: "OPEN",
                workspaceId: resolvedWorkspaceId,
                runId,
            })),
        });
    }

    return {
        taskCount: tasks.length,
        tasks,
    };
}
