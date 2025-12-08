declare const router: import("express-serve-static-core").Router;
export type PetCycle = {
    id: string;
    petId: string;
    start_date: string;
    end_date?: string | null;
    note?: string | null;
    period_days: number;
    created_at?: Date;
    updated_at?: Date;
};
export default router;
//# sourceMappingURL=cycles.d.ts.map