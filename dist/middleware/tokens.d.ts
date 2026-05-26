import { JwtUser } from "../middleware/authMiddleware";
export declare function generateAccessToken(user: JwtUser): string;
export declare function generateRefreshToken(user: Pick<JwtUser, "id">): string;
//# sourceMappingURL=tokens.d.ts.map