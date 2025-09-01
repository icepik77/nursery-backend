import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http"; // <-- для сокета
import { Server } from "socket.io"; // <-- socket.io

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// Маршруты
import authRoutes from "./routes/auth";
import petRoutes from './routes/pets';
import noteRoutes from './routes/notes';
import medical from './routes/medical';

app.use("/api/auth", authRoutes);
app.use("/api/pets", petRoutes);
app.use("/api/notes", noteRoutes);
app.use("/api/medical", medical);

// ======== Socket.io ========
const server = http.createServer(app); // оборачиваем Express в HTTP сервер
const io = new Server(server, {
  cors: { origin: "*" } // или укажи адрес твоего клиента
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("send_message", (data) => {
    io.emit("receive_message", data); // всем клиентам
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
