import jwt from "jsonwebtoken";
import { JwtUser } from "../middleware/authMiddleware";

const accessSecret = process.env.JWT_ACCESS_SECRET!;
const refreshSecret = process.env.JWT_REFRESH_SECRET!;

export function generateAccessToken(user: JwtUser) {
  return jwt.sign(user, accessSecret, { expiresIn: "15m" });
}

export function generateRefreshToken(user: Pick<JwtUser, "id">) {
  return jwt.sign(user, refreshSecret, { expiresIn: "7d" });
}