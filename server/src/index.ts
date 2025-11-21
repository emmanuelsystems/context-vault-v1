// server/src/index.ts
import { Server } from "@modelcontextprotocol/sdk/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const server = new Server({
    name: "Context Vault MCP Server",
    version: "1.0.0",
});

server.tool(
    "cv_health_check",
    "Checks that the MCP server and database are reachable",
    {},
    async () => {
        try {
            // Simple round-trip to Neon
            const result = await prisma.$queryRaw`SELECT 1::int as "ok"`;

            return {
                content: [
                    {
                        type: "text",
                        text: `MCP server is running. DB check: ${JSON.stringify(result)}`
                    },
                ],
            };
        } catch (err: any) {
            return {
                content: [
                    {
                        type: "text",
                        text: `MCP server is running, but DB check failed: ${err?.message ?? String(
                            err
                        )}`,
                    },
                ],
            };
        }
    }
);

// keep your existing handler
export async function handleRequest(req: any, res: any) {
    return server.handleHttp(req, res);
}
