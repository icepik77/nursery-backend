"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const db_1 = require("../db");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// -------------------------
// Получить все записи по питомцу
// -------------------------
router.get("/", authMiddleware_1.auth, async (req, res) => {
    const { petId } = req.query;
    if (!petId)
        return res.status(400).json({ error: "petId required" });
    try {
        const result = await db_1.pool.query("SELECT * FROM pet_medical WHERE pet_id = $1 ORDER BY created_at DESC", [petId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Ошибка получения мед. записей:", err);
        res.status(500).json({ error: "Ошибка сервера при загрузке записей" });
    }
});
// -------------------------
// Добавить новую запись
// -------------------------
router.post("/", authMiddleware_1.auth, async (req, res) => {
    const { pet_id, title, content, category } = req.body;
    if (!pet_id || !title) {
        return res.status(400).json({ error: "pet_id и title обязательны" });
    }
    const newMedical = {
        id: (0, uuid_1.v4)(),
        pet_id,
        title,
        content: content || "", // теперь точно string
        category: category || "other",
        created_at: new Date(),
    };
    try {
        const result = await db_1.pool.query(`INSERT INTO pet_medical(id, pet_id, title, content, category, created_at)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING *`, [
            newMedical.id,
            newMedical.pet_id,
            newMedical.title,
            newMedical.content,
            newMedical.category,
            newMedical.created_at,
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error("Ошибка добавления мед. записи:", err);
        res.status(500).json({ error: "Ошибка сервера при добавлении записи" });
    }
});
// -------------------------
// Обновить запись
// -------------------------
router.put("/:id", authMiddleware_1.auth, async (req, res) => {
    const { id } = req.params;
    const { title, content, category } = req.body;
    try {
        const result = await db_1.pool.query(`UPDATE pet_medical
       SET 
         title = COALESCE($1, title),
         content = COALESCE($2, content),
         category = COALESCE($3, category),
         updated_at = now()
       WHERE id = $4
       RETURNING *`, [title, content, category, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Запись не найдена" });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error("Ошибка обновления мед. записи:", err);
        res.status(500).json({ error: "Ошибка сервера при обновлении записи" });
    }
});
// -------------------------
// Удалить запись
// -------------------------
router.delete("/:id", authMiddleware_1.auth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db_1.pool.query("DELETE FROM pet_medical WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Запись не найдена" });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error("Ошибка удаления мед. записи:", err);
        res.status(500).json({ error: "Ошибка сервера при удалении записи" });
    }
});
exports.default = router;
//# sourceMappingURL=medical.js.map