import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http"; // <-- для сокета
import { Server } from "socket.io"; // <-- socket.io
import path from "path";
import { v4 as uuidv4 } from "uuid";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, "../uploads"); // путь к папке относительно index.ts
app.use("/uploads", express.static(uploadDir));

// Маршруты
import authRoutes from "./routes/auth";
import petRoutes from './routes/pets';
import noteRoutes from './routes/notes';
import medicalRoutes from './routes/medical';
import eventRoutes from './routes/events';
import documentRoutes from './routes/files';
import cycleRoutes from './routes/cycles';
import chatRoutes from './routes/chat';
import { pool } from "./db";

app.use("/api/auth", authRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/medical", medicalRoutes);
app.use("/api/events", eventRoutes);
app.use("/api/cycles", cycleRoutes);
app.use("/api/files", documentRoutes);
app.use("/api/chat", chatRoutes);
app.use("/uploads", express.static("uploads")); // чтобы раздавать картинки





// ======== Socket.io ========
const server = http.createServer(app); // оборачиваем Express в HTTP сервер
const io = new Server(server, {
  cors: { origin: "*" } // или укажи адрес твоего клиента
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("send_message", async (data) => {
    try {
      const messageId = uuidv4();
      const query = `
        INSERT INTO chat_messages (id, user_id, username, avatar, text, reply_to, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `;
      await pool.query(query, [
        messageId,
        data.userId,
        data.username,
        data.avatar,
        data.text,
        data.replyTo ? JSON.stringify(data.replyTo) : null,
      ]);

      // Рассылаем всем клиентам (вместе с id)
      io.emit("receive_message", { ...data, id: messageId });
    } catch (err) {
      console.error("Ошибка сохранения сообщения:", err);
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ======== Запуск сервера ========
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
