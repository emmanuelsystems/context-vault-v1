// intentExtractor.ts
// Deterministic heuristics (v1) for extracting Why/What/Constraints from raw notes.

import type { ExtractedIntent } from "./intentTypes.js";

type Signals = {
    why: RegExp[];
    what: RegExp[];
    constraints: RegExp[];
    action: RegExp[];
    how: RegExp[];
};

const signals: Signals = {
    why: [
        /\bwhy\b/i,
        /\bmission\b/i,
        /\bpurpose\b/i,
        /\bconviction\b/i,
        /\bserve\b/i,
        /\bchange\b/i,
        /\bin order to\b/i,
    ],
    what: [
        /\bdeliver\b/i,
        /\bship\b/i,
        /\bbuild\b/i,
        /\bcreate\b/i,
        /\bartifact\b/i,
        /\bmodule\b/i,
        /\bworkbook\b/i,
        /\boutput\b/i,
        /\bjson\b/i,
    ],
    constraints: [
        /\bmust\b/i,
        /\bcannot\b/i,
        /\bboundary\b/i,
        /\bsafe\b/i,
        /\bphi\b/i,
        /\bnon[- ]negotiable\b/i,
        /\btone\b/i,
        /\bconstraint\b/i,
    ],
    action: [
        /\bnext step\b/i,
        /\bshould\b/i,
        /\bneed to\b/i,
        /\bwill\b/i,
        /\btodo\b/i,
    ],
    how: [
        /\bhow\b/i,
        /\bprocess\b/i,
        /\bmethod\b/i,
        /\bapproach\b/i,
        /\bsteps?\b/i,
    ],
};

function splitSentences(text: string): string[] {
    return text
        .split(/(?<=[\.\!\?])\s+/)
        .map((s) => s.trim())
        .filter(Boolean);
}

function scoreSentence(sent: string, patterns: RegExp[]): number {
    return patterns.reduce((acc, re) => (re.test(sent) ? acc + 1 : acc), 0);
}

export function extractIntent(rawNotes: string): ExtractedIntent {
    const sentences = splitSentences(rawNotes);
    const whyParts: string[] = [];
    const whatParts: string[] = [];
    const constraintParts: string[] = [];
    const actions: { text: string }[] = [];
    const howSpillover: string[] = [];

    sentences.forEach((sent) => {
        const whyScore = scoreSentence(sent, signals.why);
        const whatScore = scoreSentence(sent, signals.what);
        const constraintScore = scoreSentence(sent, signals.constraints);
        const actionScore = scoreSentence(sent, signals.action);
        const howScore = scoreSentence(sent, signals.how);

        if (constraintScore > 0) {
            constraintParts.push(sent);
        }
        if (whyScore > 0 && whyScore >= whatScore) {
            whyParts.push(sent);
        }
        if (whatScore > 0 && whatScore >= whyScore) {
            whatParts.push(sent);
        }
        if (actionScore > 0) {
            actions.push({ text: sent });
        }
        if (howScore > 0 && howScore > whyScore && howScore > whatScore) {
            howSpillover.push(sent);
        }
    });

    const inferredTitle = sentences[0]?.slice(0, 80) || "Intent";
    const constraintsList = constraintParts.flatMap((c) => c.split(/[\n;]/)).map((c) => c.trim()).filter(Boolean);

    const confidence = {
        why: Math.min(1, whyParts.length / (sentences.length || 1)),
        what: Math.min(1, whatParts.length / (sentences.length || 1)),
        constraints: Math.min(1, constraintsList.length / (sentences.length || 1)),
    };

    return {
        inferredTitle,
        why: whyParts.join(" "),
        what: whatParts.join(" "),
        constraints: constraintsList,
        actionItems: actions,
        openQuestions: [],
        quotes: [],
        confidence,
        howSpillover: howSpillover,
    };
}

// Simple fixture helper for Scott's email (replace text with real email content)
export const scottFixture = (emailText: string) => extractIntent(emailText);
