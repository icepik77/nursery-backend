import { Router, Request, Response } from "express";
import { pool } from "../db";

const router = Router();

/* ============================
   GET all products
============================ */
router.get("/", async (req: Request, res: Response) => {
  try {
    const result = await pool.query(`
      SELECT
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'key', pa.key,
              'value', pa.value
            )
          ) FILTER (WHERE pa.id IS NOT NULL),
          '[]'
        ) AS attributes
      FROM products p
      LEFT JOIN product_attributes pa ON pa.product_id = p.id
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch products" });
  }
});

/* ============================
   GET product by ID
============================ */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        p.*,
        COALESCE(
          json_agg(
            json_build_object(
              'key', pa.key,
              'value', pa.value
            )
          ) FILTER (WHERE pa.id IS NOT NULL),
          '[]'
        ) AS attributes
      FROM products p
      LEFT JOIN product_attributes pa ON pa.product_id = p.id
      WHERE p.id = $1
      GROUP BY p.id
      `,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch product" });
  }
});

/* ============================
   CREATE product
============================ */
router.post("/", async (req: Request, res: Response) => {
  try {
    const {
      name,
      category,
      animal,
      price,
      image,
      description,
      attributes = [],
    } = req.body;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const productResult = await client.query(
        `
        INSERT INTO products
          (name, category, animal, price, image, description)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
        `,
        [name, category, animal, price, image, description]
      );

      const product = productResult.rows[0];

      for (const attr of attributes) {
        await client.query(
          `
          INSERT INTO product_attributes (product_id, key, value)
          VALUES ($1, $2, $3)
          `,
          [product.id, attr.key, attr.value]
        );
      }

      await client.query("COMMIT");
      res.status(201).json(product);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create product" });
  }
});

/* ============================
   UPDATE product
============================ */
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      category,
      animal,
      price,
      image,
      description,
      attributes = [],
    } = req.body;

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      const result = await client.query(
        `
        UPDATE products
        SET
          name = $1,
          category = $2,
          animal = $3,
          price = $4,
          image = $5,
          description = $6,
          updated_at = now()
        WHERE id = $7
        RETURNING *
        `,
        [name, category, animal, price, image, description, id]
      );

      if (result.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(404).json({ error: "Product not found" });
      }

      // Replace attributes
      await client.query(
        `DELETE FROM product_attributes WHERE product_id = $1`,
        [id]
      );

      for (const attr of attributes) {
        await client.query(
          `
          INSERT INTO product_attributes (product_id, key, value)
          VALUES ($1, $2, $3)
          `,
          [id, attr.key, attr.value]
        );
      }

      await client.query("COMMIT");
      res.json(result.rows[0]);
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update product" });
  }
});

/* ============================
   DELETE product
============================ */
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM products WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete product" });
  }
});

export default router;
