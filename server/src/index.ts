import { createMcpServer } from "@modelcontextprotocol/sdk/server";
import { z } from "zod";

const server = createMcpServer({
    tools: {
        cv_health_check: async () => {
            return {
                status: "ok",
                message: "MCP Server is running"
            };
        }
    }
});

export async function handleRequest(req: any, res: any) {
    return server.handleHttp(req, res);
}
