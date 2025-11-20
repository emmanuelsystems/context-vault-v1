import { handleRequest } from "../server/src/index";

export default async function handler(req, res) {
    try {
        const result = await handleRequest(req, res);
        res.status(200).json(result);
    } catch (err) {
        console.error("[MCP ERROR]", err);
        res.status(500).json({ error: "MCP server error" });
    }
}
