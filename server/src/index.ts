import { createMcpServer } from "@modelcontextprotocol/sdk";

// Temporary placeholder data until Postgres is connected
const mockPlays = [
    { id: "play_001", title: "Discovery Workshop", description: "Structured analysis session." },
    { id: "play_002", title: "Readiness Assessment", description: "Evaluates system maturity." }
];

const mockCoreBlocks = [
    { id: "cb_001", title: "Canon: Strategy Principles" },
    { id: "cb_002", title: "Secondary: Industry Benchmarks" }
];

const server = createMcpServer({
    tools: {
        // --------------------------------------------
        // HEALTH CHECK
        // --------------------------------------------
        cv_health_check: async () => {
            return {
                status: "ok",
                message: "Context Vault MCP is operational"
            };
        },

        // --------------------------------------------
        // LIST PLAYS
        // --------------------------------------------
        cv_list_plays: async () => {
            return {
                plays: mockPlays
            };
        },

        // --------------------------------------------
        // LIST CORE BLOCKS
        // --------------------------------------------
        cv_list_core_blocks: async () => {
            return {
                coreBlocks: mockCoreBlocks
            };
        },

        // --------------------------------------------
        // CREATE RUN
        // --------------------------------------------
        cv_create_run: async ({ playId }: { playId: string }) => {
            return {
                runId: `run_${Date.now()}`,
                playId,
                status: "created"
            };
        }
    }
});

// Vercel handler adapter
export async function handleRequest(req: any, res: any) {
    return server.handleHttp(req, res);
}
