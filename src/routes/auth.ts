import { Router } from "express";
import { pool } from "../db";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";

const router = Router();

router.post("/register", async (req, res) => {
  try {
    const { login, email, password } = req.body as {
      login?: string;
      email?: string;
      password?: string;
    };

    if (!login || !email || !password) {
      return res.status(400).json({ error: "Login, email and password required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedLogin = login.trim();

    // проверка уникальности email
    const existsEmail = await pool.query("SELECT 1 FROM users WHERE email=$1", [normalizedEmail]);
    if (existsEmail.rowCount) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // проверка уникальности login
    const existsLogin = await pool.query("SELECT 1 FROM users WHERE login=$1", [normalizedLogin]);
    if (existsLogin.rowCount) {
      return res.status(400).json({ error: "Login already taken" });
    }

    const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
    const hash = await bcrypt.hash(password, rounds);

    // сохраняем пользователя с login
    const inserted = await pool.query(
      "INSERT INTO users (login, email, password) VALUES ($1, $2, $3) RETURNING id, login, email",
      [normalizedLogin, normalizedEmail, hash]
    );

    const user = inserted.rows[0];

    // автоматический логин после регистрации
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not defined");

    const token = jwt.sign({ id: user.id, email: user.email, login: user.login }, secret, { expiresIn: "7d" });

    return res.json({ message: "User registered", token, user });
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

    return res.json({ token, user: { id: user.id, email: user.email, login: user.login } });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });

    const token = authHeader.split(" ")[1];
    if (!token) return res.status(401).json({ error: "Invalid token format" });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not defined");

    // Типизация payload
    interface MyJwtPayload extends JwtPayload {
      id: string;
      email: string;
    }

    const decoded = jwt.verify(token, secret) as MyJwtPayload;

    // decoded.id и decoded.email теперь доступны
    const result = await pool.query("SELECT id, email FROM users WHERE id=$1", [decoded.id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });

    return res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

router.patch("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { login, avatar } = req.body as { login?: string; avatar?: string };

    if (!login && !avatar) {
      return res.status(400).json({ error: "Nothing to update" });
    }

    const result = await pool.query(
      "UPDATE users SET login = COALESCE($1, login), avatar = COALESCE($2, avatar) WHERE id = $3 RETURNING id, email, login, avatar",
      [login, avatar, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.patch("/:id/password", async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body as { password?: string };

    if (!password) return res.status(400).json({ error: "Password required" });

    const rounds = Number(process.env.BCRYPT_ROUNDS || 10);
    const hash = await bcrypt.hash(password, rounds);

    const result = await pool.query(
      "UPDATE users SET password = $1 WHERE id = $2 RETURNING id, email, login, avatar",
      [hash, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
