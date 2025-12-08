declare const router: import("express-serve-static-core").Router;
export type PetMedical = {
    id: string;
    pet_id: string;
    title: string;
    content?: string;
    created_at?: Date;
    updated_at?: Date;
    category: string;
};
export default router;
//# sourceMappingURL=medical.d.ts.map