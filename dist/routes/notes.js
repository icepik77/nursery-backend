"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const db_1 = require("../db");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// -------------------------
// Получить все заметки питомца
// -------------------------
router.get("/", authMiddleware_1.auth, async (req, res) => {
    const { petId } = req.query;
    if (!petId)
        return res.status(400).json({ error: "petId required" });
    const result = await db_1.pool.query("SELECT * FROM pet_notes WHERE pet_id = $1 ORDER BY created_at DESC", [petId]);
    res.json(result.rows);
});
// -------------------------
// Добавить новую заметку
// -------------------------
router.post("/", authMiddleware_1.auth, async (req, res) => {
    const { pet_id, text } = req.body;
    if (!pet_id || !text) {
        return res.status(400).json({ error: "pet_id и text обязательны" });
    }
    const newNote = {
        id: (0, uuid_1.v4)(),
        pet_id,
        text,
        created_at: new Date(),
    };
    try {
        const result = await db_1.pool.query(`INSERT INTO pet_notes(id, pet_id, text, created_at)
       VALUES($1, $2, $3, $4)
       RETURNING *`, [newNote.id, newNote.pet_id, newNote.text, newNote.created_at]);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при добавлении заметки" });
    }
});
// -------------------------
// Обновить заметку
// -------------------------
router.put("/:id", authMiddleware_1.auth, async (req, res) => {
    const { id } = req.params;
    const { text } = req.body;
    if (!text)
        return res.status(400).json({ error: "text обязателен" });
    try {
        const result = await db_1.pool.query(`UPDATE pet_notes
       SET text = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`, [text, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Заметка не найдена" });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при обновлении заметки" });
    }
});
// -------------------------
// Удалить заметку
// -------------------------
router.delete("/:id", authMiddleware_1.auth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db_1.pool.query("DELETE FROM pet_notes WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Заметка не найдена" });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при удалении заметки" });
    }
});
exports.default = router;
//# sourceMappingURL=notes.js.map