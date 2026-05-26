"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = "-5203973799";
const router = (0, express_1.Router)();
async function sendTelegramMessage(text) {
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
    const data = await res.json();
}
router.post("/", async (req, res) => {
    const client = await db_1.pool.connect();
    try {
        const { user_id, phone, email, address, items } = req.body;
        if (!phone || !email || !address || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: "Invalid order data" });
        }
        await client.query("BEGIN");
        // 1️⃣ Получаем актуальные цены и названия товаров
        const productIds = items.map((i) => i.productId);
        const productsResult = await client.query(`
      SELECT id, price, name
      FROM products
      WHERE id = ANY($1)
      `, [productIds]);
        if (productsResult.rowCount !== productIds.length) {
            throw new Error("One or more products not found");
        }
        const productMap = new Map(productsResult.rows.map((p) => [p.id, p]));
        // 2️⃣ Считаем total
        const total = items.reduce((sum, item) => {
            const product = productMap.get(item.productId);
            return sum + product.price * item.quantity;
        }, 0);
        // 3️⃣ Создаём заказ
        const orderResult = await client.query(`
      INSERT INTO orders (user_id, phone, email, address, total, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id, created_at
      `, [user_id ?? null, phone, email, address, total]);
        const orderId = orderResult.rows[0].id;
        // 4️⃣ Добавляем позиции заказа
        for (const item of items) {
            const product = productMap.get(item.productId);
            await client.query(`
        INSERT INTO order_items
          (order_id, product_id, quantity, price_at_purchase)
        VALUES ($1, $2, $3, $4)
        `, [
                orderId,
                item.productId,
                item.quantity,
                product.price,
            ]);
        }
        await client.query("COMMIT");
        // 5️⃣ Формируем список товаров для Telegram
        const itemsText = items
            .map((item) => {
            const product = productMap.get(item.productId);
            return `• ${product.name} × ${item.quantity}`;
        })
            .join("\n");
        const message = `
      🛒 <b>Новый заказ #${orderId}</b>

      📞 <b>Телефон:</b> ${phone}
      📧 <b>Email:</b> ${email}

      📍 <b>Адрес:</b>
      ${address}

      📦 <b>Товары:</b>
      ${itemsText}

      💰 <b>Итого:</b> ${total}
    `;
        await sendTelegramMessage(message);
        return res.status(201).json({
            id: orderId,
            total,
            createdAt: orderResult.rows[0].created_at,
        });
    }
    catch (err) {
        await client.query("ROLLBACK");
        console.error(err);
        return res.status(500).json({ error: "Failed to create order" });
    }
    finally {
        client.release();
    }
});
router.get("/", async (req, res) => {
    try {
        const userId = req.query.userId; // берем из запроса
        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }
        const result = await db_1.pool.query(`
      SELECT
        o.id,
        o.total,
        o.phone,
        o.email,
        o.address,
        o.status,
        o.created_at,
        json_agg(
          json_build_object(
            'productId', oi.product_id,
            'quantity', oi.quantity,
            'priceAtPurchase', oi.price_at_purchase,
            'product', json_build_object(
              'name', p.name,
              'image', p.image
            )
          )
        ) AS items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      `, [userId]);
        return res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch orders" });
    }
});
// router.get("/", async (req, res) => {
//   try {
//     const userId = req.user!.id; // ✅ no error
//     console.log("userId", userId);
//     const result = await pool.query(
//       `
//       SELECT
//         o.id,
//         o.total,
//         o.status,
//         o.created_at,
//         json_agg(
//           json_build_object(
//             'productId', oi.product_id,
//             'quantity', oi.quantity,
//             'priceAtPurchase', oi.price_at_purchase,
//             'product', json_build_object(
//               'name', p.name,
//               'image', p.image
//             )
//           )
//         ) AS items
//       FROM orders o
//       JOIN order_items oi ON oi.order_id = o.id
//       JOIN products p ON p.id = oi.product_id
//       WHERE o.user_id = $1
//       GROUP BY o.id
//       ORDER BY o.created_at DESC
//       `,
//       [userId]
//     );
//     return res.json(result.rows);
//   } catch (err) {
//     console.error(err);
//     return res.status(500).json({ error: "Failed to fetch orders" });
//   }
// });
router.get("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db_1.pool.query(`
      SELECT
        o.id,
        o.phone,
        o.email,
        o.address,
        o.total,
        o.status,
        o.created_at,
        json_agg(
          json_build_object(
            'productId', oi.product_id,
            'quantity', oi.quantity,
            'priceAtPurchase', oi.price_at_purchase,
            'product', json_build_object(
              'name', p.name,
              'image', p.image
            )
          )
        ) AS items
      FROM orders o
      JOIN order_items oi ON oi.order_id = o.id
      JOIN products p ON p.id = oi.product_id
      WHERE o.id = $1
      GROUP BY o.id
      `, [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Order not found" });
        }
        return res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to fetch order" });
    }
});
router.patch("/:id/status", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const allowed = ["pending", "processing", "delivered", "cancelled"];
        if (!allowed.includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }
        const result = await db_1.pool.query(`
      UPDATE orders
      SET status = $1
      WHERE id = $2
      RETURNING id, status
      `, [status, id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Order not found" });
        }
        return res.json(result.rows[0]);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Failed to update status" });
    }
});
exports.default = router;
//# sourceMappingURL=orders.js.map