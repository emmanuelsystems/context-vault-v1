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

    const fetchPlaysViaRest = async () => {
        const resp = await fetch(`/api/plays?workspace_id=${encodeURIComponent(workspaceId)}`);
        if (!resp.ok) {
            const body = await resp.json().catch(() => ({}));
            throw new Error(body?.message || `HTTP ${resp.status}`);
        }
        return resp.json();
    };

    useEffect(() => {
        const fetchPlays = async () => {
            try {
                let result: any;

                // Prefer MCP host runtime if available
                if (window.openai && window.openai.connector?.cv_list_plays) {
                    result = await window.openai.connector.cv_list_plays({ workspace_id: workspaceId });
                } else {
                    // Fallback to REST API for browser/demo use
                    result = await fetchPlaysViaRest();
                }

                setPlays(result.plays || result);
            } catch (err: any) {
                console.error("Play retrieval failed:", err);
                setError(`Play retrieval failed: ${err.message || "Check Vercel logs."}`);
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
