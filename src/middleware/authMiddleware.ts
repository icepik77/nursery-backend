import { Request, Response, NextFunction } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";

export interface JwtUser {
  id: string; // ✅ UUID
  email: string;
  role?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUser;
    }
  }
}

export function auth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing Authorization header" });
  }

  const token = authHeader.slice(7);
  const secret = process.env.JWT_SECRET;

  if (!secret) throw new Error("JWT_SECRET is not defined");

  try {
    const decoded = jwt.verify(token, secret) as JwtUser;
    req.user = decoded;
    console.log("Decoded JWT:", decoded);
    next();
  } catch (err) {
    console.error("JWT error:", err);
    return res.status(403).json({ error: "Invalid or expired token" });
  }
}
