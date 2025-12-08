declare const router: import("express-serve-static-core").Router;
export type PetNote = {
    id: string;
    pet_id: string;
    text: string;
    created_at?: Date;
    updated_at?: Date;
};
export default router;
//# sourceMappingURL=notes.d.ts.map