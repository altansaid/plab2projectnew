export interface Category {
    id: number;
    name: string;
    description: string;
}

export interface CaseData {
    id?: number;
    title: string;
    description: string;
    categoryId: number;
    doctorInstructions: string;
    patientInstructions: string;
    observerInstructions: string;
    duration: number;
    category?: Category;
    isRecallCase?: boolean;
    recallDates?: string[];
}