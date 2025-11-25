// web/src/WorkbenchWidget.tsx

import React, { useState, useEffect } from 'react';

// Define the type for the data retrieved from the database
interface Play {
    id: string;
    name: string;
}

// Define the type for the global AI Host runtime object
declare global {
    interface Window {
        openai?: {
            connector: {
                cv_list_plays: (params: { workspace_id: string }) => Promise<any>;
            };
        };
    }
}

const WorkbenchWidget: React.FC = () => {
    const [plays, setPlays] = useState<Play[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // NOTE: Use a valid Workspace ID that matches the one you used in your seed.ts file
    const workspaceId = 'client_123_syndicate';

    useEffect(() => {
        const fetchPlays = async () => {
            // Check if the AI host runtime and tool are available
            if (!window.openai || !window.openai.connector?.cv_list_plays) {
                setError("MCP runtime or 'cv_list_plays' tool not available. Connector may not be fully active.");
                setLoading(false);
                return;
            }

            try {
                // Call the deployed MCP tool on the server
                const result = await window.openai.connector.cv_list_plays({
                    workspace_id: workspaceId
                });

                // Assuming the server returns the plays array directly or nested within a 'plays' property
                setPlays(result.plays || result);
            } catch (err: any) {
                console.error("MCP Tool Call Failed:", err);
                setError(`Tool Execution Error: ${err.message || "Check Vercel logs."}`);
            } finally {
                setLoading(false);
            }
        };

        fetchPlays();
    }, []);

    if (loading) return <div>Loading Context Vault Plays...</div>;
    if (error) return <div style={{ color: 'red', padding: '10px', border: '1px solid red' }}>Error: {error}</div>;

    return (
        <div>
            <h2>Context Vault Plays ({plays.length})</h2>
            <p>Data retrieved successfully from Neon DB via MCP Server.</p>
            <ul>
                {plays.map(play => (
                    <li key={play.id || play.name}>[ID: {play.id}] <strong>{play.name}</strong></li>
                ))}
            </ul>
        </div>
    );
};

export default WorkbenchWidget;