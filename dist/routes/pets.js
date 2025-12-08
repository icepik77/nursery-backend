"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const uuid_1 = require("uuid");
const authMiddleware_1 = require("../middleware/authMiddleware");
const db_1 = require("../db");
const multer_1 = require("../config/multer");
const router = (0, express_1.Router)();
// Получить питомцев пользователя
router.get("/", authMiddleware_1.auth, async (req, res) => {
    const { userId } = req.query;
    if (!userId)
        return res.status(400).json({ error: "userId is required" });
    try {
        const result = await db_1.pool.query(`SELECT * FROM pets WHERE user_id = $1 ORDER BY name ASC`, [userId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при получении питомцев" });
    }
});
// Добавить нового питомца
router.post("/", authMiddleware_1.auth, multer_1.upload.single("image"), async (req, res) => {
    const { user_id, ...petData } = req.body;
    if (!user_id || !petData.name) {
        return res.status(400).json({ error: "user_id and name are required" });
    }
    const imageUri = req.file
        ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`
        : null;
    const newPet = {
        ...petData,
        id: (0, uuid_1.v4)(),
        user_id,
        imageuri: imageUri, // ✅ соответствует колонке в БД
    };
    try {
        const columns = Object.keys(newPet);
        const values = Object.values(newPet);
        const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");
        const query = `INSERT INTO pets(${columns.join(", ")})
                   VALUES(${placeholders}) RETURNING *`;
        const result = await db_1.pool.query(query, values);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при добавлении питомца" });
    }
});
// Удалить питомца
router.delete("/:id", authMiddleware_1.auth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db_1.pool.query(`DELETE FROM pets WHERE id = $1 RETURNING *`, [id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Pet not found" });
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при удалении питомца" });
    }
});
// Обновить питомца с возможностью обновления фото
router.put("/:id", authMiddleware_1.auth, multer_1.upload.single("image"), async (req, res) => {
    const { id } = req.params;
    const updates = { ...req.body };
    if (req.file) {
        delete updates.imageuri; // убираем возможный дубликат
        updates.imageuri = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    }
    try {
        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ error: "Нет данных для обновления" });
        }
        const setClause = Object.keys(updates)
            .map((key, idx) => `${key} = $${idx + 1}`)
            .join(", ");
        const values = Object.values(updates);
        const query = `UPDATE pets
                   SET ${setClause}
                   WHERE id = $${values.length + 1}
                   RETURNING *`;
        const result = await db_1.pool.query(query, [...values, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Pet not found" });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при обновлении питомца" });
    }
});
exports.default = router;
//# sourceMappingURL=pets.js.map