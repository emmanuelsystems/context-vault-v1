import 'dotenv/config';
import { CoreBlockKind } from '@prisma/client';
import { prisma } from '../src/lib/prisma.js';

async function main() {
    console.log('Starting seed...');

    // 1. Cleanup
    console.log('Cleaning up old data...');
    await prisma.asset.deleteMany();
    await prisma.run.deleteMany();
    await prisma.play.deleteMany();
    await prisma.coreBlock.deleteMany();

    // 2. Create CoreBlocks
    console.log('Creating CoreBlocks...');
    const block1 = await prisma.coreBlock.create({
        data: {
            kind: CoreBlockKind.CANON,
            title: 'Company Mission',
            content: 'To organize the world\'s information...',
            tags: 'mission,vision',
        },
    });

    const block2 = await prisma.coreBlock.create({
        data: {
            kind: CoreBlockKind.SECONDARY,
            title: 'Q4 Goals',
            content: '1. Increase revenue by 20%...',
            tags: 'goals,q4',
        },
    });

    // 3. Create Play with Workspace Scope and Relations
    console.log('Creating Play...');
    const play = await prisma.play.create({
        data: {
            slug: 'test-play-1',
            name: 'Test Play 1',
            description: 'A test play for development.',
            workspaceId: 'client_123_syndicate',
            coreBlocks: {
                connect: [
                    { id: block1.id },
                    { id: block2.id },
                ],
            },
        },
    });

    console.log(`Created Play: ${play.name} (${play.id}) with workspaceId: ${play.workspaceId}`);
    console.log('Seed completed.');
}

main()
    .catch((e) => {
        console.error('Seed failed:');
        console.error(e);
        if (e instanceof Error) {
            console.error(e.message);
            console.error(e.stack);
        }
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
