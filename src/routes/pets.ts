import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../middleware/authMiddleware";
import { pool } from "../db";

const router = Router();

import multer from "multer";
import path from "path";
import fs from "fs";

// создаём папку uploads, если её нет
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// конфиг multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

export const upload = multer({ storage });


export type Pet = {
  id: string;
  user_id: string;
  name?: string;
  gender?: string;
  birthdate?: string;
  chip?: string;
  breed?: string;
  weight?: string;
  height?: string;
  color?: string;
  note?: string;
  imageUri?: string;
  bigNote?: string;
  category?: string;
  pasportName?: string;
};

// Получить питомцев пользователя
router.get("/", auth, async (req: Request, res: Response) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: "userId is required" });

  try {
    const result = await pool.query(
      `SELECT * FROM pets WHERE user_id = $1 ORDER BY name ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера при получении питомцев" });
  }
});

// Добавить нового питомца
router.post("/", auth, upload.single("image"), async (req: Request, res: Response) => {
  const { userId, ...petData } = req.body;

  if (!userId || !petData.name) {
    return res.status(400).json({ error: "user_id and name are required" });
  }

    const imageUri = req.file ? `/uploads/${req.file.filename}` : null;

  const newPet = {
    ...petData,
    id: uuidv4(),
    userId,
    imageUri, // ✅ camelCase
  };

  try {
    const columns = Object.keys(newPet);
    const values = Object.values(newPet);
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(", ");

    console.log(req.file);
    console.log(req.body);


    const query = `INSERT INTO pets(${columns.join(", ")})
                   VALUES(${placeholders}) RETURNING *`;

    const result = await pool.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера при добавлении питомца" });
  }
});

// Удалить питомца
router.delete("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const result = await pool.query(`DELETE FROM pets WHERE id = $1 RETURNING *`, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: "Pet not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера при удалении питомца" });
  }
});

// Обновить питомца
router.put("/:id", auth, async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const setClause = Object.keys(updates)
      .map((key, idx) => `${key} = $${idx + 1}`)
      .join(", ");
    const values = Object.values(updates);

    const query = `UPDATE pets SET ${setClause} WHERE id = $${values.length + 1} RETURNING *`;
    const result = await pool.query(query, [...values, id]);

    if (result.rows.length === 0) return res.status(404).json({ error: "Pet not found" });

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Ошибка сервера при обновлении питомца" });
  }
});

export default router;
