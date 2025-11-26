// web/src/WorkbenchWidget.tsx

import React, { useState, useEffect } from 'react';
import './WorkbenchWidget.css';

interface Play {
    id: string;
    name: string;
    description?: string | null;
}

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
                cv_update_run_status?: (params: { run_id: string; new_status: string }) => Promise<any>;
                cv_assemble_asset?: (params: { run_id: string }) => Promise<any>;
                cv_bank_asset?: (params: { run_id: string; asset_title: string; output_content: string }) => Promise<any>;
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

                if (window.openai && window.openai.connector?.cv_list_plays) {
                    result = await window.openai.connector.cv_list_plays({ workspace_id: workspaceId });
                } else {
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
        setAssetStatus(null);

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

            if (window.openai && window.openai.connector?.cv_create_run) {
                result = await window.openai.connector.cv_create_run(payload);
            } else {
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
            const status = result.status || result.run_status || 'PENDING';

            if (!run_id || !status) {
                throw new Error("Run creation did not return a run_id/status.");
            }

            setRunResult({ run_id, status });
            setRunIdForActions(run_id);
            setNewStatus('IN_PROGRESS');
            setSelectedPlayId(playId);
        } catch (err: any) {
            console.error("Run creation failed:", err);
            setError(`Run creation failed: ${err.message || "Check Vercel logs."}`);
        }
    };

    const updateRunStatus = async (statusOverride?: string) => {
        setError(null);
        setAssetStatus(null);
        if (!runIdForActions.trim()) {
            setError("Provide a run ID to update.");
            return;
        }
        const targetStatus = statusOverride || newStatus;
        try {
            let result: any;
            const payload = { run_id: runIdForActions, new_status: targetStatus };
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
            const status = result.status || result.run_status || targetStatus;
            const rid = result.run_id || runIdForActions;
            setRunResult({ run_id: rid, status });
            setNewStatus(status);
        } catch (err: any) {
            console.error("Run status update failed:", err);
            setError(`Run status update failed: ${err.message || "Check Vercel logs."}`);
        }
    };

    const assembleAsset = async () => {
        setError(null);
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

    const bankAsset = async (forcePass?: boolean) => {
        setError(null);
        setAssetStatus(null);
        if (!runIdForActions.trim()) {
            setError("Provide a run ID to bank an asset.");
            return;
        }
        if (!assetTitle.trim()) {
            setError("Provide an asset title before banking.");
            return;
        }
        const contentToBank = assetContent.trim() || assembledPrompt.trim();
        if (!contentToBank) {
            setError("No asset content to bank. Assemble or paste content first.");
            return;
        }
        try {
            let result: any;
            if (forcePass) {
                await updateRunStatus("PASS");
            }
            const payload = { run_id: runIdForActions, asset_title: assetTitle, output_content: contentToBank };
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

    const hasActiveRun = Boolean(runIdForActions);

    return (
        <div className="cv-shell">
            <div className="cv-nav">
                <button className="cv-link" onClick={goBack}>← Back to Workbench</button>
            </div>
            <header className="cv-header">
                <div>
                    <p className="cv-kicker">Context Vault Workbench</p>
                    <h1>
                        {hasActiveRun ? "Job Execution" : "Start a Run"}
                        <span className="cv-pill">Live</span>
                    </h1>
                    <p className="cv-subtitle">
                        Workspace: <span className="cv-mono">{workspaceId}</span>
                    </p>
                </div>
                <div className="cv-metrics">
                    <div className="cv-metric">
                        <span>Plays</span>
                        <strong>{plays.length}</strong>
                    </div>
                    <div className="cv-metric">
                        <span>Run status</span>
                        <strong>{runResult ? `${runResult.status} (${runResult.run_id})` : '—'}</strong>
                    </div>
                </div>
            </header>

            {!hasActiveRun && (
                <div className="cv-grid cv-grid--stack">
                    <section className="cv-card">
                        <div className="cv-card__header">
                            <div>
                                <p className="cv-kicker">Phase 1 · Start Run</p>
                                <h2>Choose Play &amp; Goal</h2>
                            </div>
                        </div>
                        <div className="cv-field inline">
                            <label htmlFor="task-goal">Task goal</label>
                            <div className="cv-inline-input">
                                <input
                                    id="task-goal"
                                    type="text"
                                    value={taskGoal}
                                    onChange={(e) => setTaskGoal(e.target.value)}
                                    placeholder="e.g., Draft Module 2 for Scott's Workbook"
                                />
                                <button
                                    className="cv-button"
                                    onClick={() => selectedPlayId && startRun(selectedPlayId)}
                                    disabled={!selectedPlayId || !taskGoal.trim()}
                                >
                                    Start Run
                                </button>
                            </div>
                        </div>
                        <div className="cv-field">
                            <label>Select a Play</label>
                            <div className="cv-play-radios">
                                {plays.map((play) => (
                                    <label key={play.id} className={`cv-radio ${selectedPlayId === play.id ? 'selected' : ''}`}>
                                        <input
                                            type="radio"
                                            name="play"
                                            value={play.id}
                                            checked={selectedPlayId === play.id}
                                            onChange={() => handleSelectPlay(play.id)}
                                        />
                                        <div>
                                            <strong>{play.name}</strong>
                                            {play.description && <div className="cv-muted">{play.description}</div>}
                                        </div>
                                    </label>
                                ))}
                                {plays.length === 0 && <p className="cv-muted">No plays available for this workspace.</p>}
                            </div>
                        </div>
                        <div className="cv-field">
                            <label htmlFor="config-json">Config JSON (optional)</label>
                            <textarea
                                id="config-json"
                                value={configJsonText}
                                onChange={(e) => setConfigJsonText(e.target.value)}
                                placeholder='{"dab_role":"Research Synthesizer","core_blocks":["id1","id2"]}'
                            />
                            <p className="cv-muted small">Use for custom context variables only.</p>
                        </div>
                        <div className="cv-card__sub">
                            <p className="cv-kicker">Context Preview</p>
                            {detailsLoading && <p className="cv-muted">Loading play context…</p>}
                            {!detailsLoading && playDetails && selectedPlayId && (
                                <>
                                    <p className="cv-description">
                                        DAB Role: <strong>{playDetails.dabRole || "Workbook Architect"}</strong>
                                    </p>
                                    <div className="cv-coreblocks">
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
                            {!detailsLoading && (!playDetails || !selectedPlayId) && <p className="cv-muted">Select a play to view context.</p>}
                        </div>
                    </section>
                </div>
            )}

            {hasActiveRun && (
                <>
                    <div className="cv-grid cv-grid--stack">
                        <section className="cv-card">
                            <div className="cv-card__header">
                                <div>
                                    <p className="cv-kicker">Phase 2 · Job Execution</p>
                                    <h2>Run lifecycle</h2>
                                </div>
                            </div>
                            <div className="cv-field">
                                <label>Run ID</label>
                                <div className="cv-badge">{runIdForActions}</div>
                            </div>
                            <div className="cv-field">
                                <label htmlFor="new-status">Status</label>
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
                                <button className="cv-button" onClick={() => updateRunStatus()}>
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
                    </div>

                    <div className="cv-grid cv-grid--stack">
                        <section className="cv-card">
                            <div className="cv-card__header">
                                <div>
                                    <p className="cv-kicker">Phase 3 · Finalize &amp; Bank</p>
                                    <h2>Approve Output</h2>
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
                                    value={assetContent || assembledPrompt}
                                    onChange={(e) => setAssetContent(e.target.value)}
                                    placeholder="Paste final LLM output or use assembled prompt."
                                />
                            </div>
                            <div className="cv-actions-row">
                                <button className="cv-button" onClick={() => bankAsset(true)}>
                                    Approve Output &amp; Bank Asset
                                </button>
                            </div>
                            {assetStatus && (
                                <div className="cv-banner cv-banner--success">
                                    Asset {assetStatus.status}: {assetStatus.asset_id || 'n/a'}
                                </div>
                            )}
                        </section>
                    </div>
                </>
            )}
        </div>
    );
};

export default WorkbenchWidget;
