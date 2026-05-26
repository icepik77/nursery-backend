"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const multer_1 = __importDefault(require("multer"));
const authMiddleware_1 = require("../middleware/authMiddleware");
const path_1 = __importDefault(require("path"));
const tokens_1 = require("../middleware/tokens");
const router = (0, express_1.Router)();
const storage = multer_1.default.diskStorage({
    destination: "uploads/avatar",
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
const upload = (0, multer_1.default)({ storage });
router.post("/register", async (req, res) => {
    try {
        const { role = "individual", login, email, password, fullname, address, inn, phone, contact_email } = req.body;
        if (!login || !email || !password) {
            return res.status(400).json({
                error: "Login, email and password are required"
            });
        }
        if (!["individual", "company"].includes(role)) {
            return res.status(400).json({ error: "Invalid role" });
        }
        if (role === "company") {
            if (!fullname || !address || !inn || !phone || !contact_email) {
                return res.status(400).json({
                    error: "Fullname, address, INN, phone and contact_email are required for company"
                });
            }
        }
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedLogin = login.trim();
        const exists = await db_1.pool.query("SELECT 1 FROM users WHERE email=$1 OR login=$2", [normalizedEmail, normalizedLogin]);
        if (exists.rowCount) {
            return res.status(400).json({ error: "User already exists" });
        }
        const hash = await bcrypt_1.default.hash(password, 10);
        const inserted = await db_1.pool.query(`INSERT INTO users
       (login, email, password, role, fullname, address, inn, phone, contact_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, login, email, role`, [
            normalizedLogin,
            normalizedEmail,
            hash,
            role,
            fullname?.trim() || null,
            address?.trim() || null,
            inn?.trim() || null,
            phone?.trim() || null,
            contact_email?.trim().toLowerCase() || null
        ]);
        const user = inserted.rows[0];
        const payload = { id: user.id, email: user.email, role: user.role };
        const accessToken = (0, tokens_1.generateAccessToken)(payload);
        const refreshToken = (0, tokens_1.generateRefreshToken)({ id: user.id });
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return res.json({
            accessToken,
            user
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
router.post("/logout", (_req, res) => {
    res.clearCookie("refreshToken");
    return res.json({ message: "Logged out" });
});
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: "Email and password required" });
        }
        const result = await db_1.pool.query("SELECT id, email, password, login, avatar, role FROM users WHERE email=$1", [email.toLowerCase()]);
        if (!result.rowCount) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const user = result.rows[0];
        const ok = await bcrypt_1.default.compare(password, user.password);
        if (!ok)
            return res.status(401).json({ error: "Invalid credentials" });
        const payload = { id: user.id, email: user.email, role: user.role };
        const accessToken = (0, tokens_1.generateAccessToken)(payload);
        const refreshToken = (0, tokens_1.generateRefreshToken)({ id: user.id });
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });
        return res.json({
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                login: user.login,
                avatar: user.avatar
            }
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
router.post("/refresh", (req, res) => {
    const token = req.cookies?.refreshToken;
    if (!token)
        return res.status(401).json({ error: "No refresh token" });
    try {
        const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_REFRESH_SECRET);
        const newAccessToken = (0, tokens_1.generateAccessToken)({
            id: decoded.id,
            email: "",
        });
        return res.json({ accessToken: newAccessToken });
    }
    catch (err) {
        return res.status(403).json({ error: "Invalid refresh token" });
    }
});
router.get("/me", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader)
            return res.status(401).json({ error: "No token provided" });
        const token = authHeader.split(" ")[1];
        if (!token)
            return res.status(401).json({ error: "Invalid token format" });
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new Error("JWT_SECRET is not defined");
        const decoded = jsonwebtoken_1.default.verify(token, secret);
        // decoded.id и decoded.email теперь доступны
        const result = await db_1.pool.query("SELECT id, email, login, avatar FROM users WHERE id=$1", [decoded.id]);
        if (result.rowCount === 0)
            return res.status(404).json({ error: "User not found" });
        console.log("result", result);
        return res.json({ user: result.rows[0] });
    }
    catch (err) {
        console.error(err);
        return res.status(401).json({ error: "Unauthorized" });
    }
});
router.put("/:id", authMiddleware_1.auth, upload.single("avatar"), async (req, res) => {
    const { id } = req.params;
    const { login } = req.body;
    try {
        const avatarPath = req.file
            ? `${req.protocol}://${req.get("host")}/uploads/avatar/${req.file.filename}`
            : undefined;
        if (!login && !avatarPath) {
            return res.status(400).json({ error: "Нет данных для обновления" });
        }
        const result = await db_1.pool.query(`UPDATE users
       SET login = COALESCE($1, login),
           avatar = COALESCE($2, avatar)
       WHERE id = $3
       RETURNING id, email, login, avatar`, [login, avatarPath, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error("Ошибка обновления аватара", err);
        res.status(500).json({ error: "Ошибка сервера при обновлении аватара" });
    }
});
router.patch("/:id/password", async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;
        if (!password)
            return res.status(400).json({ error: "Password required" });
        const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
        const hash = await bcrypt_1.default.hash(password, rounds);
        const result = await db_1.pool.query("UPDATE users SET password = $1 WHERE id = $2 RETURNING id, email, login, avatar", [hash, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        return res.json({ message: "Password updated successfully" });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map