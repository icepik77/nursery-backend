"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const axios_1 = __importDefault(require("axios"));
const uuid_1 = require("uuid");
const db_1 = require("../db");
const router = express_1.default.Router();
const SHOP_ID = process.env.YOOKASSA_SHOP_ID;
const SECRET_KEY = process.env.YOOKASSA_SECRET_KEY;
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = "-5203973799";
// 👉 Создать платеж
router.post("/create", async (req, res) => {
    try {
        const { phone, email, address, items, user_id } = req.body;
        if (!items?.length) {
            return res.status(400).json({
                error: "Корзина пуста",
            });
        }
        // считаем сумму из БД
        let total = 0;
        const pricedItems = [];
        for (const item of items) {
            const result = await db_1.pool.query(`
        SELECT name, price
        FROM products
        WHERE id = $1
        `, [item.productId]);
            if (!result.rows.length) {
                return res.status(404).json({
                    error: "Товар не найден",
                });
            }
            const product = result.rows[0];
            const price = Number(product.price);
            total += price * item.quantity;
            pricedItems.push({
                productId: item.productId,
                name: product.name,
                quantity: item.quantity,
                priceAtPurchase: price,
            });
        }
        const orderId = (0, uuid_1.v4)();
        const idempotenceKey = (0, uuid_1.v4)();
        const response = await axios_1.default.post("https://api.yookassa.ru/v3/payments", {
            amount: {
                value: total.toFixed(2),
                currency: "RUB",
            },
            capture: true,
            confirmation: {
                type: "redirect",
                return_url: "https://dobriggs.ru/payment-success",
            },
            description: `Заказ ${orderId}`,
            metadata: {
                orderId,
            },
        }, {
            auth: {
                username: SHOP_ID,
                password: SECRET_KEY,
            },
            headers: {
                "Idempotence-Key": idempotenceKey,
            },
        });
        await db_1.pool.query(`
    INSERT INTO payment_sessions
    (payment_id, payload)
    VALUES ($1, $2)
    `, [
            response.data.id,
            JSON.stringify({
                phone,
                email,
                address,
                user_id,
                total,
                orderId,
                items: pricedItems,
            })
        ]);
        const paymentId = response.data.id;
        res.json({
            paymentId,
            confirmationUrl: `${response.data.confirmation.confirmation_url}`,
        });
    }
    catch (err) {
        console.error(err.response?.data || err.message);
        res.status(500).json({
            error: "Ошибка создания платежа",
        });
    }
});
router.post("/webhook", async (req, res) => {
    const event = req.body;
    if (event.event !== "payment.succeeded") {
        return res.sendStatus(200);
    }
    if (event.event === "payment.canceled") {
        await db_1.pool.query(`
      DELETE FROM payment_sessions
      WHERE payment_id=$1
      `, [event.object.id]);
        return res.sendStatus(200);
    }
    const paymentId = event.object.id;
    const session = await db_1.pool.query(`
    SELECT payload
    FROM payment_sessions
    WHERE payment_id=$1
    `, [paymentId]);
    if (!session.rows.length) {
        return res.sendStatus(404);
    }
    const payload = session.rows[0].payload;
    const orderResult = await db_1.pool.query(`
    INSERT INTO orders
    (id,user_id,total,phone,email,address,status)
    VALUES ($1,$2,$3,$4,$5,$6,'pending')
    RETURNING id
    `, [
        payload.orderId,
        payload.user_id,
        payload.total,
        payload.phone,
        payload.email,
        payload.address,
    ]);
    for (const item of payload.items) {
        await db_1.pool.query(`
      INSERT INTO order_items
      (
        order_id,
        product_id,
        quantity,
        price_at_purchase
      )
      VALUES ($1,$2,$3,$4)
      `, [
            payload.orderId,
            item.productId,
            item.quantity,
            item.priceAtPurchase,
        ]);
    }
    const itemsText = payload.items
        .map((item) => `• <b>${item.name}</b>
      ${item.quantity} × ${item.priceAtPurchase} ₽`)
        .join("\n\n");
    await sendTelegramMessage(`
      <b>Новый оплаченный заказ</b>

      🆔 ${payload.orderId}

      📞 ${payload.phone}
      ✉️ ${payload.email}

      📍 ${payload.address}

      <b>Товары:</b>

      ${itemsText}

      💰 <b>Итого:</b> ${payload.total} ₽
  `);
    await db_1.pool.query(`
    DELETE FROM payment_sessions
    WHERE payment_id=$1
    `, [paymentId]);
    res.sendStatus(200);
});
router.get("/status/:id", async (req, res) => {
    try {
        const response = await axios_1.default.get(`https://api.yookassa.ru/v3/payments/${req.params.id}`, {
            auth: {
                username: SHOP_ID,
                password: SECRET_KEY,
            },
        });
        res.json({
            status: response.data.status,
        });
    }
    catch {
        res.status(500).json({
            error: "status error",
        });
    }
});
async function sendTelegramMessage(text) {
    try {
        const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                chat_id: TELEGRAM_CHAT_ID,
                text,
                parse_mode: "HTML",
            }),
        });
        if (!res.ok) {
            throw new Error("Telegram API error");
        }
        return await res.json();
    }
    catch (err) {
        console.error("Telegram send error:", err);
    }
}
exports.default = router;
//# sourceMappingURL=payments.js.map