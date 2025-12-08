"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const db_1 = require("../db");
const authMiddleware_1 = require("../middleware/authMiddleware");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const router = express_1.default.Router();
// --- Настройка multer ---
const storage = multer_1.default.diskStorage({
    destination: "uploads/files",
    filename: (_req, file, cb) => {
        const ext = path_1.default.extname(file.originalname);
        cb(null, `${(0, uuid_1.v4)()}${ext}`);
    },
});
const upload = (0, multer_1.default)({ storage });
/**
 * GET /api/files?petId=...
 * Получить все файлы для питомца
 */
router.get("/", authMiddleware_1.auth, async (req, res) => {
    const { petId } = req.query;
    if (!petId)
        return res.status(400).json({ error: "petId is required" });
    try {
        const result = await db_1.pool.query(`SELECT * FROM pet_files WHERE pet_id = $1 ORDER BY created_at DESC`, [petId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Ошибка получения файлов", err);
        res.status(500).json({ error: "Ошибка сервера при получении файлов" });
    }
});
/**
 * POST /api/files
 * Добавить новый файл
 * form-data: pet_id, file (binary)
 */
router.post("/", authMiddleware_1.auth, upload.single("file"), async (req, res) => {
    const { pet_id } = req.body;
    if (!pet_id) {
        return res.status(400).json({ error: "pet_id обязателен" });
    }
    if (!req.file) {
        return res.status(400).json({ error: "Файл обязателен" });
    }
    const newFile = {
        id: (0, uuid_1.v4)(),
        pet_id,
        name: decodeURIComponent(req.file.originalname),
        uri: `${req.protocol}://${req.get("host")}/uploads/files/${req.file.filename}`,
        type: req.file.mimetype,
        size: req.file.size,
    };
    try {
        const cols = Object.keys(newFile);
        const vals = Object.values(newFile);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        const query = `INSERT INTO pet_files (${cols.join(", ")})
                   VALUES (${placeholders}) RETURNING *`;
        const result = await db_1.pool.query(query, vals);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error("Ошибка добавления файла", err);
        res.status(500).json({ error: "Ошибка сервера при добавлении файла" });
    }
});
/**
 * PUT /api/files/:id
 * Обновить файл (заменить файл) или имя
 */
router.put("/:id", authMiddleware_1.auth, upload.single("file"), async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        const updates = [];
        const values = [];
        let idx = 1;
        if (req.file) {
            updates.push(`uri = $${idx++}`);
            updates.push(`type = $${idx++}`);
            updates.push(`size = $${idx++}`);
            values.push(`${req.protocol}://${req.get("host")}/uploads/files/${req.file.filename}`);
            values.push(req.file.mimetype);
            values.push(req.file.size);
            // автоматически обновляем имя, если файл новый
            if (!name) {
                updates.push(`name = $${idx++}`);
                values.push(req.file.originalname);
            }
        }
        if (name) {
            updates.push(`name = $${idx++}`);
            values.push(name);
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: "Нет данных для обновления" });
        }
        values.push(id);
        const query = `UPDATE pet_files SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${idx} RETURNING *`;
        const result = await db_1.pool.query(query, values);
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error("Ошибка обновления файла", err);
        res.status(500).json({ error: "Ошибка сервера при обновлении файла" });
    }
});
/**
 * DELETE /api/files/:id
 * Удалить файл
 */
router.delete("/:id", authMiddleware_1.auth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db_1.pool.query(`DELETE FROM pet_files WHERE id = $1 RETURNING *`, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Файл не найден" });
        }
        res.json({ success: true, deleted: result.rows[0] });
    }
    catch (err) {
        console.error("Ошибка удаления файла", err);
        res.status(500).json({ error: "Ошибка сервера при удалении файла" });
    }
});
exports.default = router;
//# sourceMappingURL=files.js.map