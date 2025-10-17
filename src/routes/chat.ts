import express, { Request, Response } from "express";
import { pool } from "../db";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../middleware/authMiddleware";

const router = express.Router();

// Получить историю чата (например, последние 100 сообщений)
router.get("/", auth, async (_req: Request, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT * FROM chat_messages ORDER BY timestamp ASC LIMIT 100`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Ошибка получения истории чата:", err);
    res.status(500).json({ error: "Ошибка сервера" });
  }
});

export default router;
