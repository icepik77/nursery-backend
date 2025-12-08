declare const router: import("express-serve-static-core").Router;
export type Pet = {
    id: string;
    user_id: string;
    name?: string;
    gender?: string;
    birthdate?: string;
    chip?: string;
    breed?: string;
    weight?: string;
    height?: string;
    color?: string;
    note?: string;
    imageUri?: string;
    bigNote?: string;
    category?: string;
    pasportName?: string;
};
export default router;
//# sourceMappingURL=pets.d.ts.map