import { server } from "../src/index.js"; // MUST have .js extension
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

export default async function handler(req: any, res: any) {
    try {
        // Create a new transport for each request to prevent request ID collisions
        const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
            enableJsonResponse: true,
        });

        // Clean up transport when response closes
        res.on("close", () => {
            transport.close();
        });

        // Connect server to transport and handle the request
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
    } catch (err) {
        console.error("[MCP ERROR]", err);
        res.status(500).json({ error: "MCP server error" });
    }
}
