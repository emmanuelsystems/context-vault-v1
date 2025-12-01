// bankCanonBlocks.ts
// Persists canonical intent blocks (WHY/WHAT/CONSTRAINTS) into the CoreBlock table.

import { CoreBlockKind } from "@prisma/client";
import { getPrisma } from "./prisma.js";
import type { ExtractedIntent } from "./intentTypes.js";

type CanonRef = {
    clientRef?: string;
    projectRef?: string;
    playRef?: string;
    noteRef?: string;
    runRef?: string;
};

type BankResult = {
    whyId: string | null;
    whatId: string | null;
    constraintsId: string | null;
};

export async function bankCanonBlocks(intent: ExtractedIntent, workspaceId?: string, refs?: CanonRef): Promise<BankResult> {
    const prisma = getPrisma();

    const metaTags = [
        workspaceId ? `workspace:${workspaceId}` : null,
        refs?.clientRef ? `client:${refs.clientRef}` : null,
        refs?.projectRef ? `project:${refs.projectRef}` : null,
        refs?.playRef ? `play:${refs.playRef}` : null,
        refs?.runRef ? `run:${refs.runRef}` : null,
        refs?.noteRef ? `note:${refs.noteRef}` : null,
    ]
        .filter(Boolean)
        .join(",");

    const blocks = [
        intent.why
            ? {
                  title: intent.inferredTitle ? `${intent.inferredTitle} — WHY` : "Intent — WHY",
                  kind: CoreBlockKind.CANON,
                  content: intent.why,
                  tags: metaTags,
              }
            : null,
        intent.what
            ? {
                  title: intent.inferredTitle ? `${intent.inferredTitle} — WHAT` : "Intent — WHAT",
                  kind: CoreBlockKind.CANON,
                  content: intent.what,
                  tags: metaTags,
              }
            : null,
        intent.constraints.length
            ? {
                  title: intent.inferredTitle ? `${intent.inferredTitle} — CONSTRAINTS` : "Intent — CONSTRAINTS",
                  kind: CoreBlockKind.SECONDARY,
                  content: intent.constraints.join("\n"),
                  tags: metaTags,
              }
            : null,
    ].filter(Boolean) as { title: string; kind: CoreBlockKind; content: string; tags?: string }[];

    const ids = {
        whyId: null as string | null,
        whatId: null as string | null,
        constraintsId: null as string | null,
    };

    for (const block of blocks) {
        const created = await prisma.coreBlock.create({
            data: {
                title: block.title,
                kind: block.kind,
                content: block.content,
                tags: block.tags || null,
            },
            select: { id: true, title: true },
        });

        if (block.title.includes("WHY") && !ids.whyId) ids.whyId = created.id;
        else if (block.title.includes("WHAT") && !ids.whatId) ids.whatId = created.id;
        else if (block.title.toLowerCase().includes("constraint") && !ids.constraintsId) ids.constraintsId = created.id;
    }

    return ids;
}
