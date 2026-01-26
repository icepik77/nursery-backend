import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface JwtUser {
  id: string;
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

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_ACCESS_SECRET!
    ) as JwtUser;

    req.user = decoded;
    next();
  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Access token expired" });
    }

    return res.status(403).json({ error: "Invalid token" });
  }
}