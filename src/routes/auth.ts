import { Router } from "express";
import { pool } from "../db";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  await pool.query("INSERT INTO users (email, password) VALUES ($1, $2)", [email, password]);
  res.json({ message: "User registered" });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const result = await pool.query("SELECT * FROM users WHERE email=$1 AND password=$2", [email, password]);
  if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: result.rows[0].id, email }, process.env.JWT_SECRET as string, { expiresIn: "7d" });
  res.json({ token });
});

export default router;
