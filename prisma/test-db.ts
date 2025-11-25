import 'dotenv/config';
import { prisma } from '../src/lib/prisma.js';

async function testDatabase() {
    console.log('🧪 Testing Neon Database Connection...\n');

    try {
        // Test 1: Count Records
        console.log('1️⃣ Counting records...');
        const [playCount, blockCount] = await Promise.all([
            prisma.play.count(),
            prisma.coreBlock.count(),
        ]);
        console.log(`   ✅ Found ${playCount} Play(s)`);
        console.log(`   ✅ Found ${blockCount} CoreBlock(s)\n`);

        // Test 2: Query Play with Relations
        console.log('2️⃣ Querying Play with CoreBlock relations...');
        const plays = await prisma.play.findMany({
            include: {
                coreBlocks: true,
            },
        });

        if (plays.length === 0) {
            console.log('   ⚠️  No plays found. Run seed script first.\n');
        } else {
            plays.forEach((play) => {
                console.log(`   ✅ Play: "${play.name}"`);
                console.log(`      - ID: ${play.id}`);
                console.log(`      - Slug: ${play.slug}`);
                console.log(`      - Workspace: ${play.workspaceId || 'N/A'}`);
                console.log(`      - Linked CoreBlocks: ${play.coreBlocks.length}`);
                play.coreBlocks.forEach((block, idx) => {
                    console.log(`         ${idx + 1}. ${block.title} (${block.kind})`);
                });
                console.log('');
            });
        }

        // Test 3: Query CoreBlocks
        console.log('3️⃣ Querying CoreBlocks...');
        const blocks = await prisma.coreBlock.findMany({
            include: {
                plays: {
                    select: {
                        name: true,
                        slug: true,
                    },
                },
            },
        });

        blocks.forEach((block) => {
            console.log(`   ✅ CoreBlock: "${block.title}"`);
            console.log(`      - Kind: ${block.kind}`);
            console.log(`      - Tags: ${block.tags || 'None'}`);
            console.log(`      - Linked to ${block.plays.length} Play(s)`);
            block.plays.forEach((play) => {
                console.log(`         - ${play.name} (${play.slug})`);
            });
            console.log('');
        });

        // Test 4: Test Workspace Filtering
        console.log('4️⃣ Testing workspace filtering...');
        const workspaceId = 'client_123_syndicate';
        const workspacePlays = await prisma.play.findMany({
            where: {
                workspaceId,
            },
        });
        console.log(`   ✅ Found ${workspacePlays.length} Play(s) for workspace "${workspaceId}"\n`);

        // Test 5: Test Create & Delete Operation
        console.log('5️⃣ Testing CRUD operations...');
        const testBlock = await prisma.coreBlock.create({
            data: {
                kind: 'SECONDARY',
                title: 'Test Block - Will be deleted',
                content: 'This is a test block',
                tags: 'test,temporary',
            },
        });
        console.log(`   ✅ Created test CoreBlock: ${testBlock.id}`);

        await prisma.coreBlock.delete({
            where: {
                id: testBlock.id,
            },
        });
        console.log(`   ✅ Deleted test CoreBlock: ${testBlock.id}\n`);

        console.log('🎉 All tests passed! Database is working correctly.\n');

    } catch (error) {
        console.error('❌ Test failed:');
        console.error(error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

testDatabase();
