import express, { Router, Request, Response } from "express";
import { pool } from "../db";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import jwt, { JwtPayload } from "jsonwebtoken";
import multer from "multer";
import path from "path";


const router = Router();

router.post("/", async (req, res) => {
  const client = await pool.connect();

  try {
    const { userId, phone, email, address, items } = req.body;

    if (!phone || !email || !address || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: "Invalid order data" });
    }

    await client.query("BEGIN");

    // 1️⃣ Получаем актуальные цены товаров
    const productIds = items.map((i) => i.productId);

    const productsResult = await client.query(
      `
      SELECT id, price
      FROM products
      WHERE id = ANY($1)
      `,
      [productIds]
    );

    if (productsResult.rowCount !== productIds.length) {
      throw new Error("One or more products not found");
    }

    const priceMap = new Map(
      productsResult.rows.map((p) => [p.id, p.price])
    );

    // 2️⃣ Считаем total
    const total = items.reduce((sum, item) => {
      const price = priceMap.get(item.productId);
      return sum + price * item.quantity;
    }, 0);

    // 3️⃣ Создаём заказ
    const orderResult = await client.query(
      `
      INSERT INTO orders (user_id, phone, email, address, total, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id, created_at
      `,
      [userId ?? null, phone, email, address, total]
    );

    const orderId = orderResult.rows[0].id;

    // 4️⃣ Добавляем позиции заказа
    for (const item of items) {
      await client.query(
        `
        INSERT INTO order_items
          (order_id, product_id, quantity, price_at_purchase)
        VALUES ($1, $2, $3, $4)
        `,
        [
          orderId,
          item.productId,
          item.quantity,
          priceMap.get(item.productId),
        ]
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      id: orderId,
      total,
      createdAt: orderResult.rows[0].created_at,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return res.status(500).json({ error: "Failed to create order" });
  } finally {
    client.release();
  }
});

router.get("/", async (req, res) => {
  try {
    const userId = req.user?.id; // если есть auth middleware

    const result = await pool.query(
      `
      SELECT
        o.id,
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
      WHERE o.user_id = $1
      GROUP BY o.id
      ORDER BY o.created_at DESC
      `,
      [userId]
    );

    return res.json(result.rows);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch orders" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
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
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
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

    const result = await pool.query(
      `
      UPDATE orders
      SET status = $1
      WHERE id = $2
      RETURNING id, status
      `,
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Order not found" });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to update status" });
  }
});

export default router;