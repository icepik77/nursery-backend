import { Router } from "express";
import { pool } from "../db";
import { authMiddleware } from "../middleware/authMiddleware";

const router = Router();

router.get("/", authMiddleware, async (req, res) => {
  const pets = await pool.query("SELECT * FROM pets WHERE user_id=$1", [(req as any).user.id]);
  res.json(pets.rows);
});

router.post("/", authMiddleware, async (req, res) => {
  const { name } = req.body;
  await pool.query("INSERT INTO pets (user_id, name) VALUES ($1, $2)", [(req as any).user.id, name]);
  res.json({ message: "Pet created" });
});

export default router;
