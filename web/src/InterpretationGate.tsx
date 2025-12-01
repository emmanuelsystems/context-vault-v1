// web/src/InterpretationGate.tsx
// Placeholder scaffold for Interpretation Gate UI (AI vs User intent compare).

import React, { useState } from 'react';
import './WorkbenchWidget.css';

type IntentView = {
    why: string;
    what: string;
    constraints: string;
};

interface Props {
    aiIntent: IntentView;
    initialUserIntent?: IntentView;
    onApprove: (approved: IntentView) => void;
}

const InterpretationGate: React.FC<Props> = ({ aiIntent, initialUserIntent, onApprove }) => {
    const [userIntent, setUserIntent] = useState<IntentView>(
        initialUserIntent || {
            why: aiIntent.why,
            what: aiIntent.what,
            constraints: aiIntent.constraints,
        }
    );

    return (
        <div className="cv-shell">
            <div className="cv-nav">
                <button className="cv-link" onClick={() => window.history.back()}>← Back</button>
            </div>
            <div className="cv-grid cv-grid--stack">
                <section className="cv-card">
                    <div className="cv-card__header">
                        <div>
                            <p className="cv-kicker">Interpretation Gate</p>
                            <h2>Align Intent (Why + What)</h2>
                        </div>
                    </div>
                    <div className="cv-gate">
                        <div className="cv-panel">
                            <p className="cv-kicker">AI Interpretation</p>
                            <div className="cv-field">
                                <label>Why (AI)</label>
                                <div className="cv-readonly">{aiIntent.why}</div>
                            </div>
                            <div className="cv-field">
                                <label>What (AI)</label>
                                <div className="cv-readonly">{aiIntent.what}</div>
                            </div>
                            <div className="cv-field">
                                <label>Constraints (AI)</label>
                                <div className="cv-readonly">{aiIntent.constraints}</div>
                            </div>
                        </div>
                        <div className="cv-panel">
                            <p className="cv-kicker">Your Intent</p>
                            <div className="cv-field">
                                <label>Why</label>
                                <textarea
                                    value={userIntent.why}
                                    onChange={(e) => setUserIntent({ ...userIntent, why: e.target.value })}
                                />
                            </div>
                            <div className="cv-field">
                                <label>What</label>
                                <textarea
                                    value={userIntent.what}
                                    onChange={(e) => setUserIntent({ ...userIntent, what: e.target.value })}
                                />
                            </div>
                            <div className="cv-field">
                                <label>Constraints</label>
                                <textarea
                                    value={userIntent.constraints}
                                    onChange={(e) => setUserIntent({ ...userIntent, constraints: e.target.value })}
                                />
                            </div>
                            <button className="cv-button" onClick={() => onApprove(userIntent)}>
                                Approve Intent
                            </button>
                        </div>
                    </div>
                    <p className="cv-muted small">Intent = Why + What. How lives in Synthesis (Step 2b).</p>
                </section>
            </div>
        </div>
    );
};

export default InterpretationGate;
