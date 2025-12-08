declare const router: import("express-serve-static-core").Router;
export type PetEvent = {
    id: string;
    petId: string;
    title: string;
    event_date: string;
    created_at?: Date;
    updated_at?: Date;
};
export default router;
//# sourceMappingURL=events.d.ts.map