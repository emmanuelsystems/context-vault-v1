import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as z from "zod";

const server = new McpServer({
    name: "context-vault-mcp",
    version: "1.0.0",
});

// Register health check tool
server.registerTool(
    "cv_health_check",
    {
        title: "Health Check",
        description: "Check if the MCP server is running",
        inputSchema: {},
        outputSchema: {
            status: z.string(),
            message: z.string(),
        },
    },
    async () => {
        const output = {
            status: "ok",
            message: "MCP Server is running",
        };
        return {
            content: [{ type: "text", text: JSON.stringify(output) }],
            structuredContent: output,
        };
    }
);

export { server };
