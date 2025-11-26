// Seed: Workbook Module Drafting (v1) Play + Core Blocks (CJS runner with Neon adapter)
require("dotenv/config");
const { PrismaNeon } = require("@prisma/adapter-neon");
const { neonConfig } = require("@neondatabase/serverless");
const ws = require("ws");
const { PrismaClient, CoreBlockKind } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is required in your environment to run this seed.");
}

// Configure Neon WebSocket for Node/serverless
neonConfig.webSocketConstructor = ws;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter, log: ["error", "warn"] });

async function main() {
    const workspaceId = process.env.ALLOWED_WORKSPACE_ID || "client_123_syndicate";
    const playSlug = "workbook-module-drafting-v1";

    const coreBlocks = [
        {
            title: "Client Context",
            kind: CoreBlockKind.CANON,
            tags: "client,context,tone,constraints",
            content:
                "Client industry, goals, tone, constraints. Must thread tone/audience through module. Use for alignment in drafting.",
        },
        {
            title: "Workbook Style Guide",
            kind: CoreBlockKind.CANON,
            tags: "style,voice,format",
            content:
                "Preferred workbook voice, length/format limits, section ordering rules, visuals policy. Keep modules consistent across clients.",
        },
        {
            title: "Prior Module Summary",
            kind: CoreBlockKind.SECONDARY,
            tags: "module1,recap,bridge",
            content:
                "Short summary of Module 1 (recap, key takeaways, tone). Use to bridge into new module and maintain continuity.",
        },
        {
            title: "Snippet References",
            kind: CoreBlockKind.SECONDARY,
            tags: "snippets,guide,scaffold,exercise,qa,export",
            content:
                "Snippets to invoke:\n- /Module_Scaffold_JSON\n- /Module_Drafting_Guide\n- /Exercise_Generator\n- /QA_Checklist_Module\n- /Export_Packager\n(links/contents can be added later).",
        },
        {
            title: "Runbook Steps",
            kind: CoreBlockKind.CANON,
            tags: "steps,workflow",
            content:
                "STEP 1 Intake/Context: gather prior module, audience, outcomes, constraints; normalize into snapshot; confirm 5–7 assumptions (use /Module_Drafting_Guide).\n" +
                "STEP 2 Scaffold: full module skeleton (recap, core concept, guided example, independent exercise, reflection); add outcomes + done-ness; pick running example (use /Module_Scaffold_JSON).\n" +
                "STEP 3 Draft: draft each section, keep client alignment, add transitions (use /Module_Drafting_Guide).\n" +
                "STEP 4 Exercises/QA/Export: add warm-up/follow-along/solo sprint/AAR; QA with clarity/relevance/practicality/length/tone (use /Exercise_Generator, /QA_Checklist_Module); package export-ready JSON + doc outline (use /Export_Packager); bank asset.",
        },
    ];

    const createdBlocks = [];
    for (const block of coreBlocks) {
        const existing = await prisma.coreBlock.findFirst({
            where: { title: block.title },
            select: { id: true },
        });
        let record;
        if (existing) {
            record = await prisma.coreBlock.update({
                where: { id: existing.id },
                data: {
                    kind: block.kind,
                    content: block.content,
                    tags: block.tags,
                },
                select: { id: true, title: true },
            });
        } else {
            record = await prisma.coreBlock.create({
                data: block,
                select: { id: true, title: true },
            });
        }
        createdBlocks.push(record);
    }

    const play = await prisma.play.upsert({
        where: { slug: playSlug },
        update: {
            name: "Workbook Module Drafting (v1)",
            description:
                "Structured workflow to draft a high-quality workbook module: intake context, build scaffold, draft content, add exercises, QA, and package export-ready output.",
            workspaceId,
            coreBlocks: {
                set: [],
                connect: createdBlocks.map((b) => ({ id: b.id })),
            },
        },
        create: {
            slug: playSlug,
            name: "Workbook Module Drafting (v1)",
            description:
                "Structured workflow to draft a high-quality workbook module: intake context, build scaffold, draft content, add exercises, QA, and package export-ready output.",
            workspaceId,
            coreBlocks: {
                connect: createdBlocks.map((b) => ({ id: b.id })),
            },
        },
        select: { id: true, name: true, workspaceId: true },
    });

    console.log(`Play upserted: ${play.name} (${play.id}) for workspace ${play.workspaceId}`);
}

main()
    .catch((err) => {
        console.error("Seed failed", err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
