export interface Team {
    id: number;
    name: string;
}

export interface Agency {
    id: number;
    name: string;
}

export interface CounsellorRow {
    id: number;
    personId: number;
    name: string;
    email: string | null;
    doj: string | null;
    teamId: number;
    teamName: string;
    agencyId: number | null;
    agencyName: string | null;
    isActive: boolean;
}

export interface PerformanceEntry {
    id: number;
    userId: number;
    year: number;
    month: number;
    overall: number | null;
    nonNegotiable: number | null;
    achieved: number | null;
    achievedFlagged: boolean;
    acknowledgment: boolean | null;
    feedback: string | null;
}

export interface ProgressRow {
    counsellor: CounsellorRow;
    entry: PerformanceEntry | null;
}

export interface MonthSummary {
    filledCount: number;
    totalCount: number;
    targetSoFar: number;
    achievedSoFar: number;
}
