import { Router, Request, Response } from "express";
import { auth } from "../middleware/authMiddleware";
import { pool } from "../db";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Тип заметки
export type PetNote = {
  id: string;
  pet_id: string;
  text: string;
  created_at?: Date;
  updated_at?: Date;
};

// -------------------------
// Получить все заметки питомца
// -------------------------
router.get("/", auth, async (req: Request, res: Response) => {
  const { petId } = req.query;
  if (!petId) return res.status(400).json({ error: "petId required" });

  const result = await pool.query(
    "SELECT * FROM pet_notes WHERE pet_id = $1 ORDER BY created_at DESC",
    [petId]
  );
  res.json(result.rows);
});

// -------------------------
// Добавить новую заметку
// -------------------------
router.post("/", auth, async (req: Request, res: Response) => {
  const { pet_id, text } = req.body as { pet_id?: string; text?: string };

  if (!pet_id || !text) {
    return res.status(400).json({ error: "pet_id и text обязательны" });
  }

  const newNote: PetNote = {
    id: uuidv4(),
    pet_id,
    text,
    created_at: new Date(),
  };

  try {
    const result = await pool.query(
      `INSERT INTO pet_notes(id, pet_id, text, created_at)
       VALUES($1, $2, $3, $4)
       RETURNING *`,
      [newNote.id, newNote.pet_id, newNote.text, newNote.created_at]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера при добавлении заметки" });
  }
});

// -------------------------
// Обновить заметку
// -------------------------
router.put("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { text } = req.body as { text?: string };

  if (!text) return res.status(400).json({ error: "text обязателен" });

  try {
    const result = await pool.query(
      `UPDATE pet_notes
       SET text = $1, updated_at = now()
       WHERE id = $2
       RETURNING *`,
      [text, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Заметка не найдена" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера при обновлении заметки" });
  }
});

// -------------------------
// Удалить заметку
// -------------------------
router.delete("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM pet_notes WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Заметка не найдена" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера при удалении заметки" });
  }
});

export default router;
