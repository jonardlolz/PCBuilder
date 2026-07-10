import pg from "pg";
import "dotenv/config";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function recordPrice({ shopeeItemId, shopeeShopId, name, category, priceMin, priceMax, stock }) {
  const client = await pool.connect();
  try {
    // Upsert the item — update name/category if it already exists
    const { rows } = await client.query(
      `INSERT INTO items (shopee_item_id, shopee_shop_id, name, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (shopee_item_id, shopee_shop_id)
       DO UPDATE SET name = EXCLUDED.name, category = EXCLUDED.category
       RETURNING id`,
      [shopeeItemId, shopeeShopId, name, category ?? null]
    );
    const itemId = rows[0].id;

    // Append a price snapshot
    await client.query(
      `INSERT INTO price_snapshots (item_id, price_min, price_max, stock)
       VALUES ($1, $2, $3, $4)`,
      [itemId, priceMin, priceMax, stock ?? null]
    );

    return itemId;
  } finally {
    client.release();
  }
}

export async function close() {
  await pool.end();
}
