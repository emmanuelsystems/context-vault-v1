import { McpServer } from "@modelcontextprotocol/sdk/server/mcp";

const server = new McpServer({
    name: "Context Vault MCP Server",
    version: "1.0.0",
});

// Simple tool
server.tool(
    "cv_health_check",
    "Health check tool",
    {},
    async () => ({
        content: [
            {
                type: "text",
                text: "MCP Server is running",
            },
        ],
    })
);

export default async function handler(req, res) {
    await server.handleHttp(req, res);
}
