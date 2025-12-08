"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.auth = auth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function auth(req, res, next) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token)
        return res.status(401).json({ error: "No token" });
    const secret = process.env.JWT_SECRET;
    if (!secret)
        throw new Error("JWT_SECRET is not defined");
    try {
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        req.user = decoded;
        next();
    }
    catch {
        return res.status(403).json({ error: "Invalid or expired token" });
    }
}
//# sourceMappingURL=authMiddleware.js.map