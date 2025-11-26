// web/src/WorkbenchWidget.tsx

import React, { useState, useEffect } from 'react';
import './WorkbenchWidget.css';

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

    if (loading) return <div className="cv-shell">Loading Context Vault Plays...</div>;
    const goBack = () => window.history.length > 1 ? window.history.back() : window.location.assign('/');

    if (error) {
        return (
            <div className="cv-shell">
                <div className="cv-nav">
                    <button className="cv-link" onClick={goBack}>← Back to Workbench</button>
                </div>
                <div className="cv-banner cv-banner--error">{error}</div>
            </div>
        );
    }

    return (
        <div className="cv-shell">
            <div className="cv-nav">
                <button className="cv-link" onClick={goBack}>← Back to Workbench</button>
            </div>
            <header className="cv-header">
                <div>
                    <p className="cv-kicker">Context Vault Workbench</p>
                    <h1>
                        Select a Play &amp; Start a Run
                        <span className="cv-pill">Live</span>
                    </h1>
                    <p className="cv-subtitle">
                        Data pulled directly from Neon via MCP. Workspace: <span className="cv-mono">{workspaceId}</span>
                    </p>
                </div>
                <div className="cv-metrics">
                    <div className="cv-metric">
                        <span>Plays</span>
                        <strong>{plays.length}</strong>
                    </div>
                    <div className="cv-metric">
                        <span>Run status</span>
                        <strong>{runResult ? runResult.status : '–'}</strong>
                    </div>
                </div>
            </header>

            <div className="cv-grid">
                <section className="cv-card">
                    <div className="cv-card__header">
                        <div>
                            <p className="cv-kicker">Run setup</p>
                            <h2>Task goal &amp; context</h2>
                        </div>
                    </div>
                    <div className="cv-field">
                        <label htmlFor="task-goal">Task goal</label>
                        <input
                            id="task-goal"
                            type="text"
                            value={taskGoal}
                            onChange={(e) => setTaskGoal(e.target.value)}
                            placeholder="e.g., Draft Module 2 for Scott's Workbook"
                        />
                    </div>
                    <div className="cv-field">
                        <label htmlFor="config-json">Config JSON (optional)</label>
                        <textarea
                            id="config-json"
                            value={configJsonText}
                            onChange={(e) => setConfigJsonText(e.target.value)}
                            placeholder='{"dab_role":"Research Synthesizer","core_blocks":["id1","id2"]}'
                        />
                    </div>
                    {runResult && (
                        <div className="cv-banner cv-banner--success">
                            Run created: {runResult.run_id} (status: {runResult.status})
                        </div>
                    )}
                </section>

                <section className="cv-card">
                    <div className="cv-card__header">
                        <div>
                            <p className="cv-kicker">Available Plays</p>
                            <h2>Pick a workflow to run</h2>
                        </div>
                    </div>
                    <div className="cv-play-list">
                        {plays.map((play) => (
                            <div className="cv-play" key={play.id || play.name}>
                                <div>
                                    <p className="cv-mono cv-id">ID: {play.id}</p>
                                    <h3>{play.name}</h3>
                                    {play.description && <p className="cv-description">{play.description}</p>}
                                </div>
                                <button className="cv-button" onClick={() => startRun(play.id)}>
                                    Start Run
                                </button>
                            </div>
                        ))}
                        {plays.length === 0 && <p className="cv-muted">No plays available for this workspace.</p>}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default WorkbenchWidget;
