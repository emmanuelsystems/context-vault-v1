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
                cv_create_run?: (params: {
                    play_id: string;
                    workspace_id: string;
                    task_goal: string;
                    config_json?: Record<string, any>;
                }) => Promise<any>;
            };
        };
    }
}

const WorkbenchWidget: React.FC = () => {
    const [plays, setPlays] = useState<Play[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [taskGoal, setTaskGoal] = useState<string>('');
    const [configJsonText, setConfigJsonText] = useState<string>('');
    const [runResult, setRunResult] = useState<{ run_id: string; status: string } | null>(null);

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

    const startRun = async (playId: string) => {
        setError(null);
        setRunResult(null);

        if (!taskGoal.trim()) {
            setError("Please enter a task goal before starting a run.");
            return;
        }

        let parsedConfig: Record<string, any> | undefined = undefined;
        if (configJsonText.trim()) {
            try {
                parsedConfig = JSON.parse(configJsonText);
            } catch (err: any) {
                setError(`Config JSON is invalid: ${err.message}`);
                return;
            }
        }

        try {
            let result: any;
            const payload = {
                play_id: playId,
                workspace_id: workspaceId,
                task_goal: taskGoal,
                config_json: parsedConfig,
            };

            // Prefer MCP host runtime if available
            if (window.openai && window.openai.connector?.cv_create_run) {
                result = await window.openai.connector.cv_create_run(payload);
            } else {
                // Fallback to REST API for browser/demo use
                const resp = await fetch('/api/runs', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
                if (!resp.ok) {
                    const body = await resp.json().catch(() => ({}));
                    throw new Error(body?.message || `HTTP ${resp.status}`);
                }
                result = await resp.json();
            }

            const run_id = result.run_id || result.runId;
            const status = result.status || result.run_status;

            if (!run_id || !status) {
                throw new Error("Run creation did not return a run_id/status.");
            }

            setRunResult({ run_id, status });
        } catch (err: any) {
            console.error("Run creation failed:", err);
            setError(`Run creation failed: ${err.message || "Check Vercel logs."}`);
        }
    };

    if (loading) return <div>Loading Context Vault Plays...</div>;
    if (error) return <div style={{ color: 'red', padding: '10px', border: '1px solid red' }}>Error: {error}</div>;

    return (
        <div>
            <h2>Context Vault Plays ({plays.length})</h2>
            <p>Data retrieved successfully from Neon DB via MCP Server.</p>
            <div style={{ margin: '12px 0', padding: '12px', border: '1px solid #ddd' }}>
                <div style={{ marginBottom: '8px' }}>
                    <label>
                        Task Goal:&nbsp;
                        <input
                            type="text"
                            value={taskGoal}
                            onChange={(e) => setTaskGoal(e.target.value)}
                            style={{ width: '360px' }}
                            placeholder="e.g., Draft Module 2 for Scott's Workbook"
                        />
                    </label>
                </div>
                <div>
                    <label>
                        Config JSON (optional):
                        <br />
                        <textarea
                            value={configJsonText}
                            onChange={(e) => setConfigJsonText(e.target.value)}
                            placeholder='{"dab_role":"Research Synthesizer","core_blocks":["id1","id2"]}'
                            style={{ width: '360px', height: '100px' }}
                        />
                    </label>
                </div>
            </div>
            <ul>
                {plays.map(play => (
                    <li key={play.id || play.name} style={{ marginBottom: '8px' }}>
                        [ID: {play.id}] <strong>{play.name}</strong>
                        <button
                            style={{ marginLeft: '8px' }}
                            onClick={() => startRun(play.id)}
                        >
                            Start Run
                        </button>
                    </li>
                ))}
            </ul>
            {runResult && (
                <div style={{ marginTop: '12px', padding: '8px', border: '1px solid green', color: 'green' }}>
                    Run created: {runResult.run_id} (status: {runResult.status})
                </div>
            )}
        </div>
    );
};

export default WorkbenchWidget;
