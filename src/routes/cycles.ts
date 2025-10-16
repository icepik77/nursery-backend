import { Router, Request, Response } from "express";
import { auth } from "../middleware/authMiddleware";
import { pool } from "../db";
import { v4 as uuidv4 } from "uuid";

const router = Router();

export type PetCycle = {
  id: string;
  petId: string;
  start_date: string;
  end_date?: string | null;
  note?: string | null;
  period_days: number; // ⬅️ оставляем только период
  created_at?: Date;
  updated_at?: Date;
};

// -------------------------------------------------------
// GET  /api/pet-cycles?petId=...
// Получить все циклы конкретного питомца
// -------------------------------------------------------
router.get("/", auth, async (req: Request, res: Response) => {
  const { petId } = req.query;
  if (!petId) return res.status(400).json({ error: "petId required" });

  try {
    const result = await pool.query(
      `SELECT *
         FROM pet_cycles
        WHERE pet_id = $1
        ORDER BY start_date DESC`,
      [petId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка при получении циклов" });
  }
});

// -------------------------------------------------------
// POST /api/pet-cycles
// Добавить новый цикл
// -------------------------------------------------------
router.post("/", auth, async (req: Request, res: Response) => {
  const { petId, start_date, end_date, note, period_days } = req.body as {
    petId?: string;
    start_date?: string;
    end_date?: string;
    note?: string;
    period_days?: number;
  };

  if (!petId || !start_date) {
    return res.status(400).json({ error: "petId и start_date обязательны" });
  }

  const newCycle: PetCycle = {
    id: uuidv4(),
    petId,
    start_date,
    end_date: end_date ?? null,
    note: note ?? null,
    period_days: period_days ?? 180, // дефолтное значение
    created_at: new Date(),
  };

  try {
    const result = await pool.query(
      `INSERT INTO pet_cycles
         (id, pet_id, start_date, end_date, note, period_days, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [
        newCycle.id,
        newCycle.petId,
        newCycle.start_date,
        newCycle.end_date,
        newCycle.note,
        newCycle.period_days,
        newCycle.created_at,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера при добавлении цикла" });
  }
});

// -------------------------------------------------------
// PUT /api/pet-cycles/:id
// Обновить цикл
// -------------------------------------------------------
router.put("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { start_date, end_date, note, period_days } = req.body as {
    start_date?: string;
    end_date?: string;
    note?: string;
    period_days?: number;
  };

  if (!start_date && !end_date && !note && !period_days) {
    return res.status(400).json({
      error: "Нужно передать хотя бы одно поле для обновления (start_date, end_date, note, period_days)",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE pet_cycles
          SET start_date  = COALESCE($1, start_date),
              end_date    = COALESCE($2, end_date),
              note        = COALESCE($3, note),
              period_days = COALESCE($4, period_days),
              updated_at  = now()
        WHERE id = $5
        RETURNING *`,
      [start_date, end_date, note, period_days, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Цикл не найден" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера при обновлении цикла" });
  }
});

// -------------------------------------------------------
// DELETE /api/pet-cycles/:id
// Удалить цикл
// -------------------------------------------------------
router.delete("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      "DELETE FROM pet_cycles WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Цикл не найден" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера при удалении цикла" });
  }
});

export default router;
