import { Router } from "express";
import { pool } from "../db/pool.js";

const router = Router();

/**
 * GET /api/items
 * Query params:
 *   category  — filter by category (GPU, CPU, RAM, etc.)
 *   q         — search by name (partial, case-insensitive)
 *   limit     — default 50
 *   offset    — default 0
 *
 * Returns items with their latest price snapshot attached.
 */
router.get("/", async (req, res) => {
  const { category, q, limit = 50, offset = 0 } = req.query;
  const conditions = [];
  const params = [];

  if (category) {
    params.push(category);
    conditions.push(`i.category = $${params.length}`);
  }
  if (q) {
    params.push(`%${q}%`);
    conditions.push(`i.name ILIKE $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  params.push(Number(limit), Number(offset));
  const limitClause = `LIMIT $${params.length - 1} OFFSET $${params.length}`;

  const sql = `
    SELECT
      i.id,
      i.shopee_item_id,
      i.shopee_shop_id,
      i.name,
      i.category,
      i.image_url,
      ps.price_min,
      ps.price_max,
      ps.stock,
      ps.scraped_at AS last_updated
    FROM items i
    LEFT JOIN LATERAL (
      SELECT price_min, price_max, stock, scraped_at
      FROM price_snapshots
      WHERE item_id = i.id
      ORDER BY scraped_at DESC
      LIMIT 1
    ) ps ON true
    ${where}
    ORDER BY i.name
    ${limitClause}
  `;

  try {
    const { rows } = await pool.query(sql, params);
    res.json({ items: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * GET /api/items/:id/history
 * Returns up to 90 price snapshots for a single item (for trend charts).
 */
router.get("/:id/history", async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT price_min, price_max, stock, scraped_at
       FROM price_snapshots
       WHERE item_id = $1
       ORDER BY scraped_at DESC
       LIMIT 90`,
      [id]
    );
    res.json({ history: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

/**
 * GET /api/items/categories
 * Returns a distinct list of categories currently in the DB.
 */
router.get("/categories", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT DISTINCT category FROM items WHERE category IS NOT NULL ORDER BY category`
    );
    res.json({ categories: rows.map((r) => r.category) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

export default router;
