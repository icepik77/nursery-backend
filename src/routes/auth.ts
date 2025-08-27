import { Router } from "express";
import { pool } from "../db";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    // normalize email
    const normalizedEmail = email.trim().toLowerCase();

    // check unique
    const exists = await pool.query("SELECT 1 FROM users WHERE email = $1", [normalizedEmail]);
    if (exists.rowCount) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
    const hash = await bcrypt.hash(password, rounds);

    const inserted = await pool.query(
      "INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email",
      [normalizedEmail, hash]
    );
    const user = inserted.rows[0];

    // auto-login after register (optional)
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not defined");

    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: "7d" });

    return res.json({ message: "User registered", token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query("SELECT id, email, password FROM users WHERE email=$1", [normalizedEmail]);
    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not defined");

    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: "7d" });

    return res.json({ token, user: { id: user.id, email: user.email } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
