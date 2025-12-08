import { Request, Response, NextFunction } from "express";
export interface JwtUser {
    id: number;
    email: string;
}
declare global {
    namespace Express {
        interface Request {
            user?: JwtUser;
        }
    }
}
export declare function auth(req: Request, res: Response, next: NextFunction): Response<any, Record<string, any>> | undefined;
//# sourceMappingURL=authMiddleware.d.ts.map