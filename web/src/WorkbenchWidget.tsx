// web/src/WorkbenchWidget.tsx

import React, { useState, useEffect } from 'react';
import './WorkbenchWidget.css';

// Define the type for the data retrieved from the database
interface Play {
    id: string;
    name: string;
    description?: string | null;
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
    const [runIdForActions, setRunIdForActions] = useState<string>('');
    const [newStatus, setNewStatus] = useState<string>('IN_PROGRESS');
    const [assembledPrompt, setAssembledPrompt] = useState<string>('');
    const [assetTitle, setAssetTitle] = useState<string>('');
    const [assetContent, setAssetContent] = useState<string>('');
    const [assetStatus, setAssetStatus] = useState<{ asset_id: string; status: string } | null>(null);
    const [selectedPlayId, setSelectedPlayId] = useState<string>('');
    const [playDetails, setPlayDetails] = useState<{ coreBlocks: { id: string; title: string; kind: string }[]; dabRole?: string } | null>(null);
    const [detailsLoading, setDetailsLoading] = useState<boolean>(false);

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

                const playsResult = result.plays || result;
                setPlays(playsResult);
                if (playsResult.length > 0 && !selectedPlayId) {
                    handleSelectPlay(playsResult[0].id);
                }
            } catch (err: any) {
                console.error("Play retrieval failed:", err);
                setError(`Play retrieval failed: ${err.message || "Check Vercel logs."}`);
            } finally {
                setLoading(false);
            }
        };

        fetchPlays();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchPlayDetails = async (playId: string) => {
        setDetailsLoading(true);
        try {
            const resp = await fetch(`/api/play-details?play_id=${encodeURIComponent(playId)}`);
            if (!resp.ok) {
                const body = await resp.json().catch(() => ({}));
                throw new Error(body?.message || `HTTP ${resp.status}`);
            }
            const data = await resp.json();
            setPlayDetails({
                coreBlocks: data.core_blocks || [],
                dabRole: data.dab_role,
            });
        } catch (err: any) {
            console.error("Play details fetch failed:", err);
            setPlayDetails(null);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleSelectPlay = (playId: string) => {
        setSelectedPlayId(playId);
        fetchPlayDetails(playId);
    };

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
            setRunIdForActions(run_id);
            setNewStatus('IN_PROGRESS');
            // Sync selection to the play used for the run
            setSelectedPlayId(playId);
        } catch (err: any) {
            console.error("Run creation failed:", err);
            setError(`Run creation failed: ${err.message || "Check Vercel logs."}`);
        }
    };

    const updateRunStatus = async () => {
        setError(null);
        setRunResult(null);
        setAssetStatus(null);
        if (!runIdForActions.trim()) {
            setError("Provide a run ID to update.");
            return;
        }
        try {
            let result: any;
            const payload = { run_id: runIdForActions, new_status: newStatus };
            if (window.openai && window.openai.connector?.cv_update_run_status) {
                result = await window.openai.connector.cv_update_run_status(payload as any);
            } else {
                const resp = await fetch('/api/run-status', {
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
            const status = result.status || result.run_status;
            const rid = result.run_id || runIdForActions;
            setRunResult({ run_id: rid, status });
        } catch (err: any) {
            console.error("Run status update failed:", err);
            setError(`Run status update failed: ${err.message || "Check Vercel logs."}`);
        }
    };

    const assembleAsset = async () => {
        setError(null);
        setAssembledPrompt('');
        setAssetStatus(null);
        if (!runIdForActions.trim()) {
            setError("Provide a run ID to assemble the ASSET prompt.");
            return;
        }
        try {
            let result: any;
            const payload = { run_id: runIdForActions };
            if (window.openai && window.openai.connector?.cv_assemble_asset) {
                result = await window.openai.connector.cv_assemble_asset(payload as any);
            } else {
                const resp = await fetch('/api/assemble-asset', {
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
            const prompt = result.asset_prompt || '';
            setAssembledPrompt(prompt);
            if (!assetContent) {
                setAssetContent(prompt);
            }
        } catch (err: any) {
            console.error("ASSET assembly failed:", err);
            setError(`ASSET assembly failed: ${err.message || "Check Vercel logs."}`);
        }
    };

    const bankAsset = async () => {
        setError(null);
        setAssetStatus(null);
        if (!runIdForActions.trim()) {
            setError("Provide a run ID to bank an asset.");
            return;
        }
        if (!assetTitle.trim() || !assetContent.trim()) {
            setError("Provide an asset title and content before banking.");
            return;
        }
        try {
            let result: any;
            const payload = { run_id: runIdForActions, asset_title: assetTitle, output_content: assetContent };
            if (window.openai && window.openai.connector?.cv_bank_asset) {
                result = await window.openai.connector.cv_bank_asset(payload as any);
            } else {
                const resp = await fetch('/api/bank-asset', {
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
            const rid = result.run_id || runIdForActions;
            const status = result.status || 'ok';
            setRunResult({ run_id: rid, status });
            setAssetStatus({ asset_id: result.asset_id || '', status });
        } catch (err: any) {
            console.error("Asset banking failed:", err);
            setError(`Asset banking failed: ${err.message || "Check Vercel logs."}`);
        }
    };

    if (loading) return <div className="cv-shell">Loading Context Vault Plays...</div>;
    const goBack = () => {
        // Always land on the Workbench root
        window.location.assign('/');
    };

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
                        <strong>{runResult ? `${runResult.status} (${runResult.run_id})` : '–'}</strong>
                    </div>
                </div>
            </header>

            <div className="cv-grid cv-grid--stretch">
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
                            Run created/updated: {runResult.run_id} (status: {runResult.status})
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
                            <div
                                className={`cv-play ${selectedPlayId === play.id ? 'selected' : ''}`}
                                key={play.id || play.name}
                                onClick={() => handleSelectPlay(play.id)}
                            >
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

            <div className="cv-grid cv-grid--stretch">
                <section className="cv-card">
                    <div className="cv-card__header">
                        <div>
                            <p className="cv-kicker">Context preview</p>
                            <h2>Core Blocks &amp; DAB</h2>
                        </div>
                    </div>
                    {detailsLoading && <p className="cv-muted">Loading play context…</p>}
                    {!detailsLoading && playDetails && (
                        <>
                            <p className="cv-mono cv-id">Play ID: {selectedPlayId || '—'}</p>
                            <p className="cv-description">
                                DAB Role: <strong>{playDetails.dabRole || "Workbook Architect"}</strong>
                            </p>
                            <div className="cv-coreblocks">
                                <p className="cv-kicker">Core Blocks</p>
                                {playDetails.coreBlocks.length === 0 && <p className="cv-muted">No core blocks found.</p>}
                                <ul>
                                    {playDetails.coreBlocks.map((cb) => (
                                        <li key={cb.id}>
                                            <span className="cv-chip">{cb.kind}</span> {cb.title}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    )}
                    {!detailsLoading && !playDetails && <p className="cv-muted">Select a play to view context.</p>}
                </section>

                <section className="cv-card">
                    <div className="cv-card__header">
                        <div>
                            <p className="cv-kicker">Run lifecycle</p>
                            <h2>Status &amp; assembly</h2>
                        </div>
                    </div>
                    <div className="cv-field">
                        <label htmlFor="run-id">Run ID</label>
                        <input
                            id="run-id"
                            type="text"
                            value={runIdForActions}
                            onChange={(e) => setRunIdForActions(e.target.value)}
                            placeholder="Paste run_id"
                        />
                    </div>
                    <div className="cv-field">
                        <label htmlFor="new-status">New status</label>
                        <select
                            id="new-status"
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value)}
                        >
                            <option value="PENDING">PENDING</option>
                            <option value="IN_PROGRESS">IN_PROGRESS</option>
                            <option value="PASS">PASS</option>
                            <option value="FAIL">FAIL</option>
                        </select>
                    </div>
                    <div className="cv-actions-row">
                        <button className="cv-button ghost" onClick={assembleAsset}>
                            Assemble ASSET
                        </button>
                        <button className="cv-button" onClick={updateRunStatus}>
                            Update Status
                        </button>
                    </div>
                    {assembledPrompt && (
                        <div className="cv-field">
                            <label>ASSET prompt</label>
                            <textarea
                                value={assembledPrompt}
                                onChange={(e) => setAssembledPrompt(e.target.value)}
                                placeholder="Assembled prompt will appear here"
                            />
                        </div>
                    )}
                </section>

                <section className="cv-card">
                    <div className="cv-card__header">
                        <div>
                            <p className="cv-kicker">Asset banking</p>
                            <h2>Finalize output</h2>
                        </div>
                    </div>
                    <div className="cv-field">
                        <label htmlFor="asset-title">Asset title</label>
                        <input
                            id="asset-title"
                            type="text"
                            value={assetTitle}
                            onChange={(e) => setAssetTitle(e.target.value)}
                            placeholder="e.g., Workbook Module 2 Draft"
                        />
                    </div>
                    <div className="cv-field">
                        <label htmlFor="asset-content">Asset content</label>
                        <textarea
                            id="asset-content"
                            value={assetContent}
                            onChange={(e) => setAssetContent(e.target.value)}
                            placeholder="Paste final LLM output or use assembled prompt."
                        />
                    </div>
                    <div className="cv-actions-row">
                        <button className="cv-button" onClick={bankAsset}>
                            Bank Asset
                        </button>
                    </div>
                    {assetStatus && (
                        <div className="cv-banner cv-banner--success">
                            Asset {assetStatus.status}: {assetStatus.asset_id || 'n/a'}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
};

export default WorkbenchWidget;
