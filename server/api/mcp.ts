// server/api/mcp.ts
import { handleRequest } from "../src/index.js";

export default async function handler(req: any, res: any) {
    try {
        await handleRequest(req, res);
    } catch (err) {
        console.error("[MCP ERROR]", err);
        res.status(500).json({ error: "MCP server error" });
    }
}
