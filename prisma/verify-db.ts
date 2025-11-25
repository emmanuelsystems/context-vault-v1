import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

async function verifyDatabase() {
    console.log('🔍 Verifying Neon Database...\n');

    try {
        // Query all data
        const [plays, blocks] = await Promise.all([
            prisma.play.findMany({
                include: { coreBlocks: true },
            }),
            prisma.coreBlock.findMany({
                include: { plays: { select: { name: true } } },
            }),
        ]);

        console.log(`📊 Database Statistics:`);
        console.log(`   - Plays: ${plays.length}`);
        console.log(`   - CoreBlocks: ${blocks.length}\n`);

        if (plays.length > 0) {
            console.log(`✅ Plays:`);
            plays.forEach((play) => {
                console.log(`   - ${play.name} (workspace: ${play.workspaceId || 'none'})`);
                console.log(`     Linked to ${play.coreBlocks.length} CoreBlock(s)`);
            });
            console.log('');
        }

        if (blocks.length > 0) {
            console.log(`✅ CoreBlocks:`);
            blocks.forEach((block) => {
                console.log(`   - ${block.title} (${block.kind})`);
                console.log(`     Linked to ${block.plays.length} Play(s)`);
            });
            console.log('');
        }

        console.log('✅ Database verification complete!\n');
    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

verifyDatabase();
