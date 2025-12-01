// Intent-related types for Interpretation Gate

export type CanonBlockType =
    | "INTENT"
    | "WHY"
    | "WHAT"
    | "CONSTRAINTS"
    | "AUDIENCE"
    | "TONE";

export type IntentRecordStatus = "draft" | "approved";

export type ExtractedIntent = {
    inferredTitle: string;
    why: string;
    what: string;
    constraints: string[];
    actionItems: { text: string; owner?: string; due?: string }[];
    openQuestions: string[];
    quotes: string[];
    confidence: { why: number; what: number; constraints: number };
    howSpillover?: string[];
};

export type IntentRecord = {
    id: string;
    title: string;
    whyText: string;
    whatText: string;
    constraintsText?: string;
    clientRef?: string;
    projectRef?: string;
    playRef?: string;
    noteRef?: string;
    status: IntentRecordStatus;
    aiInterpretation?: {
        why: string;
        what: string;
        constraints: string[];
    };
};
