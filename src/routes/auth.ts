import { Router } from "express";
import { pool } from "../db";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
dotenv.config();

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const hashedPassword = await bcrypt.hash(password, 10);
  await pool.query("INSERT INTO users (email, password) VALUES ($1, $2)", [email, hashedPassword]);
  res.json({ message: "User registered" });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const result = await pool.query("SELECT * FROM users WHERE email=$1", [email]);
  if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });

  const user = result.rows[0];
  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET as string,
    { expiresIn: "7d" }
  );

  res.json({ token });
});

export default router;
