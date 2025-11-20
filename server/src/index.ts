import { McpServer } from "@modelcontextprotocol/sdk/server";

const server = new McpServer({
    tools: {
        cv_health_check: async () => ({
            status: "ok",
            message: "MCP Server is running",
        }),
    },
});

export async function handleRequest(req: any, res: any) {
    return server.handleHttp(req, res);
}
