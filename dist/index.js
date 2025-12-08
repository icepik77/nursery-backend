"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const http_1 = __importDefault(require("http")); // <-- для сокета
const socket_io_1 = require("socket.io"); // <-- socket.io
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const uploadDir = path_1.default.join(__dirname, "../uploads"); // путь к папке относительно index.ts
app.use("/uploads", express_1.default.static(uploadDir));
// Маршруты
const auth_1 = __importDefault(require("./routes/auth"));
const pets_1 = __importDefault(require("./routes/pets"));
const notes_1 = __importDefault(require("./routes/notes"));
const medical_1 = __importDefault(require("./routes/medical"));
const events_1 = __importDefault(require("./routes/events"));
const files_1 = __importDefault(require("./routes/files"));
const cycles_1 = __importDefault(require("./routes/cycles"));
const chat_1 = __importDefault(require("./routes/chat"));
const db_1 = require("./db");
app.use("/api/auth", auth_1.default);
app.use("/api/pets", pets_1.default);
app.use("/api/notes", notes_1.default);
app.use("/api/medical", medical_1.default);
app.use("/api/events", events_1.default);
app.use("/api/cycles", cycles_1.default);
app.use("/api/files", files_1.default);
app.use("/api/chat", chat_1.default);
app.use("/uploads", express_1.default.static("uploads")); // чтобы раздавать картинки
// ======== Socket.io ========
const server = http_1.default.createServer(app); // оборачиваем Express в HTTP сервер
const io = new socket_io_1.Server(server, {
    cors: { origin: "*" } // или укажи адрес твоего клиента
});
io.on("connection", (socket) => {
    console.log("User connected:", socket.id);
    socket.on("send_message", async (data) => {
        try {
            const messageId = (0, uuid_1.v4)();
            const query = `
        INSERT INTO chat_messages (id, user_id, username, avatar, text, reply_to, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `;
            await db_1.pool.query(query, [
                messageId,
                data.userId,
                data.username,
                data.avatar,
                data.text,
                data.replyTo ? JSON.stringify(data.replyTo) : null,
            ]);
            // Рассылаем всем клиентам (вместе с id)
            io.emit("receive_message", { ...data, id: messageId });
        }
        catch (err) {
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
//# sourceMappingURL=index.js.map