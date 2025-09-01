import { Router, Request, Response } from "express";
import { auth } from "../middleware/authMiddleware";
import { pool } from "../db";
import { v4 as uuidv4 } from "uuid";

const router = Router();

export type PetMedical = {
  id: string;
  pet_id: string;
  title: string;
  content?: string;
  created_at?: Date;
  updated_at?: Date;
  category: string;
};

// -------------------------
// Получить все записи по питомцу
// -------------------------
router.get("/", auth, async (req: Request, res: Response) => {
  const { petId } = req.query;
  if (!petId) return res.status(400).json({ error: "petId required" });

  try {
    const result = await pool.query(
      "SELECT * FROM pet_medical WHERE pet_id = $1 ORDER BY created_at DESC",
      [petId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Ошибка получения мед. записей:", err);
    res.status(500).json({ error: "Ошибка сервера при загрузке записей" });
  }
});

// -------------------------
// Добавить новую запись
// -------------------------
router.post("/", auth, async (req: Request, res: Response) => {
  const { pet_id, title, content, category } = req.body as Partial<PetMedical>;

  if (!pet_id || !title) {
    return res.status(400).json({ error: "pet_id и title обязательны" });
  }

  const newMedical: PetMedical = {
    id: uuidv4(),
    pet_id,
    title,
    content: content || "",   // теперь точно string
    category: category || "other",
    created_at: new Date(),
    };

  try {
    const result = await pool.query(
      `INSERT INTO pet_medical(id, pet_id, title, content, category, created_at)
       VALUES($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        newMedical.id,
        newMedical.pet_id,
        newMedical.title,
        newMedical.content,
        newMedical.category,
        newMedical.created_at,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Ошибка добавления мед. записи:", err);
    res.status(500).json({ error: "Ошибка сервера при добавлении записи" });
  }
});

// -------------------------
// Обновить запись
// -------------------------
router.put("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, content, category } = req.body as Partial<PetMedical>;

  try {
    const result = await pool.query(
      `UPDATE pet_medical
       SET 
         title = COALESCE($1, title),
         content = COALESCE($2, content),
         category = COALESCE($3, category),
         updated_at = now()
       WHERE id = $4
       RETURNING *`,
      [title, content, category, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Запись не найдена" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Ошибка обновления мед. записи:", err);
    res.status(500).json({ error: "Ошибка сервера при обновлении записи" });
  }
});

// -------------------------
// Удалить запись
// -------------------------
router.delete("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM pet_medical WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Запись не найдена" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Ошибка удаления мед. записи:", err);
    res.status(500).json({ error: "Ошибка сервера при удалении записи" });
  }
});

export default router;
