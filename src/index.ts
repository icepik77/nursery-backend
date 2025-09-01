import express from "express";
import cors from "cors";
import dotenv from "dotenv";

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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


