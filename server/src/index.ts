// server/src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server";
import type { McpResponder } from "@modelcontextprotocol/sdk/types";

//
// TEMP MEMORY STORE
//
const memoryStore: Array<{ type: string; content: string }> = [];

//
// DEFINE COREBLOCKS
//
const COREBLOCKS = ["notes", "tasks", "ideas"] as const;

//
// CREATE MCP SERVER
//
const server = new Server({
    name: "Context Vault MCP",
    version: "1.0.0",
    tools: {
        //
        // 1. Return the list of CoreBlocks
        //
        cv_coreblocks: async () => {
            return {
                coreblocks: COREBLOCKS,
            };
        },

        //
        // 2. Run a CoreBlock (mock outputs for now)
        //
        cv_play: async ({ block, input }: { block: string; input: string }) => {
            if (!COREBLOCKS.includes(block as any)) {
                throw new Error(`Unknown block: ${block}`);
            }

            const outputs = {
                notes: `📝 Note created:\n${input}`,
                tasks: `📋 Tasks extracted:\n- ${input}`,
                ideas: `💡 Idea generated:\n${input}`,
            } as any;

            return {
                block,
                output: outputs[block] ?? input,
            };
        },

        //
        // 3. Save memory (temporary)
        //
        cv_mem_save: async ({ type, content }: { type: string; content: string }) => {
            memoryStore.push({ type, content });

            return {
                status: "saved",
                total: memoryStore.length,
            };
        },

        //
        // 4. Search memory
        //
        cv_mem_search: async ({ query }: { query: string }) => {
            const results = memoryStore.filter(
                (m) =>
                    m.content.toLowerCase().includes(query.toLowerCase()) ||
                    m.type.toLowerCase().includes(query.toLowerCase())
            );

            return {
                query,
                results,
            };
        },
    },
});

//
// Vercel Handler Wrapper
//
export async function handleRequest(req: any, res: any) {
    return server.handleHttp(req, res);
}
