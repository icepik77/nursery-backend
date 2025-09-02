import { Router, Request, Response } from "express";
import { auth } from "../middleware/authMiddleware";
import { pool } from "../db";
import { v4 as uuidv4 } from "uuid";

const router = Router();

export type PetEvent = {
  id: string;
  pet_id: string;
  title: string;
  event_date: string; // ISO date string
  created_at?: Date;
  updated_at?: Date;
};

// -------------------------
// Получить все события питомца
// -------------------------
router.get("/", auth, async (req: Request, res: Response) => {
  const { petId } = req.query;
  if (!petId) return res.status(400).json({ error: "petId required" });

  try {
    const result = await pool.query(
      "SELECT * FROM pet_events WHERE pet_id = $1 ORDER BY event_date DESC",
      [petId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка при получении событий" });
  }
});

// -------------------------
// Добавить новое событие
// -------------------------
router.post("/", auth, async (req: Request, res: Response) => {
  const { pet_id, title, event_date } = req.body as {
    pet_id?: string;
    title?: string;
    event_date?: string;
  };

  if (!pet_id || !title || !event_date) {
    return res.status(400).json({ error: "pet_id, title и event_date обязательны" });
  }

  const newEvent: PetEvent = {
    id: uuidv4(),
    pet_id,
    title,
    event_date,
    created_at: new Date(),
  };

  try {
    const result = await pool.query(
      `INSERT INTO pet_events(id, pet_id, title, event_date, created_at)
       VALUES($1, $2, $3, $4, $5)
       RETURNING *`,
      [newEvent.id, newEvent.pet_id, newEvent.title, newEvent.event_date, newEvent.created_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера при добавлении события" });
  }
});

// -------------------------
// Обновить событие
// -------------------------
router.put("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, event_date } = req.body as {
    title?: string;
    event_date?: string;
  };

  if (!title && !event_date) {
    return res.status(400).json({ error: "Необходимо передать хотя бы одно поле (title или event_date)" });
  }

  try {
    const result = await pool.query(
      `UPDATE pet_events
       SET title = COALESCE($1, title),
           event_date = COALESCE($2, event_date),
           updated_at = now()
       WHERE id = $3
       RETURNING *`,
      [title, event_date, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Событие не найдено" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера при обновлении события" });
  }
});

// -------------------------
// Удалить событие
// -------------------------
router.delete("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM pet_events WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Событие не найдено" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера при удалении события" });
  }
});

export default router;
