import express, { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { pool } from "../db";
import { auth } from "../middleware/authMiddleware";
import multer from "multer";
import path from "path";

const router = express.Router();

// --- Настройка multer ---
const storage = multer.diskStorage({
  destination: "uploads/files",
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage });

/**
 * GET /api/files?petId=...
 * Получить все файлы для питомца
 */
router.get("/", auth, async (req: Request, res: Response) => {
  const { petId } = req.query;
  if (!petId) return res.status(400).json({ error: "petId is required" });

  try {
    const result = await pool.query(
      `SELECT * FROM pet_files WHERE pet_id = $1 ORDER BY created_at DESC`,
      [petId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Ошибка получения файлов", err);
    res.status(500).json({ error: "Ошибка сервера при получении файлов" });
  }
});

/**
 * POST /api/files
 * Добавить новый файл
 * form-data: pet_id, file (binary)
 */
router.post("/", auth, upload.single("file"), async (req: Request, res: Response) => {
  const { pet_id } = req.body;

  if (!pet_id) {
    return res.status(400).json({ error: "pet_id обязателен" });
  }

  if (!req.file) {
    return res.status(400).json({ error: "Файл обязателен" });
  }

  const newFile = {
    id: uuidv4(),
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
    const result = await pool.query(query, vals);

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Ошибка добавления файла", err);
    res.status(500).json({ error: "Ошибка сервера при добавлении файла" });
  }
});

/**
 * PUT /api/files/:id
 * Обновить файл (заменить файл) или имя
 */
router.put("/:id", auth, upload.single("file"), async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const updates: string[] = [];
    const values: any[] = [];
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
    const result = await pool.query(query, values);

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Ошибка обновления файла", err);
    res.status(500).json({ error: "Ошибка сервера при обновлении файла" });
  }
});

/**
 * DELETE /api/files/:id
 * Удалить файл
 */
router.delete("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`DELETE FROM pet_files WHERE id = $1 RETURNING *`, [id]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Файл не найден" });
    }
    res.json({ success: true, deleted: result.rows[0] });
  } catch (err) {
    console.error("Ошибка удаления файла", err);
    res.status(500).json({ error: "Ошибка сервера при удалении файла" });
  }
});

export default router;
