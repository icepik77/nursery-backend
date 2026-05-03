import express, { Request, Response } from "express";
import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { auth } from "../middleware/authMiddleware";

const router = express.Router();

const SHOP_ID = process.env.YOOKASSA_SHOP_ID!;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY!;

// 👉 Создать платеж
router.post("/create", auth, async (req: Request, res: Response) => {
  try {
    const { amount, orderId } = req.body;

    const idempotenceKey = uuidv4();

    const response = await axios.post(
      "https://api.yookassa.ru/v3/payments",
      {
        amount: {
          value: amount,
          currency: "RUB",
        },
        capture: true,
        confirmation: {
          type: "redirect",
          return_url: "http://localhost:3000/payment-success",
        },
        description: `Заказ №${orderId}`,
        metadata: {
          orderId,
        },
      },
      {
        auth: {
          username: SHOP_ID,
          password: SECRET_KEY,
        },
        headers: {
          "Idempotence-Key": idempotenceKey,
        },
      }
    );

    const payment = response.data;

    res.json({
      paymentId: payment.id,
      confirmationUrl: payment.confirmation.confirmation_url,
    });
  } catch (err: any) {
    console.error("Ошибка создания платежа:", err.response?.data || err.message);
    res.status(500).json({ error: "Ошибка создания платежа" });
  }
});

export default router;