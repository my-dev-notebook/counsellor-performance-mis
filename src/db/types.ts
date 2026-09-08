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
    date: string;
    overall: number | null;
    nonNegotiable: number | null;
    achieved: number | null;
}

export interface DailyAdmission {
    id: number;
    userId: number;
    date: string;
    count: number;
    metadata: string | null;
}

/** One admission's lead details, serialized into `DailyAdmission.metadata` as a JSON array. */
export interface AdmissionRecord {
    leadId: string;
    leadName: string;
    leadEmail: string;
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
