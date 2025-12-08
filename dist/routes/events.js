"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const db_1 = require("../db");
const uuid_1 = require("uuid");
const router = (0, express_1.Router)();
// -------------------------
// Получить все события питомца
// -------------------------
router.get("/", authMiddleware_1.auth, async (req, res) => {
    const { petId } = req.query;
    if (!petId)
        return res.status(400).json({ error: "petId required" });
    try {
        const result = await db_1.pool.query("SELECT * FROM pet_events WHERE pet_id = $1 ORDER BY event_date DESC", [petId]);
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка при получении событий" });
    }
});
// -------------------------
// Добавить новое событие
// -------------------------
router.post("/", authMiddleware_1.auth, async (req, res) => {
    const { petId: petId, title, event_date } = req.body;
    if (!petId || !title || !event_date) {
        return res.status(400).json({ error: "pet_id, title и event_date обязательны" });
    }
    const newEvent = {
        id: (0, uuid_1.v4)(),
        petId: petId,
        title,
        event_date,
        created_at: new Date(),
    };
    try {
        const result = await db_1.pool.query(`INSERT INTO pet_events(id, pet_id, title, event_date, created_at)
       VALUES($1, $2, $3, $4, $5)
       RETURNING *`, [newEvent.id, newEvent.petId, newEvent.title, newEvent.event_date, newEvent.created_at]);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при добавлении события" });
    }
});
// -------------------------
// Обновить событие
// -------------------------
router.put("/:id", authMiddleware_1.auth, async (req, res) => {
    const { id } = req.params;
    const { title, event_date } = req.body;
    if (!title && !event_date) {
        return res.status(400).json({ error: "Необходимо передать хотя бы одно поле (title или event_date)" });
    }
    try {
        const result = await db_1.pool.query(`UPDATE pet_events
       SET title = COALESCE($1, title),
           event_date = COALESCE($2, event_date),
           updated_at = now()
       WHERE id = $3
       RETURNING *`, [title, event_date, id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Событие не найдено" });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при обновлении события" });
    }
});
// -------------------------
// Удалить событие
// -------------------------
router.delete("/:id", authMiddleware_1.auth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db_1.pool.query("DELETE FROM pet_events WHERE id = $1 RETURNING *", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Событие не найдено" });
        }
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при удалении события" });
    }
});
exports.default = router;
//# sourceMappingURL=events.js.map