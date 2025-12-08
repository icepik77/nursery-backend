"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const db_1 = require("../db");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
// Получить историю чата (например, последние 100 сообщений)
router.get("/", authMiddleware_1.auth, async (_req, res) => {
    try {
        const result = await db_1.pool.query(`SELECT * FROM chat_messages ORDER BY timestamp ASC LIMIT 100`);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Ошибка получения истории чата:", err);
        res.status(500).json({ error: "Ошибка сервера" });
    }
});
exports.default = router;
//# sourceMappingURL=chat.js.map