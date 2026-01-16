import express, { Router, Request, Response } from "express";
import { pool } from "../db";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import multer from "multer";
import { auth } from "../middleware/authMiddleware";
import path from "path";

const router = Router();

const storage = multer.diskStorage({
  destination: "uploads/avatar",
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({ storage });

router.post("/register", async (req, res) => {
  try {
    const {
      role = "individual",
      login,
      email,
      password,
      fullname,
      address,
      inn,
      phone,
      contact_email
    } = req.body;

    if (!login || !email || !password) {
      return res.status(400).json({
        error: "Login, email and password are required"
      });
    }

    if (!["individual", "company"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Проверка обязательных полей для юр лица
    if (role === "company") {
      if (!fullname || !address || !inn || !phone || !contact_email) {
        return res.status(400).json({
          error: "Fullname, address, INN, phone and contact_email are required for company"
        });
      }
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedLogin = login.trim();

    const existsEmail = await pool.query(
      "SELECT 1 FROM users WHERE email=$1",
      [normalizedEmail]
    );
    if (existsEmail.rowCount) {
      return res.status(400).json({ error: "Email already registered" });
    }

    const existsLogin = await pool.query(
      "SELECT 1 FROM users WHERE login=$1",
      [normalizedLogin]
    );
    if (existsLogin.rowCount) {
      return res.status(400).json({ error: "Login already taken" });
    }

    const hash = await bcrypt.hash(password, 10);

    const inserted = await pool.query(
      `INSERT INTO users
       (login, email, password, role, fullname, address, inn, phone, contact_email)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, login, email, role`,
      [
        normalizedLogin,
        normalizedEmail,
        hash,
        role,
        fullname || null,
        address || null,
        inn || null,
        phone || null,
        contact_email || null
      ]
    );

    const user = inserted.rows[0];

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error("JWT_SECRET is not defined");
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      secret,
      { expiresIn: "7d" }
    );

    return res.json({ message: "User registered", token, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body as { email?: string; password?: string };

    console.log("email", email);
    console.log("password", password);

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password required" });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const result = await pool.query(
      "SELECT id, email, password, login, avatar FROM users WHERE email=$1",
      [normalizedEmail]
    );
    if (result.rowCount === 0) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not defined");
    console.log("Okrs");

    const token = jwt.sign({ id: user.id, email: user.email }, secret, { expiresIn: "7d" });

    return res.json({ token, user: { id: user.id, email: user.email, login: user.login, avatar: user.avatar } });
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
    const result = await pool.query(
      "SELECT id, email, login, avatar FROM users WHERE id=$1",
      [decoded.id]
    );

    if (result.rowCount === 0) return res.status(404).json({ error: "User not found" });

    console.log("result", result); 

    return res.json({ user: result.rows[0] });

  } catch (err) {
    console.error(err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

router.put("/:id", auth, upload.single("avatar"), async (req, res) => {
  const { id } = req.params;
  const { login } = req.body;

  try {
    const avatarPath = req.file
      ? `${req.protocol}://${req.get("host")}/uploads/avatar/${req.file.filename}`
      : undefined;

    if (!login && !avatarPath) {
      return res.status(400).json({ error: "Нет данных для обновления" });
    }

    const result = await pool.query(
      `UPDATE users
       SET login = COALESCE($1, login),
           avatar = COALESCE($2, avatar)
       WHERE id = $3
       RETURNING id, email, login, avatar`,
      [login, avatarPath, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Ошибка обновления аватара", err);
    res.status(500).json({ error: "Ошибка сервера при обновлении аватара" });
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
